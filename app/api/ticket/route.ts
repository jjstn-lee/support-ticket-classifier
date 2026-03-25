"use server";

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categorizeEmail } from '@/lib/deepseek/categorizer'
import { sendMessage } from '@/lib/mailgun/client'
import { verifyMailgunSignature } from '@/lib/mailgun/signature';
import { Category, isCategory } from '@/lib/types';

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('timestamp', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tickets', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ tickets: data })
  } catch (e) {
    console.error('Error fetching tickets:', e)
    return NextResponse.json({ error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log("===in POST -> /api/ticket/===");
  try {
    console.log("in try-branch...");
    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('multipart/form-data') && !contentType?.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json({ error: 'Invalid Content-Type. Expected multipart/form-data or application/x-www-form-urlencoded' }, { status: 400 });
    }
    console.log("creating supabase client...")
    const supabase = createClient()
    const formData = await request.formData()

    console.log("parsing mailgun part of formdata...")
    // mailgun verification
    let timestamp = formData.get('timestamp')?.toString() || ''
    const token = formData.get('token')?.toString() || ''
    const signature = formData.get('signature')?.toString() || ''

    console.log(signature)
    console.log(typeof(signature))

    console.log("verifying mailgun sig...")
    try {
      if (!verifyMailgunSignature(timestamp, token, signature)) {
        console.error("Mailgun signature invalid (1)"); // should now show in terminal
        process.stdout.write("Mailgun signature invalid (1)\n");
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (e) {
      console.error("Mailgun signature invalid (2)", e);
      process.stdout.write("Mailgun signature invalid (2)\n");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log("parsing the rest of formdata...")
    
    // Debug: log all formData entries
    console.log("===FormData entries===")
    for (const [key, value] of formData.entries()) {
      console.log(`Key: ${key}, Type: ${typeof value}, Value: ${value instanceof File ? `File(${value.name})` : value}`)
    }
    console.log("===End FormData===")
    
    // taking email data from form
    const messageID = formData.get('Message-Id')?.toString() || 'No Message-Id'
    const sender = formData.get('sender')?.toString() || 'unknown sender'
    const dateHeader = formData.get('Date')?.toString() || formData.get('date')?.toString() || null
    const subject = formData.get('subject')?.toString() || 'No subject'
    const body = (formData.get('stripped-text') || formData.get('body-plain'))?.toString() || ''
    

    console.log('Categorizing ticket', { subject, bodyPreview: body.slice(0, 180) })
    const category = await categorize(subject, body)
    console.log('Categorize result', { category })

    if (!category || !isCategory(category)) {
      throw new Error(`Invalid category after retries: ${JSON.stringify(category)}`)
    }

    const generated: boolean = (String(formData.get('generated')).toLowerCase() === 'true') || false; 



    
    if (dateHeader) {
      const numeric = Number(dateHeader)

      const date = !isNaN(numeric)
        ? new Date(numeric * 1000) // Unix timestamp
        : new Date(dateHeader)     // Date string

      if (isNaN(date.getTime())) {
        throw new Error("Invalid dateHeader format")
      }

      timestamp = date.toISOString()
    } else {
      timestamp = new Date().toISOString()
    }





    console.log("inserting into supabase...")
    const { error } = await supabase.from('tickets').insert({
      // id: ticketId,
      sender,
      timestamp, //timest ? new Date(parseInt(dateHeader) * 1000).toISOString() : new Date().toISOString(),
      subject,
      body,
      category,
      generated,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save ticket', details: error.message }, { status: 500 })
    }

    console.log("sending message to sender...")


      
    if (!generated) {
      await sendMessage(sender, subject, messageID)
    }

    // sanity check for what formdata looks like
    // for (const [key, value] of formData.entries()) {
    //   let stringValue: string;

    //   if (typeof value === "string") {
    //     stringValue = value;
    //   } else {
    //     // If it's a File, you can use its name or read it differently
    //     stringValue = value.name;
    //   }
    // console.log(key, stringValue.slice(0, 50));
    // }
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


async function categorize(subject: string, body: string,retries=3, delay=2500) {
  let lastError;
      for (let i = 0; i < retries; i++) {
        try {
          return await categorizeHelper(subject, body);
        } catch (err) {
          lastError = err;
          console.log(`   attempt ${i}`)
          console.log(`   lastError ${lastError}`)
          await new Promise(res => setTimeout(res, delay * (i + 1)));
        }
      }
    
      throw lastError;
    }

async function categorizeHelper(subject: string, body: string) {
  const category = await categorizeEmail(subject, body) as Category
  
  if (!isCategory(category)) {
    throw new Error(`Categorizer response was not a valid category: ${category}`);
  }

  return category;
}