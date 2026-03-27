import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.REMOVE_BG_API_KEY || ''

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Remove.bg API key not configured. Set REMOVE_BG_API_KEY environment variable.' },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Create new FormData for Remove.bg API (field name must be 'image_file')
    const removeBgFormData = new FormData()
    removeBgFormData.append('image_file', imageFile)
    removeBgFormData.append('size', 'auto')

    // Forward to Remove.bg API
    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
      },
      body: removeBgFormData,
    })

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text()
      return NextResponse.json(
        { error: `Remove.bg API error: ${errorText}` },
        { status: removeBgResponse.status }
      )
    }

    const blob = await removeBgResponse.blob()
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
