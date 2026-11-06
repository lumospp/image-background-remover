import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGoogleIdToken, createUserSession, getAuthenticatedUser, cookieHeader } from '../lib/server/auth.js';
import { verifyStripeWebhookSignature, stripeTestReady, stripeApiParams } from '../lib/server/stripe.js';
import { requireSameOriginPost } from '../lib/server/http.js';
import { onRequestPost as login } from '../functions/api/auth/login.js';
import { onRequestPost as checkout } from '../functions/api/billing/checkout.js';
import { onRequestPost as webhook } from '../functions/api/billing/webhook.js';

const KEY='whsec_unit_test_signing_key';
const CLIENT='test-client.apps.googleusercontent.com';
const origin='https://example.test';

function mockDb() {
  const orders=new Map(), ledger=new Map(), sessions=new Map(), users=new Map();
  const prepare=(sql)=>({bind(...args){return{
    async run(){
      if(sql.startsWith('INSERT INTO auth_users'))users.set(args[0],{id:args[0],email:args[1],name:args[2]});
      else if(sql.startsWith('INSERT INTO auth_sessions'))sessions.set(args[0],{userId:args[1],expires:args[3]});
      else if(sql.startsWith('INSERT INTO sandbox_checkout_orders')) {orders.set(args[0],{user_id:args[1],credits:args[3],status:args[4]});}
      else if(sql.startsWith('INSERT OR IGNORE INTO sandbox_credit_ledger')){if(![...ledger.values()].some(x=>x.ref===args[3]))ledger.set(args[0],{userId:args[1],delta:args[2],ref:args[3]});}
      else if(sql.startsWith('UPDATE sandbox_checkout_orders')){const o=orders.get(args[1]);if(o)o.status='paid';}
      else if(sql.startsWith('INSERT OR IGNORE INTO sandbox_webhook_events')){}
      else throw Error('Unsupported SQL: '+sql);
      return {success:true};
    },
    async first(){
      if(sql.startsWith('SELECT u.id, u.email')){const s=sessions.get(args[0]);return s&&s.expires>args[1]?users.get(s.userId):null;}
      if(sql.startsWith('SELECT user_id, credits, status'))return orders.get(args[0])||null;
      throw Error('Unsupported SQL: '+sql);
    }
  }}})
  return {orders,ledger,prepare};
}

async function withFetch(replacement,fn){const old=globalThis.fetch;globalThis.fetch=replacement;try{return await fn();}finally{globalThis.fetch=old;}}

async function signEvent(event){
  const raw=JSON.stringify(event),stamp=Math.floor(Date.now()/1000);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+raw))).toString('hex');
  return new Request(origin+'/api/billing/webhook',{method:'POST',headers:{'Stripe-Signature':'t='+stamp+',v1='+signed},body:raw});
}

async function googleFixture(overrides={}){
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:Uint8Array.of(1,0,1),hash:'SHA-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);
  Object.assign(jwk,{kid:'test-key',use:'sig',alg:'RS256'});
  const now=Math.floor(Date.now()/1000);
  const claims={iss:'https://accounts.google.com',aud:CLIENT,sub:'123456789012345678901',iat:now,exp:now+300,email_verified:true,email:'test@example.com',name:'Test User',...overrides};
  const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const signed=b({alg:'RS256',kid:'test-key'})+'.'+b(claims);
  const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(signed))).toString('base64url');
  return {token:signed+'.'+signature,jwk};
}

test('rejects cross-origin login and checkout',async()=>{
  const req=new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:'https://attacker.test'},body:'{}'});
  assert.equal(requireSameOriginPost(req),false);
  assert.equal((await login({request:req,env:{DB:mockDb(),GOOGLE_CLIENT_ID:CLIENT}})).status,403);
});

test('verifies Google RS256, audience and expiry and rejects forged claims',async()=>{
  const {token,jwk}=await googleFixture();
  await withFetch(async()=>Response.json({keys:[jwk]}),async()=>{
    assert.equal((await verifyGoogleIdToken(token,CLIENT)).email,'test@example.com');
    await assert.rejects(()=>verifyGoogleIdToken(token,'wrong-audience'));
    const parts=token.split('.');
    const tampered=Buffer.from(JSON.stringify({sub:'88888888888888',exp:9999999999,aud:CLIENT})).toString('base64url');
    await assert.rejects(()=>verifyGoogleIdToken(parts[0]+'.'+tampered+'.'+parts[2],CLIENT));
  });
  const expired=await googleFixture({exp:Math.floor(Date.now()/1000)-1});
  await withFetch(async()=>Response.json({keys:[expired.jwk]}),()=>assert.rejects(()=>verifyGoogleIdToken(expired.token,CLIENT)));
});

