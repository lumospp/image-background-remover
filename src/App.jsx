import { useState, useEffect, useRef, useCallback } from 'react'
import { Scissors, AlertCircle, Zap, Layers, ArrowLeft, User, Loader2 } from 'lucide-react'
import DropZone from './components/DropZone'
import Result from './components/Result'
import BatchQueue from './components/BatchQueue'
import { removeBackground } from './lib/api'
import JSZip from 'jszip'

const FREE_QUOTA = 50
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/**
 * Load Google Identity Services script
 */
function loadGISScript() {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * LoginScreen - Shows Google sign-in button
 */
function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID not configured')
      return
    }

    loadGISScript()
      .then(() => {
        if (window.google && buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 250,
          })

          // Also initialize the library for prompt moment
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response) => {
              if (response.credential) {
                setLoading(true)
                try {
                  await onLogin(response.credential)
                } catch (err) {
                  setError(err.message)
                  setLoading(false)
              }
            },
          })
        }
      })
      .catch(() => {
        setError('Failed to load Google Sign-In')
      })
  }, [onLogin])

  const handleLogin = () => {
    if (window.google) {
      window.google.accounts.id.prompt()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Scissors size={36} className="text-purple-600" />
          <span className="text-2xl font-bold tracking-tight text-gray-900">BG Remover</span>
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome back
        </h1>
        <p className="text-gray-500 mb-8">
          Sign in to continue removing backgrounds from your images
        </p>
        
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-600 text-sm">
            {error}
          </div>
        ) : (
          <div className="flex justify-center mb-6">
            <div ref={buttonRef} onClick={handleLogin} className="cursor-pointer inline-block" />
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <span>Signing in...</span>
          </div>
        )}
        
        <p className="text-xs text-gray-400 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

/**
 * UserBadge - Shows when user is signed in
 */
