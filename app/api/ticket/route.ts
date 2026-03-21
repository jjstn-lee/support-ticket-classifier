"use server";

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto';
import { Category, categorize } from '@/lib/qwen/categorizer'
import { mg, sendMessage } from '@/lib/mailgun/client'

// function generateTicketId(): string {
//   const now = new Date();

//   // Format date as YYMMDD
//   const year = now.getFullYear().toString().slice(-2);
//   const month = (now.getMonth() + 1).toString().padStart(2, "0");
//   const day = now.getDate().toString().padStart(2, "0");

//   const datePart = `${year}${month}${day}`;

//   // Generate random base36 string
//   const randomPart = Math.random()
//     .toString(36)
//     .substring(2, 8) // 6 characters
//     .toUpperCase();

//   return `${datePart}-${randomPart}`;
// }

// export const dynamic = 'force-dynamic'

function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const webhookKey = process.env.MAILGUN_WEBHOOK_KEY

  if (!webhookKey) {
    console.log("mailgun API key not found")
    return false
  }

  const encodedToken = crypto
        .createHmac('sha256', webhookKey)
        .update(timestamp.concat(token))
        .digest('hex')
  console.log(`in verifyMailgunSignature: ${ encodedToken === signature }`)
  return (encodedToken === signature)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const formData = await request.formData()

    // mailgun verification
    const timestamp = formData.get('timestamp')?.toString() || ''
    const token = formData.get('token')?.toString() || ''
    const signature = formData.get('signature')?.toString() || ''

    try {
      if (!verifyMailgunSignature(timestamp, token, signature)) {
        console.log("mailgun signature invalid (1)")
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch (e) {
      console.error("mailgun signature invalid (2)")
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // taking email data from form
    const messageID = formData.get('Message-ID')?.toString() || 'No Message-ID'
    const sender = formData.get('sender')?.toString() || 'unknown sender'
    const dateHeader = formData.get('Date')?.toString() || formData.get('date')?.toString() || null
    const subject = formData.get('subject')?.toString() || 'No subject'
    const body = (formData.get('stripped-text') || formData.get('body-plain'))?.toString() || ''
    const category = await categorize(subject, body) as string // OpenAI API call

    const { error } = await supabase.from('tickets').insert({
      // id: ticketId,
      sender,
      timestamp: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
      subject,
      body,
      category,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save ticket', details: error.message }, { status: 500 })
    }

    sendMessage(sender, subject, messageID)
    console.log("Success!")
    return NextResponse.json({
      success: true,
      // ticketId,
    });

  } catch (e) {
    console.error('Unexpected error in POST /api/ticket:', e)
    return NextResponse.json({ error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

// async function sendReceipt(sender: string, subject: string, body: string, messageID: string) {
//   // send success message to recipient
//   const autoReplyMessage = {
//     from: "ticket@mg.justin-hisung-lee.dev",
//     to: sender,
//     subject: `Re: ${subject}`,
//     text: "Thanks for your email! We've entered your complaint into our system and will get back to you shortly.",
//     "h:In-Reply-To": messageID,
//     "h:References": messageID
//   };

//   const url = `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`;
//   const responseBody = new URLSearchParams();
//   for (const [key, value] of Object.entries(autoReplyMessage)) {
//     if (value) responseBody.append(key, value.toString());
//   }

//   const response = await fetch(url, {
//     method: "POST",
//     headers: {
//       "Authorization": `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}`,
//       "Content-Type": "application/x-www-form-urlencoded"
//     },
//     body: responseBody.toString()
//   });

//   if (!response.ok) {
//     const text = await response.text();
//     console.error("Mailgun error:", text);
//     return NextResponse.json({ ok: false, error: text }, { status: 500 });
//   }
// }