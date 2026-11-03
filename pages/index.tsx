import { useCallback, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import {
  ArrowRight, ArrowUpRight, CheckCircle2, Image as ImageIcon,
  Layers3, LockKeyhole, MousePointerClick, RefreshCw, Sparkles,
  UploadCloud, XCircle,
} from 'lucide-react'

const ResultView = dynamic(
  () => import('@/components/result-view').then(module => module.ResultView),
  { ssr: false, loading: () => <p className="p-8 text-center text-sm text-stone-500">Preparing your image…</p> }
)

type Stage = 'idle' | 'processing' | 'success' | 'error'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const steps = [
  { number: '01', title: 'Add your photo', text: 'Choose a JPG, PNG or WebP from your device, or drop it onto the upload area.' },
  { number: '02', title: 'Remove the backdrop', text: 'Your image is securely sent to our processing provider to create a cutout.' },
  { number: '03', title: 'Make it yours', text: 'Check the result, choose a background and save a PNG for your next project.' },
]

const questions = [
  {
    q: 'Is the background remover free?',
    a: 'Yes, a limited number of image processing attempts are available at no charge. The current limit is up to 3 attempts per IP address per UTC day, with a shared monthly capacity. Availability may change as the service grows.',
  },
  {
    q: 'What image formats can I use?',
    a: 'JPG, PNG and WebP files up to 10 MB. The downloaded image is a PNG. Very large or unusual images may be rejected by the processing provider.',
  },
  {
    q: 'Are my images private?',
    a: 'We do not deliberately store your original or processed images on this site. Your uploaded image is sent to the third-party remove.bg service to perform background removal. Avoid uploading sensitive images and review our Privacy page before using the tool.',
  },
  {
    q: 'Can I use a cutout for online product listings?',
    a: 'You can create a transparent PNG and choose a white or custom background for a listing. Check the marketplace image requirements and the processing provider’s terms before commercial use.',
  },
  {
    q: 'What if a result does not look right?',
    a: 'AI cutouts can struggle with fine hair, transparent materials and low-contrast edges. Use a higher-quality photo with a clear subject. A new processing attempt uses part of the free allowance.',
  },
]

function VaseIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 260 270" className="h-full max-h-64 w-full drop-shadow-xl">
      <ellipse cx="130" cy="251" rx="73" ry="10" fill="#273e34" opacity=".12" />
      <path d="M129 101c-13-42-14-75-4-91" stroke="#42644d" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M119 99c-28-42-46-54-59-58" stroke="#42644d" strokeWidth="3.8" fill="none" strokeLinecap="round" />
      <path d="M140 99c28-41 48-51 64-56" stroke="#42644d" strokeWidth="3.8" fill="none" strokeLinecap="round" />
      <path d="M123 59C91 54 85 32 89 19c26 4 43 18 34 40Z" fill="#75977c" />
      <path d="M127 64c-2-28 13-42 31-48 5 24-10 43-31 48Z" fill="#567a65" />
      <path d="M91 70C69 83 47 69 39 53c26-8 48-1 52 17Z" fill="#92b299" />
      <path d="M159 70c19-20 40-20 57-12-13 22-32 31-57 12Z" fill="#739c80" />
      <path d="M119 110c-21-22-40-20-52-12 15 19 31 25 52 12Z" fill="#86a98c" />
      <path d="M139 112c20-19 39-16 50-7-12 18-29 24-50 7Z" fill="#6c9376" />
      <path d="M84 116h92l-12 108c-2 19-17 30-34 30s-32-11-34-30L84 116Z" fill="#e9c7a8" stroke="#c6a281" strokeWidth="2.5"/>
      <path d="M89 134h82" stroke="#d3ae8d" strokeWidth="2" opacity=".75" />
      <path d="M108 149c-6 33-8 61 2 79" stroke="#fff1df" strokeWidth="11" strokeLinecap="round" fill="none" opacity=".7" />
      <ellipse cx="130" cy="116" rx="46" ry="9" fill="#c49a78" />
      <ellipse cx="130" cy="114" rx="40" ry="5" fill="#775c4a" />
    </svg>
  )
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [originalUrl, setOriginalUrl] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<{ original?: string; result?: string }>({})
  const requestRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestRef.current?.abort()
      if (urlsRef.current.original) URL.revokeObjectURL(urlsRef.current.original)
      if (urlsRef.current.result) URL.revokeObjectURL(urlsRef.current.result)
    }
  }, [])

  const clearImages = useCallback(() => {
    requestRef.current?.abort()
    requestRef.current = null
    operationRef.current += 1
    if (urlsRef.current.original) URL.revokeObjectURL(urlsRef.current.original)
    if (urlsRef.current.result) URL.revokeObjectURL(urlsRef.current.result)
    urlsRef.current = {}
    setOriginalUrl('')
    setResultUrl('')
    setFileName('')
  }, [])

  const reset = useCallback(() => {
    clearImages()
    setErrorMessage('')
    setStage('idle')
    setIsDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [clearImages])

  const processImage = useCallback(async (file?: File) => {
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_BYTES) {
      setErrorMessage(file.size > MAX_BYTES
        ? 'That file is over 10 MB. Please choose a smaller image.'
        : 'Please choose a valid JPG, PNG or WebP image.')
      setStage('error')
      return
    }

    clearImages()
    const operation = operationRef.current
    const preview = URL.createObjectURL(file)
    urlsRef.current.original = preview
    setOriginalUrl(preview)
    setFileName(file.name)
    setErrorMessage('')
    setStage('processing')

    const controller = new AbortController()
    requestRef.current = controller
    const timeout = setTimeout(() => controller.abort(), 32000)

    try {
      const body = new FormData()
      body.append('image', file)
      const response = await fetch('/api/removebg', { method: 'POST', body, signal: controller.signal })

      if (!response.ok) {
        let message = 'We could not process this image. Please try again later.'
        try {
          const data = await response.json()
          if (typeof data.error === 'string') message = data.error
        } catch { /* A non-JSON upstream response is not displayed verbatim. */ }
        throw new Error(message)
      }
      const blob = await response.blob()
      if (!blob.size || !blob.type.startsWith('image/png')) {
        throw new Error('The image service returned an invalid result. Please try again.')
      }
      if (!mountedRef.current || operation !== operationRef.current) return
      const url = URL.createObjectURL(blob)
      urlsRef.current.result = url
      setResultUrl(url)
      setStage('success')
    } catch (error) {
      if (!mountedRef.current || operation !== operationRef.current) return
      const message = controller.signal.aborted
        ? 'Processing took too long. Please try again later.'
        : error instanceof Error ? error.message : 'An unexpected error occurred.'
      setErrorMessage(message)
      setStage('error')
    } finally {
      clearTimeout(timeout)
      if (requestRef.current === controller) requestRef.current = null
    }
  }, [clearImages])

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      const item = Array.from(event.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
      if (item) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          void processImage(file)
        }
      }
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  }, [processImage])

  const upload = () => fileInputRef.current?.click()
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void processImage(file)
  }

  return (
    <>
      <Head>
        <title>Free AI Background Remover for Photos | LHY BG Remover</title>
        <meta name="description" content="Remove photo backgrounds online and download a transparent PNG. Great for product photos, profile pictures and creative projects. No sign-up, limited free use." />
        <link rel="canonical" href="https://lyhimageremovebg.shop/" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lyhimageremovebg.shop/" />
        <meta property="og:title" content="LHY BG Remover · Make your subject stand out" />
        <meta property="og:description" content="Turn photos into clean transparent PNGs. No sign-up required, with limited free processing." />
        <meta name="twitter:card" content="summary" />
        <meta name="theme-color" content="#f8faf6" />
      </Head>

      <div className="min-h-screen bg-[#f8faf6] text-[#193b30] selection:bg-[#c2edcf]">
        <header className="relative z-20 border-b border-[#dce7df] bg-[#f8faf6]/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <a href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176f51]" aria-label="LHY BG Remover home">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#194b3a] text-white shadow-[0_5px_12px_rgba(25,75,58,.12)]">
                <Layers3 aria-hidden="true" size={23} strokeWidth={1.9} />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-lg font-bold tracking-[-.04em]">LHY<span className="font-medium text-[#598271]">/</span>Cutout</span>
                <span className="text-[10px] font-semibold uppercase tracking-[.19em] text-[#6c8174]">Background remover</span>
              </span>
            </a>
            <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-[#566f60] md:flex">
              <a href="#how-it-works" className="transition hover:text-[#194b3a]">How it works</a>
              <a href="#use-cases" className="transition hover:text-[#194b3a]">Use cases</a>
              <a href="#faq" className="transition hover:text-[#194b3a]">FAQ</a>
            </nav>
            <a href="#upload" className="inline-flex items-center gap-2 rounded-full bg-[#194b3a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#28674e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176f51]">
              Try it free <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden border-b border-[#e1e9e2]">
            <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 h-[35rem] w-[35rem] rounded-full bg-[#e9f4e7] blur-[85px]" />
            <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 md:pb-24 md:pt-24 lg:grid-cols-[.92fr_1.08fr] lg:gap-16">
              <div className="max-w-xl">
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cedfd1] bg-white/70 px-3.5 py-2 text-xs font-semibold tracking-wide text-[#476653]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#238961]" />
                  A simpler way to make clean cutouts
                </div>
                <h1 className="text-[clamp(3rem,5.7vw,5rem)] font-semibold leading-[1.06] tracking-[-.065em] text-[#163b2c]">
                  Keep the image.<br />
                  <span className="font-normal italic text-[#51846b]">Lose the</span><br />
                  background.
                </h1>
                <p className="mt-7 max-w-md text-[17px] leading-8 text-[#63776a]">
                  Turn product photos, portraits and everyday images into transparent PNGs. No account, no complicated editor — just your photo, ready for what&apos;s next.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-[#4d6b58]">
                  <span className="inline-flex items-center gap-2"><CheckCircle2 size={18} className="text-[#2b9368]" aria-hidden="true" /> No sign-up</span>
                  <span className="inline-flex items-center gap-2"><CheckCircle2 size={18} className="text-[#2b9368]" aria-hidden="true" /> Transparent PNG</span>
                  <span className="inline-flex items-center gap-2"><CheckCircle2 size={18} className="text-[#2b9368]" aria-hidden="true" /> Limited free use</span>
                </div>
                <p className="mt-10 hidden text-xs uppercase tracking-[.25em] text-[#92a296] lg:block">A little less background. A lot more possibility.</p>
              </div>

              <div id="upload" className="min-w-0 scroll-mt-24 rounded-[28px] border border-[#d9e5da] bg-white p-3 shadow-[0_20px_70px_rgba(43,77,53,.11)] sm:p-4">
                <div className="flex items-center justify-between gap-4 px-3 pb-4 pt-2 sm:px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e9f3ec] text-[#2a7453]"><ImageIcon size={17} aria-hidden="true" /></div>
                    <span className="text-sm font-semibold">Image workspace</span>
                  </div>
                  <span className="text-xs text-[#84968a]">JPG · PNG · WebP</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={event => { const file = event.target.files?.[0]; if (file) void processImage(file) }}
                  className="sr-only"
                  aria-label="Select an image for background removal"
                />

                {stage === 'idle' && (
                  <div
                    onDragOver={event => { event.preventDefault(); setIsDragging(true) }}
                    onDragLeave={event => { event.preventDefault(); setIsDragging(false) }}
                    onDrop={onDrop}
                    className={isDragging
                      ? 'rounded-2xl border-2 border-dashed border-[#248c64] bg-[#edf8ed] px-5 py-12 text-center sm:py-16'
                      : 'rounded-2xl border-2 border-dashed border-[#ceddd2] bg-[#fafbf9] px-5 py-12 text-center transition sm:py-16'}
                  >
                    <div className="mx-auto mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-[#e3f0e5] text-[#1d7955]">
                      <UploadCloud aria-hidden="true" size={33} strokeWidth={1.65} />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-[23px]">Your image, ready to go.</h2>
                    <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#7b8d81]">Drag an image here, paste a copied image, or browse from your device.</p>
                    <button type="button" onClick={upload} className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1c6146] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_7px_15px_rgba(28,97,70,.14)] transition hover:bg-[#134e37] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c6146]">
                      Choose an image <ArrowRight size={17} aria-hidden="true" />
                    </button>
                    <p className="mt-5 text-xs text-[#87988b]">Maximum 10 MB · Free use is limited</p>
                  </div>
                )}

                {stage === 'processing' && (
                  <div className="rounded-2xl border border-[#dce8dc] bg-[#f9fbf8] px-6 py-10 text-center" role="status" aria-live="polite">
                    {originalUrl && <img src={originalUrl} alt="Your uploaded image" className="mx-auto mb-7 max-h-44 max-w-full rounded-xl object-contain shadow-sm" />}
                    <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-[3px] border-[#d0e6d8] border-t-[#237b56]" aria-hidden="true" />
                    <h2 className="text-lg font-semibold">Making your cutout…</h2>
                    <p className="mt-2 text-sm text-[#738878]">This may take a moment, especially for larger photos.</p>
                    <button type="button" onClick={reset} className="mt-6 rounded-lg px-4 py-2 text-sm font-medium text-[#557566] underline underline-offset-4 hover:text-[#194b3a]">Cancel</button>
                  </div>
                )}

                {stage === 'error' && (
                  <div className="rounded-2xl border border-[#f0d7d0] bg-[#fffaf7] px-6 py-11 text-center" role="alert">
                    <XCircle size={39} className="mx-auto mb-4 text-[#b9684f]" aria-hidden="true" />
                    <h2 className="text-xl font-semibold text-[#553d37]">That didn&apos;t work.</h2>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#8c6b61]">{errorMessage}</p>
                    <button type="button" onClick={reset} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#194b3a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#28674e]">
                      <RefreshCw size={15} aria-hidden="true" /> Choose another image
                    </button>
                  </div>
                )}

                {stage === 'success' && originalUrl && resultUrl && (
                  <ResultView originalUrl={originalUrl} resultUrl={resultUrl} fileName={fileName} onReset={reset} />
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-2 pb-1 pt-5 text-center text-xs leading-5 text-[#8c9c90]">
                  <LockKeyhole size={14} aria-hidden="true" />
                  <span>Images are processed by remove.bg. We do not store your uploaded image.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24" aria-labelledby="preview-heading">
            <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#56856a]">See the idea</p>
                <h2 id="preview-heading" className="mt-3 max-w-xl text-3xl font-semibold tracking-[-.045em] sm:text-4xl">From busy background to clean canvas.</h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-[#7b8c80]">A simple illustration of the before and after. Upload your own photo to see a real result.</p>
            </div>
            <div className="grid overflow-hidden rounded-[26px] border border-[#dae4da] bg-white shadow-sm sm:grid-cols-2">
              <div className="relative flex min-h-[310px] flex-col items-center justify-end bg-[#e8e2d5] px-5 pb-7 pt-12">
                <span className="absolute left-6 top-5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#586357]">Before · illustration</span>
                <div className="pointer-events-none absolute inset-x-0 bottom-16 h-px bg-[#d7cbb9]" />
                <div className="relative z-10 flex h-[248px] w-[260px] items-center justify-center"><VaseIllustration /></div>
              </div>
              <div className="checkerboard relative flex min-h-[310px] flex-col items-center justify-end px-5 pb-7 pt-12">
                <span className="absolute left-6 top-5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#345541]">After · illustration</span>
                <div className="relative z-10 flex h-[248px] w-[260px] items-center justify-center"><VaseIllustration /></div>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="scroll-mt-20 border-y border-[#dfe9df] bg-[#edf4ec]">
            <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
              <div className="mb-12 max-w-lg">
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#618d72]">Easy from start to finish</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Three steps. One cleaner image.</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {steps.map(step => (
                  <div key={step.number} className="rounded-2xl border border-[#dbe9dd] bg-white/75 p-7">
                    <span className="text-sm font-semibold tracking-[.08em] text-[#439268]">{step.number}</span>
                    <h3 className="mt-7 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#768779]">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="use-cases" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-24">
            <div className="grid items-start gap-11 lg:grid-cols-[.78fr_1.22fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#618d72]">Small tool, many uses</p>
                <h2 className="mt-3 max-w-sm text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Your next idea starts with a cutout.</h2>
                <p className="mt-5 max-w-sm text-sm leading-7 text-[#738879]">A transparent background makes photos easier to reuse. The right cutout is one less thing between you and the finished project.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: <ImageIcon size={22} />, title: 'Product listings', text: 'Give product photos a cleaner look for online shops and catalogs.' },
                  { icon: <MousePointerClick size={22} />, title: 'Social graphics', text: 'Drop people and objects into posters, posts or presentation slides.' },
                  { icon: <Sparkles size={22} />, title: 'Portraits', text: 'Create flexible profile images that work with different backgrounds.' },
                  { icon: <Layers3 size={22} />, title: 'Creative projects', text: 'Reuse a subject in collages, mood boards and everyday designs.' },
                ].map(card => (
                  <div key={card.title} className="rounded-[20px] border border-[#e0e8df] bg-white p-6">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef5ef] text-[#2c7856]">{card.icon}</div>
                    <h3 className="text-base font-semibold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#79897c]">{card.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="faq" className="scroll-mt-20 border-t border-[#e1e9e2] bg-white">
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:py-24">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#618d72]">Good to know</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">A few things before you upload.</h2>
                <a href="/privacy" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#247452] underline underline-offset-4 hover:text-[#194b3a]">How your images are handled <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
              <div className="divide-y divide-[#e4ebe3] border-y border-[#e4ebe3]">
                {questions.map(item => (
                  <details key={item.q} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[15px] font-semibold text-[#234332] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#237b56] [&::-webkit-details-marker]:hidden">
                      {item.q}<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4e4d5] text-lg font-normal text-[#5d8c6b] transition group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p className="max-w-xl pb-2 pt-4 text-sm leading-7 text-[#7b8b7e]">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-[#dfe9df] bg-[#194b3a] px-5 py-14 text-center text-white sm:px-8">
            <h2 className="text-2xl font-semibold tracking-[-.03em] sm:text-3xl">Got a photo that needs a fresh start?</h2>
            <p className="mt-3 text-sm text-[#bad4c4]">Your next transparent PNG is just a click away.</p>
            <a href="#upload" className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#194b3a] transition hover:bg-[#eaf5eb]">Remove a background <ArrowRight size={16} aria-hidden="true" /></a>
          </section>
        </main>

        <footer className="border-t border-[#e0e7df] bg-[#f8faf6]">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-8 text-xs leading-6 text-[#7d9081] sm:flex-row sm:items-center sm:px-8">
            <p><strong className="font-semibold text-[#315b42]">LHY/Cutout</strong> · A simple AI image tool.</p>
            <div className="flex items-center gap-5">
              <a href="/privacy" className="hover:text-[#1e6247]">Privacy</a>
              <a href="#faq" className="hover:text-[#1e6247]">FAQ</a>
              <a href="https://github.com/lumospp/image-background-remover/issues" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[#1e6247]">Feedback <ArrowUpRight size={13} aria-hidden="true" /></a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