function UserBadge({ user, onSignOut }) {
  return (
    <div className="flex items-center gap-3">
      {user.picture ? (
        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
      )}
      <span className="text-white text-sm font-medium hidden sm:inline">{user.name}</span>
      <button
        onClick={onSignOut}
        className="text-white/60 hover:text-white text-sm transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [credential, setCredential] = useState(null)
  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [usageCount, setUsageCount] = useState(0)
  const [category, setCategory] = useState('people')

  // Batch processing state
  const [batchMode, setBatchMode] = useState(false)
  const [batchItems, setBatchItems] = useState([])
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0)
  const [processingIndex, setProcessingIndex] = useState(-1)

  const remaining = FREE_QUOTA - usageCount

  // Generate unique ID
  const generateId = () => `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Handle Google login
  const handleLogin = useCallback(async (googleCredential) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: googleCredential }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      if (data.success && data.user) {
        setUser(data.user)
        setCredential(googleCredential)
        setUsageCount(data.user.usageCount || 0)
      }
    } catch (err) {
      throw new Error('Failed to authenticate with server')
    }
  }, [])

  // Handle sign out
  const handleSignOut = () => {
    setUser(null)
    setCredential(null)
    setUsageCount(0)
    if (window.google) {
      window.google.accounts.id.disableAutoSelect()
    }
  }

  // Load Google script on mount
  useEffect(() => {
    loadGISScript().then(() => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: () => {}, // Will be handled by button
        })
      }
    })
  }, [])

  // ============================================================
  // AUTH GATE — Show login if not signed in
  // ============================================================
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
  }

  /**
   * removeBackground - calls API with optional auth token
   */
  const callRemoveBackground = async (file) => {
    const formData = new FormData()
    formData.append('image', file)

    const headers = {}
    if (credential) {
      headers['Authorization'] = `Bearer ${credential}`
    }

    const response = await fetch('/api/removebg', {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(errorData.error || 'Failed to remove background')
    }

    return response.blob()
  }

  /**
   * handleFileSelect — processes a single image
   */
  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile)
    setOriginalUrl(URL.createObjectURL(selectedFile))
    setResultUrl(null)
    setError(null)
    setLoading(true)

    try {
      const blob = await callRemoveBackground(selectedFile)
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setUsageCount(c => c + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * handleFilesSelect — handles multiple file selection for batch processing
   */
  const handleFilesSelect = async (files) => {
    const items = files.map(file => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      resultUrl: null,
      status: 'pending',
      error: null
    }))

    setBatchItems(items)
    setBatchMode(true)
    setSelectedBatchIndex(0)
    setProcessingIndex(0)

    processBatchItem(0, items)
  }

  /**
   * processBatchItem — processes a single batch item
   */
  const processBatchItem = async (index, items = batchItems) => {
    if (index >= items.length) {
      setProcessingIndex(-1)
      return
    }

    const item = items[index]
    
    setBatchItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status: 'processing' }
      return updated
    })

    try {
      const blob = await callRemoveBackground(item.file)
      const resultUrl = URL.createObjectURL(blob)
      
      setBatchItems(prev => {
        const updated = [...prev]
        updated[index] = { 
          ...updated[index], 
          resultUrl, 
          status: 'completed' 
        }
        return updated
      })

      setUsageCount(c => c + 1)
      
      setTimeout(() => {
        processNextItem(index + 1)
      }, 500)
    } catch (err) {
      setBatchItems(prev => {
        const updated = [...prev]
        updated[index] = { 
          ...updated[index], 
          status: 'error',
          error: err.message 
        }
        return updated
      })
      
      setTimeout(() => {
        processNextItem(index + 1)
      }, 500)
    }
  }

  /**
   * processNextItem — processes the next item in the queue
   */
  const processNextItem = (nextIndex) => {
    if (nextIndex < batchItems.length) {
      setProcessingIndex(nextIndex)
      setSelectedBatchIndex(nextIndex)
      processBatchItem(nextIndex)
    } else {
      setProcessingIndex(-1)
    }
  }

  /**
   * handleBatchSelect — select an item from the batch queue
   */
  const handleBatchSelect = (index) => {
    setSelectedBatchIndex(index)
  }

  /**
   * handleDownloadAll — downloads all completed images as a ZIP
   */
  const handleDownloadAll = async () => {
    const completedItems = batchItems.filter(item => item.status === 'completed')
    if (completedItems.length === 0) return

    const zip = new JSZip()
    
    const promises = completedItems.map(async (item) => {
      try {
        const response = await fetch(item.resultUrl)
        const blob = await response.blob()
        const baseName = item.file.name.replace(/\.[^/.]+$/, '')
        zip.file(`${baseName}_no_bg.png`, blob)
      } catch (err) {
        console.error(`Failed to add ${item.file.name} to zip:`, err)
      }
    })

    await Promise.all(promises)

    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = `background_removed_${Date.now()}.zip`
    link.click()
  }

  /**
   * handleBatchReset — returns to single image mode
   */
  const handleBatchReset = () => {
    batchItems.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
    })
    
    setBatchMode(false)
    setBatchItems([])
    setSelectedBatchIndex(0)
    setProcessingIndex(-1)
    setFile(null)
    setOriginalUrl(null)
    setResultUrl(null)
    setError(null)
  }

  const completedCount = batchItems.filter(item => item.status === 'completed').length
  const allCompleted = completedCount === batchItems.length && batchItems.length > 0
  const progress = batchItems.length > 0 ? (completedCount / batchItems.length) * 100 : 0

  const selectedItem = batchMode && batchItems.length > 0 ? batchItems[selectedBatchIndex] : null

  // ============================================================
  // BATCH MODE — Shows queue + preview
  // ============================================================
  if (batchMode) {
    return (
      <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <BatchQueue
          items={batchItems}
          selectedIndex={selectedBatchIndex}
          onSelect={handleBatchSelect}
          onDownloadAll={handleDownloadAll}
          allCompleted={allCompleted}
        />

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-8 py-6">
            <div className="flex items-center gap-3 text-white">
              <Scissors size={28} />
              <span className="text-xl font-bold tracking-tight">BG Remover</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium flex items-center gap-1.5">
                <Layers size={14} />
                Batch Mode
              </span>
            </div>

            <div className="flex items-center gap-3">
              <UserBadge user={user} onSignOut={handleSignOut} />

              <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 text-white">
                {processingIndex >= 0 ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing {processingIndex + 1} / {batchItems.length}
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    {completedCount} / {batchItems.length} completed
                  </>
                )}
              </div>

              <button
                onClick={handleBatchReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            </div>
          </div>

          {processingIndex >= 0 && (
            <div className="px-8 mb-4">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-6">
            {selectedItem ? (
              <div className="w-full max-w-4xl">
                <div className="relative rounded-2xl overflow-hidden bg-white/10 border border-white/20">
                  <img
                    src={selectedItem.resultUrl || selectedItem.previewUrl}
                    alt={selectedItem.file.name}
                    className="w-full max-h-[60vh] object-contain mx-auto"
                    style={{ opacity: selectedItem.status === 'processing' ? 0.5 : 1 }}
                  />
                  
                  {selectedItem.status === 'processing' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 gap-3">
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      <p className="text-white/80 text-sm font-medium">
                        Processing... Takes about 5 seconds
                      </p>
                    </div>
                  )}

                  {selectedItem.status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-3">
                      <AlertCircle size={40} className="text-red-400" />
                      <p className="text-white/80 text-sm font-medium">
                        {selectedItem.error || 'Failed to process'}
                      </p>
                    </div>
                  )}

                  {selectedItem.status === 'completed' && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-green-500/90 rounded-full text-white text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                      Ready to download
                    </div>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <p className="text-white font-medium">{selectedItem.file.name}</p>
                  <p className="text-white/50 text-sm mt-1">
                    {(selectedItem.file.size / 1024 / 1024).toFixed(2)} MB
                    {selectedItem.status === 'completed' && ' · Transparent PNG ready'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-white/50 text-center">
                <Layers size={64} className="mx-auto mb-4 opacity-30" />
                <p>Select an image from the queue to preview</p>
              </div>
            )}
          </div>

          <div className="py-6 px-8 flex items-center justify-between gap-4">
            <div className="text-white/50 text-sm">
              {allCompleted 
                ? 'All images processed! Download as ZIP or individually.'
                : processingIndex >= 0 
                  ? `Processing image ${processingIndex + 1} of ${batchItems.length}...`
                  : 'Waiting for processing to start...'
              }
            </div>

            {allCompleted && (
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-6 py-3 rounded-xl
                  bg-white text-purple-700 font-semibold text-sm
                  hover:bg-white/90 transition-all shadow-lg"
              >
                Download All as ZIP
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // SINGLE IMAGE MODE
  // ============================================================

  const handleSingleFileSelect = async (selectedFile) => {
    setFile(selectedFile)
    setOriginalUrl(URL.createObjectURL(selectedFile))
    setResultUrl(null)
    setError(null)
    setLoading(true)

    try {
      const blob = await callRemoveBackground(selectedFile)
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setUsageCount(c => c + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setOriginalUrl(null)
    setResultUrl(null)
    setError(null)
    setCategory('people')
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {resultUrl && !loading ? (
        <Result
          originalUrl={originalUrl}
          resultUrl={resultUrl}
          onReset={handleReset}
        />
      ) : (
        <>
          <div className="relative z-10 flex items-center justify-between px-8 py-6">
            <div className="flex items-center gap-3 text-white">
              <Scissors size={28} />
              <span className="text-xl font-bold tracking-tight hidden sm:inline">
                BG Remover
              </span>
            </div>

            <div className="flex items-center gap-3">
              <UserBadge user={user} onSignOut={handleSignOut} />

              <button
                onClick={() => {
                  setBatchMode(true)
                  setBatchItems([])
                  setSelectedBatchIndex(0)
                  setProcessingIndex(-1)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  bg-white/10 text-white border border-white/30
                  hover:bg-white/20 transition-all"
              >
                <Layers size={16} />
                Batch Mode
              </button>

              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                transition-all duration-300
                ${remaining > 0
                  ? 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-400/30'
                  : 'bg-white/20 text-white/70'
                }
              `}>
                <Zap size={16} fill={remaining > 0 ? 'currentColor' : 'none'} />
                {remaining > 0 ? (
                  <span>
                    🎁 {remaining} FREE — no credit card needed
                  </span>
                ) : (
                  <span>All credits used — Sign up for more</span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="max-w-2xl mx-auto px-6 mb-4 z-20 relative">
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4
                flex items-center gap-3 text-white">
                <AlertCircle size={20} className="shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] gap-4 sm:gap-6 px-4 sm:px-6">
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden bg-white/10 border border-white/20">
                {originalUrl && (
                  <img
                    src={originalUrl}
                    alt="Uploading"
                    className="w-full h-full object-contain opacity-50"
                  />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white/80 text-xs sm:text-sm font-medium text-center px-2">
                    Processing... Takes about 5 seconds
                  </p>
                </div>
              </div>

              {file && (
                <p className="text-white/50 text-xs sm:text-sm max-w-xs truncate text-center px-4">
                  {file.name}
                </p>
              )}
            </div>
          ) : (
            <DropZone
              onFileSelect={handleSingleFileSelect}
              onFilesSelect={handleFilesSelect}
              disabled={remaining <= 0}
              category={category}
              onCategoryChange={setCategory}
              multiple={true}
              remaining={remaining}
            />
          )}

          <footer className="relative z-10 text-center text-white/40 text-xs py-6">
            Made for small e-commerce sellers · 100% Free to Start
          </footer>
        </>
      )}
    </div>
  )
}
