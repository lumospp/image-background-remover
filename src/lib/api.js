const API_URL = import.meta.env.VITE_API_URL || '/api'

export async function removeBackground(file) {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || 'Failed to remove background')
  }

  return response.blob()
}
