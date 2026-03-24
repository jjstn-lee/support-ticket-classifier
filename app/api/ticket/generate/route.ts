import { NextRequest, NextResponse } from 'next/server'
import { generateEmail } from '@/lib/qwen/generator'
import { generateMailgunSignature } from '@/lib/mailgun/signature'

// HARD CODED JSON MEMBERS
const recipient = "ticket@justin-hisung-lee.dev"


async function generate(retries = 3, delay = 500) {
  let lastError;
  
      for (let i = 0; i < retries; i++) {
        try {
          return await generateHelper();
        } catch (err) {
          lastError = err;
          console.log(`   attempt ${i}`)
          console.log(`   lastError ${lastError}`)
          await new Promise(res => setTimeout(res, delay * (i + 1)));
        }
      }
    
      throw lastError;
    }
  

async function generateHelper() {
    // generate mailgun signature (timestamp + token + signature)
    console.log("generating mailgunSignature...")
    const mailgunSignature = generateMailgunSignature()

    console.log("generating emailJSON...")
    // generate customer ticket email via LLM
    const emailJSON = await generateEmail()
    if (emailJSON instanceof Error) {
        return NextResponse.json({ error: "Failed to generate email" }, { status: 500 })
    }

    console.log("creating URLSearchParams...")
    const payload = new URLSearchParams({
        "Message-Id": `<test-${mailgunSignature.encodedToken}>`,
        sender: String(emailJSON.sender ?? "unknown sender"),
        Date: String(mailgunSignature.timestamp),
        subject: String(emailJSON.subject ?? "No subject"),
        "body-plain": String(emailJSON.body ?? ""),
        timestamp: mailgunSignature.timestamp,
        token: mailgunSignature.token,
        signature: mailgunSignature.encodedToken,
        generated: String(true),
    })

    return payload
}


export async function POST(request: NextRequest) {
    console.log("===in POST -> /api/ticket/generate===")

    const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
    const batchSize = 3

    const ticketEndpoint = `${baseUrl}/api/ticket`
    console.log(`ticketEndpoint: ${ ticketEndpoint }`)
    
    for (let i = 0; i < batchSize; i++) {
        const payload = await generate()
        if (payload instanceof Error || payload == null) {
            console.error('Stopping execution due to error:', payload);
            return; // prevents further computation
        }
    
        console.log("sending POST to ticket endpoint...")
        // POST to `/api/ticket/` to fully test workflow
        try {
            console.log("in try-branch...");
            const response = await fetch(ticketEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload.toString(),
            });
    
            if (!response.ok) {
                const text = await response.text()
                console.error(`Ticket endpoint failed: ${response.status}`, text)
                return NextResponse.json({ error: "Ticket endpoint returned an error -- " }, { status: 500 })
            }
        } catch (e) {
            console.error("Fetch to ticket endpoint threw:", e)
            return NextResponse.json({ error: "Failed to send form to ticket endpoint" }, { status: 500 })
        }
        
        console.log("full workflow successfully tested; new email visible in database")
    }
    return NextResponse.json("Success!")
}