"use server";

import { NextRequest, NextResponse } from 'next/server'
// import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'

// export const dynamic = 'force-dynamic'

// function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
//   const apiKey = process.env.MAILGUN_API_KEY
//   if (!apiKey) return false

//   const digest = createHmac('sha256', apiKey)
//     .update(timestamp + token)
//     .digest('hex')

//   return digest === signature
// }

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const formData = await request.formData()

    // const timestamp = formData.get('timestamp')?.toString() || ''
    // const token = formData.get('token')?.toString() || ''
    // const signature = formData.get('signature')?.toString() || ''

    // try {
    //   if (!verifyMailgunSignature(timestamp, token, signature)) {
    //     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    //   }
    // } catch (e) {
    //   console.error('Signature verification failed:', e)
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const sender = formData.get('sender')?.toString() || 'unknown sender'
    const dateHeader = formData.get('Date')?.toString() || formData.get('date')?.toString() || null
    const subject = formData.get('subject')?.toString() || 'No subject'
    const body = (formData.get('stripped-text') || formData.get('body-plain'))?.toString() || ''

    const { data, error } = await supabase.from('tickets').insert({
      sender,
      subject,
      body,
      timestamp: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save ticket', details: error.message }, { status: 500 })
    }

    console.log('Received new email! Sending success response...')
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Unexpected error in POST /api/ticket:', e)
    return NextResponse.json({ error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}