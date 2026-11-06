import { configResponse } from '../../../lib/server/auth.js';

export async function onRequestGet({ env }) {
  return configResponse(env);
}
