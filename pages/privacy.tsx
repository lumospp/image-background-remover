import Head from 'next/head'
import Link from 'next/link'
import { ArrowLeft, LockKeyhole } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy | LHY BG Remover</title>
        <meta name="description" content="How LHY BG Remover handles uploaded photos, image processing and anonymous usage limits." />
        <link rel="canonical" href="https://lyhimageremovebg.shop/privacy" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </Head>
      <main className="min-h-screen bg-[#f8faf6] px-5 py-12 text-[#193b30] sm:px-8">
        <article className="mx-auto max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#3a7656] hover:underline">
            <ArrowLeft size={17} aria-hidden="true" /> Back to the tool
          </Link>
          <div className="mt-12 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f1e7] text-[#1f7253]">
            <LockKeyhole aria-hidden="true" size={23} />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-[#5a8d6e]">Transparency matters</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.045em]">Privacy & image handling</h1>
          <p className="mt-5 text-base leading-8 text-[#62796a]">Here is what happens when you use the image background remover. This describes the current service, not a promise about what third-party companies may retain.</p>
          <div className="mt-12 space-y-10 text-sm leading-8 text-[#5c7565]">
            <section>
              <h2 className="text-xl font-semibold text-[#193b30]">Your uploaded images</h2>
              <p className="mt-3">Your selected image is uploaded to a Cloudflare Pages Function and forwarded to <a className="font-semibold text-[#237251] underline underline-offset-4" href="https://www.remove.bg/" target="_blank" rel="noreferrer">remove.bg</a> to remove its background. The generated image is returned to your browser, where you can preview and download it. We do not intentionally save your image to a permanent database or media storage on our site.</p>
              <p className="mt-3">Because remove.bg is a separate service, its own <a className="font-semibold text-[#237251] underline underline-offset-4" href="https://www.remove.bg/privacy" target="_blank" rel="noreferrer">privacy policy</a> and terms govern how it handles submitted images. Please do not upload sensitive or confidential photographs.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[#193b30]">Usage limits</h2>
              <p className="mt-3">To prevent automated abuse and keep free use available, our server stores daily request counters against a pseudonymous hash derived from your IP address, and an aggregate monthly request count. The database does not store the raw IP address, your name, email address or image. The hash is not an anonymous identifier and could potentially be associated with an IP address under some circumstances.</p>
              <p className="mt-3">Cloudflare may independently process technical request logs and security information as part of operating the site.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[#193b30]">Google accounts, test payments and cookies</h2>
              <p className="mt-3">The background remover remains usable without an account. If you choose Google sign-in, we store your verified Google account ID, name and email in Cloudflare D1 and use a Secure, HttpOnly session cookie. The optional Stripe integration operates in Test Mode only, recording test checkout identifiers and demo-credit balances. It does not accept live payments. The demo credits do not enable extra image processing. Essential provider-level security or analytics processing may also apply.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[#193b30]">Retention and contact</h2>
              <p className="mt-3">The quota counters are grouped by UTC date and month. They may be retained for operational purposes; automatic deletion is not yet configured. If you would like to report an issue or request a change, you can <a className="font-semibold text-[#237251] underline underline-offset-4" href="https://github.com/lumospp/image-background-remover/issues" target="_blank" rel="noreferrer">open a feedback issue on GitHub</a> without including private images or personal details.</p>
            </section>
          </div>
          <p className="mt-14 border-t border-[#dbe5dd] pt-6 text-xs text-[#819184]">Last updated: November 4, 2026 · <Link href="/" className="underline underline-offset-4">Back to LHY/Cutout</Link></p>
        </article>
      </main>
    </>
  )
}
