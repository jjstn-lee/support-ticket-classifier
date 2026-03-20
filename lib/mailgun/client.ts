import Mailgun from 'mailgun.js'

const mailgun = new Mailgun(FormData); // or const formData = require('form-data');

export const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY || 'MAILGUN_API_KEY'});



export function sendMessage(sender: string, subject: string, messageID: string) {
    mg.messages.create('mg.justin-hisung-lee.dev', {
        from: "ticket@mg.justin-hisung-lee.dev",
        to: sender,
        subject: `Re: ${subject}`,
        text: "Thanks for your email! We've entered your complaint into our system and will get back to you shortly.",
        "h:In-Reply-To": messageID,
        "h:References": messageID
    })
    .then(msg => console.log(msg)) // logs response data
    .catch(err => console.error(err)); // logs any error

}