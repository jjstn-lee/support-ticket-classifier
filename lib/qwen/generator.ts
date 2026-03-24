import { NormalizedEmailSchema } from './schema';
import { emailJSON } from '@/lib/types/emailJSON';

const MLVOCA_URL = "https://mlvoca.com/api/generate";
const MODEL = "deepseek-r1:1.5b";

const prompt = `
You are currently enrolled in an education/career program, but are running into issues with their product. Your task is to write an email complaint to the support team of
the education and career platform you are using as a JSON object. Output ONLY one valid JSON object with EXACTLY these four
keys: "sender", "Date", "subject", "stripped-text".

Rules:
- Do not include placeholders, explanations, markdown, or extra text.
- Do NOT use any placeholders such as "[Paste a valid JSON object here]" or "[Category here]".
- Do NOT include markdown or extra text like "json".
- Do NOT include explanations.
- All line breaks in "stripped-text" must be represented as \n.
- "subject" and "stripped-text" must correspond to one of these categories: usage, account, feedback, education, career.
- "subject" and "stripped-text" must be written from the perspective of the client, NOT the customer support analyst.

Examples of valid output:

{
  "sender": "john.stewart@gmail.com",
  "Date": "2026-03-21T16:46:08-04:00",
  "subject": "Question about Account",
  "stripped-text": "Hi,\nI am having difficulty logging in. Please help.\nBest regards,\nJohn Smith"
}

{
  "sender": "alex.rodriguez@gmail.com",
  "Date": "2026-03-22T14:12:27-04:00",
  "subject": "Issue with Course Access and Job Applications",
  "stripped-text": "Hello,\nI recently enrolled in a certification program on your platform, but I’m unable to access some of the course materials. Additionally, a few of my job applications still show as ‘pending’ without any updates.\nCould you please look into this and let me know how to proceed?\nThank you for your assistance.\nBest regards,\nAlex Rodriguez"
}

{
  "sender": "emily.chen@outlook.com",
  "Date": "2026-03-20T09:15:42-04:00",
  "subject": "Confusion about Using Platform Features",
  "stripped-text": "Hello,\nI'm generally confused about some features of the web application. Could you assist?\nThanks,\nEmily"
}`;

interface MlvocaResponse {
  response: string;
  done: boolean;
}

export async function generateEmail(): Promise<emailJSON> {
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

    const normalized = stripped.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
        match.replace(/\n/g, '\\n')
    );

    console.log(`NORMALIZED LLM OUTPUT: ${normalized}`);

    try {
        const emailJSON = NormalizedEmailSchema.parse(JSON.parse(normalized)) as emailJSON;
        console.log(`Validated email: ${emailJSON}`);
        return emailJSON;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Failed to parse/validate generated email JSON:', message);
        console.error('Original mlvoca response:', data.response);
        console.error('Normalized output:', normalized);
        throw new Error(`Failed to parse/validate generated email JSON: ${message}`);
    }
}