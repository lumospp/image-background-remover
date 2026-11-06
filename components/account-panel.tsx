import { useCallback, useEffect, useRef, useState } from 'react'
import { CreditCard, LogOut, RefreshCw, UserRound } from 'lucide-react'

type Account = { id: string; name: string; email: string }
type AuthConfig = { googleClientId: string | null; stripeTestEnabled: boolean; demoCreditsPerPurchase: number }
type Me = { authenticated: boolean; user?: Account; sandboxCredits?: number; sandboxOnly?: boolean; error?: string }

type GoogleIdentity = {
  accounts: { id: {
    initialize: (options: { client_id: string; callback: (value: { credential: string }) => void }) => void
    renderButton: (parent: HTMLElement, options: { theme: string; size: string; shape: string; text: string }) => void
    disableAutoSelect: () => void
  } }
}

function googleApi(): GoogleIdentity | undefined {
  return (window as Window & { google?: GoogleIdentity }).google
}

export default function AccountPanel() {
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [returned, setReturned] = useState(false)
  const googleRef = useRef<HTMLDivElement>(null)

  const loadAccount = useCallback(async () => {
    try {
      const response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' })
      const value = await response.json() as Me
      if (!response.ok) throw new Error(value.error || 'Account service unavailable')
      setMe(value)
    } catch {
      setMe({ authenticated: false })
    }
  }, [])

  useEffect(() => {
    let active = true
    void Promise.all([
      fetch('/api/auth/config', { cache: 'no-store' }).then(r => r.json() as Promise<AuthConfig>),
      fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json() as Promise<Me>),
    ]).then(([cfg, account]) => {
      if (!active) return
      setConfig(cfg)
      setMe(account)
      setReturned(new URLSearchParams(window.location.search).get('checkout') === 'returned')
    }).catch(() => { if (active) setError('Account service unavailable') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!config?.googleClientId || me?.authenticated) return
    let active = true
    const initialize = () => {
      if (!active || !googleRef.current || !googleApi()) return
      const api = googleApi()!
      googleRef.current.replaceChildren()
      api.accounts.id.initialize({
        client_id: config.googleClientId!,
        callback: async ({ credential }) => {
          setBusy(true)
          setError('')
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential }),
            })
            const payload = await response.json() as { error?: string }
            if (!response.ok) throw new Error(payload.error || 'Google login failed')
            await loadAccount()
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Google login failed')
          } finally { setBusy(false) }
        },
      })
      api.accounts.id.renderButton(googleRef.current, {
        theme: 'outline', size: 'medium', shape: 'pill', text: 'signin_with',
      })
    }

    const src = 'https://accounts.google.com/gsi/client'
    let script = document.querySelector<HTMLScriptElement>('script[data-lhy-google-login]')
    if (script) {
      if (googleApi()) initialize()
      else script.addEventListener('load', initialize)
    } else {
      script = document.createElement('script')
      script.src = src
      script.async = true
      script.defer = true
      script.dataset.lhyGoogleLogin = 'true'
      script.addEventListener('load', initialize)
      script.addEventListener('error', () => { if (active) setError('Google sign-in could not load') })
      document.head.appendChild(script)
    }
    return () => {
      active = false
      script?.removeEventListener('load', initialize)
    }
  }, [config?.googleClientId, me?.authenticated, loadAccount])

  async function logout() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      if (!r.ok) throw new Error('Could not sign out')
      googleApi()?.accounts.id.disableAutoSelect()
      setMe({ authenticated: false })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign-out failed')
    } finally { setBusy(false) }
  }

  async function checkout() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/billing/checkout', { method: 'POST', credentials: 'same-origin' })
      const data = await r.json() as { url?: string; error?: string }
      if (!r.ok || !data.url) throw new Error(data.error || 'Test checkout unavailable')
      window.location.assign(data.url)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not open Stripe')
      setBusy(false)
    }
  }

  if (!config?.googleClientId) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Account and test payments">
      {me?.authenticated && me.user ? (
        <>
          <div className="flex items-center gap-1.5 rounded-full border border-[#cfdfd2] bg-[#eef5ef] px-3 py-2 font-semibold text-[#245c41]" title={me.user.email}>
            <UserRound size={15} aria-hidden="true" />
            <span className="max-w-[90px] truncate">{me.user.name}</span>
            <span className="font-normal text-[#557866]">· {me.sandboxCredits ?? 0} demo credits</span>
          </div>
          {config.stripeTestEnabled && (
            <button type="button" onClick={() => void checkout()} disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-[#aacdb6] bg-white px-3 py-2 font-semibold text-[#285a42] hover:bg-[#eaf3ec] disabled:opacity-50">
              <CreditCard size={14} aria-hidden="true" /> Stripe test
            </button>
          )}
          <button type="button" onClick={() => void logout()} disabled={busy}
            className="rounded-lg p-2 text-[#4a745d] hover:bg-[#e7f0e8] disabled:opacity-50" aria-label="Sign out">
            <LogOut size={16} aria-hidden="true" />
          </button>
          {returned && (
            <button type="button" onClick={() => void loadAccount()} disabled={busy}
              className="inline-flex items-center gap-1 text-[#28694d] underline underline-offset-2" title="Webhook processing may take a moment">
              <RefreshCw size={13} aria-hidden="true" /> Refresh test balance
            </button>
          )}
        </>
      ) : (
        <div ref={googleRef} aria-label="Google sign-in button" className="min-h-[37px]" />
      )}
      {error && <p role="alert" className="w-full max-w-xs text-xs text-[#a64f38]">{error}</p>}
      {busy && <span role="status" className="text-[#597a64]">Working…</span>}
    </div>
  )
}