test('sessions are random and inaccessible to browser JavaScript',async()=>{
  const db=mockDb();const token=await createUserSession(db,{id:'123456789012345678901',email:'test@example.com',name:'Test'});
  assert.match(token,/^[a-f0-9]{64}$/);
  assert.match(cookieHeader(token),/HttpOnly; SameSite=Lax/);
  const req=new Request(origin+'/api/me',{headers:{Cookie:'__Host-lhy_session='+token}});
  assert.equal((await getAuthenticatedUser(req,{DB:db}))?.name,'Test');
});

test('test Checkout rejects live-mode keys and browser-defined prices',async()=>{
  const env={DB:mockDb(),STRIPE_TEST_SECRET_KEY:'sk_live_wrong',STRIPE_TEST_PRICE_ID:'price_test',STRIPE_TEST_WEBHOOK_SECRET:KEY};
  assert.equal(stripeTestReady(env),false);
  const req=new Request(origin+'/api/billing/checkout',{method:'POST',headers:{Origin:origin}});
  assert.equal((await checkout({request:req,env})).status,503);
  const params=stripeApiParams('price_server',{id:'123456789012345678901',email:'test@example.com'},origin+'/');
  assert.equal(params.get('line_items[0][price]'),'price_server');
  assert.equal(params.get('mode'),'payment');
});

test('Stripe signed webhook: tamper and stale timestamps are rejected',async()=>{
  const raw='{"test":true}',stamp=Math.floor(Date.now()/1000);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+raw))).toString('hex');
  const header='t='+stamp+',v1='+sig;
  assert.equal(await verifyStripeWebhookSignature(raw,header,KEY),true);
  assert.equal(await verifyStripeWebhookSignature(raw+' ',header,KEY),false);
  assert.equal(await verifyStripeWebhookSignature(raw,header,KEY,stamp+301),false);
});

test('Stripe replay grants the same paid order only once',async()=>{
  const db=mockDb(), id='cs_test_case';
  db.orders.set(id,{user_id:'123456789012345678901',credits:5,status:'pending'});
  const e={id:'evt_test_case',livemode:false,type:'checkout.session.completed',data:{object:{id,livemode:false,payment_status:'paid',mode:'payment',client_reference_id:'123456789012345678901'}}};
  const env={DB:db,STRIPE_TEST_WEBHOOK_SECRET:KEY};
  assert.equal((await webhook({request:await signEvent(e),env})).status,200);
  assert.equal((await webhook({request:await signEvent(e),env})).status,200);
  assert.equal(db.ledger.size,1);
  assert.equal([...db.ledger.values()][0].delta,5);
});

test('unpaid, nonexistent or live Stripe orders never receive credits',async()=>{
  const db=mockDb(),id='cs_test_nopay';db.orders.set(id,{user_id:'123456789012345678901',credits:5,status:'pending'});
  const e={id:'evt_unpaid',livemode:false,type:'checkout.session.completed',data:{object:{id,livemode:false,payment_status:'unpaid',mode:'payment',client_reference_id:'123456789012345678901'}}};
  const env={DB:db,STRIPE_TEST_WEBHOOK_SECRET:KEY};
  assert.equal((await webhook({request:await signEvent(e),env})).status,400);
  e.data.object.payment_status='paid';e.data.object.id='cs_test_missing';
  assert.equal((await webhook({request:await signEvent(e),env})).status,503);
  e.livemode=true;
  assert.equal((await webhook({request:await signEvent(e),env})).status,400);
  assert.equal(db.ledger.size,0);
});

test('authenticated checkout selects server price and records a Stripe TEST order',async()=>{
  const db=mockDb();
  const token=await createUserSession(db,{id:'123456789012345678901',email:'test@example.com',name:'Test User'});
  const request=new Request(origin+'/api/billing/checkout',{method:'POST',headers:{Origin:origin,Cookie:'__Host-lhy_session='+token}});
  const env={DB:db,STRIPE_TEST_SECRET_KEY:'sk_test_fake',STRIPE_TEST_PRICE_ID:'price_test_example',STRIPE_TEST_WEBHOOK_SECRET:KEY};
  await withFetch(async(url,options)=>{
    assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(options.body.get('line_items[0][price]'),'price_test_example');
    assert.equal(options.body.get('metadata[practice_only]'),'true');
    return Response.json({id:'cs_test_new',url:'https://checkout.stripe.com/c/pay/cs_test_new'});
  },async()=>{
    const r=await checkout({request,env});
    assert.equal(r.status,200);
    assert.equal((await r.json()).sandboxOnly,true);
    assert.equal(db.orders.get('cs_test_new').credits,5);
    assert.equal(db.orders.get('cs_test_new').status,'pending');
  });
});
