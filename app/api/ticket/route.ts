import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'

// export const dynamic = 'force-dynamic'

function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const apiKey = process.env.MAILGUN_API_KEY
  if (!apiKey) return false

  const digest = createHmac('sha256', apiKey)
    .update(timestamp + token)
    .digest('hex')

  return digest === signature
}

export async function POST(request: NextRequest) {

  const supabase = createClient()
  const formData = await request.formData()

  const timestamp = formData.get('timestamp') as string
  const token = formData.get('token') as string
  const signature = formData.get('signature') as string

  if (!verifyMailgunSignature(timestamp, token, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const sender = formData.get('sender') as string
  const dateHeader = formData.get('Date') as string | null
  const subject = formData.get('subject') as string
  const body = (formData.get('stripped-text') || formData.get('body-plain')) as string

  const error = (await supabase).from('tickets').insert({
    sender,
    subject,
    body,
    timestamp: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
  })

  if (error) {
    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: 'Failed to save ticket' }, { status: 500 })
  }

  console.log("received new email! sending success response...")
  return NextResponse.json({ success: true })
}
