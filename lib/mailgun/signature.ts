import crypto from 'crypto';

const webhookSignature = process.env.MAILGUN_WEBHOOK_SIGNATURE!

export function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const encodedToken = crypto
        .createHmac('sha256', webhookSignature)
        .update(timestamp.concat(token))
        .digest('hex')
  console.log(`in verifyMailgunSignature: ${ encodedToken === signature }`)
  return (encodedToken === signature)
}

export function generateMailgunSignature() {
    // create token string
    const token = crypto.randomBytes(25).toString('hex')  // produces 50 char hex string
    // create timestamp as string
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // create encodedToken
    const encodedToken = crypto
        .createHmac('sha256', webhookSignature)
        .update(timestamp.concat(token))
        .digest('hex')

    return {
        token: token,
        timestamp: timestamp,
        encodedToken: encodedToken,
    }
}