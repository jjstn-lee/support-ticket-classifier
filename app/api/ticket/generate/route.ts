import { NextRequest, NextResponse } from 'next/server'
import { generateCareerEmail, generateEducationEmail, generateUsageEmail } from '@/lib/deepseek/generator'
import { generateMailgunSignature } from '@/lib/mailgun/signature'

// HARD CODED JSON MEMBERS
const recipient = "ticket@justin-hisung-lee.dev"


async function generate(retries = 3, delay = 2000) {
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
    const emailGenerators = [
        generateUsageEmail,
        generateEducationEmail,
        generateCareerEmail,
    ];

    const randomGenerator = emailGenerators[Math.floor(Math.random() * emailGenerators.length)];
    // generate mailgun signature (timestamp + token + signature)
    console.log("generating mailgunSignature...")
    const mailgunSignature = generateMailgunSignature()

    console.log("generating emailJSON...")
    // generate customer ticket email via LLM
    const emailJSON = await randomGenerator()
    if (emailJSON instanceof Error) {
        throw new Error("Failed to generate email")
    }

    console.log("creating URLSearchParams...")
    const payload = new URLSearchParams({
        "Message-Id": `<test-${mailgunSignature.encodedToken}>`,
        sender: emailJSON.sender ?? "unknown sender",
        Date: mailgunSignature.timestamp,
        subject: emailJSON.subject ?? "No subject",
        "body-plain": emailJSON.body ?? "",
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
        const payload = await generate();
        if (payload instanceof Error || payload == null) {
            console.error('Stopping execution due to error:', payload);
            break;
        }

        console.log("sending POST to ticket endpoint...");
        try {
            await postToTicket(ticketEndpoint, payload);
        } catch (e) {
            console.error("Posting to ticket endpoint failed after retries:", e);
        }

        console.log("full workflow successfully tested; new email visible in database");

        if (i < batchSize - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return NextResponse.json("Success!");
}

async function postToTicket(ticketEndpoint: string, payload: URLSearchParams, retries = 3, delay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(ticketEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      });
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Ticket endpoint failed: ${response.status} ${text}`)
      }
      return response;
    } catch (err) {
      lastError = err;
      console.log(`   post attempt ${i}`)
      console.log(`   lastError ${lastError}`)
      await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
  throw lastError;
}