import { NormalizedEmailSchema } from './schema';

const MLVOCA_URL = "https://mlvoca.com/api/generate";
const MODEL = "deepseek-r1:1.5b";

const prompt = `
You generate JSON objects that represent client IT issues at an education and career platform.
Output ONLY one valid JSON object with EXACTLY these four keys: "sender", "Date", "subject", "stripped-text".

Rules:
- Do not include placeholders, explanations, markdown, or extra text.
- Do NOT output placeholders such as "[Paste a valid JSON object here]".
- Do NOT include markdown or extra text like "json".
- Do NOT include explanations.
- All line breaks in "stripped-text" must be represented as \n.
- "subject" and "stripped-text" must correspond to one of these categories: usage, account, feedback, education, career.

Example of valid output:

{
  "sender": "johnsmith@gmail.com",
  "Date": "2026-03-21T16:46:08-04:00",
  "subject": "Question about Account",
  "stripped-text": "Hi,\nI am having difficulty logging in. Please help.\nBest regards,\nJohn Smith"
}`;

interface MlvocaResponse {
  response: string;
  done: boolean;
}

export async function generateEmail() {
    const response = await fetch(MLVOCA_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            prompt: prompt,
            stream: false,
            temperature: 0.6,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`mlvoca API error ${response.status}: ${errorText}`);
    }

    const data: MlvocaResponse = await response.json();
    const stripped = data.response
        .trim()
        .replace(/<think>[\s\S]*?<\/think>/g, '') // getting rid of <think> tags
        .replace(/[*_~`#>]+/g, '')   // markdown symbols
        .replace(/\\'/g, "'");        // fix escaped single quotes

    console.log(`RAW LLM OUTPUT: ${stripped}`);

    try {
        const emailJSON = NormalizedEmailSchema.parse(JSON.parse(stripped));
        console.log(`Validated email: ${emailJSON}`);
        return emailJSON;
    } catch (err) {
        console.error('Invalid email payload', err);
        console.log(stripped);
    }
}