import { NormalizedEmailSchema } from './schema';
import { emailJSON } from '@/lib/types';

const MLVOCA_URL = "https://mlvoca.com/api/generate";
const MODEL = "deepseek-r1:1.5b";

// ── Shared helpers ────────────────────────────────────────────────────────────

const BASE_CONTEXT = `
You are currently enrolled at 'Emerge Career', a career development platform that offers educational content, coaching, and job placement services specifically
around CDLs/truck driving and other blue-collared work. You are running into issues with their product. Your task is to write an email complaint to the support
team as a JSON object. Output ONLY one valid JSON object with EXACTLY these 3 keys: "sender", "subject", and "stripped-text".

Rules:
- Do not include placeholders, explanations, markdown, or extra text.
- Do NOT use any placeholders such as "[Paste a valid JSON object here]" or "[Your name here]".
- Do NOT include markdown or extra text like "json".
- Do NOT include explanations.
- "sender" must be an email address.
- All line breaks in "stripped-text" must be represented as \\n.
- "subject" and "stripped-text" must be written from the perspective of the client, NOT the customer support analyst.`;

interface MlvocaResponse {
  response: string;
  done: boolean;
}

async function callMlvoca(prompt: string): Promise<emailJSON> {
  const response = await fetch(MLVOCA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
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
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/[*_~`#>]+/g, '')
    .replace(/\\'/g, "'");

  const normalized = stripped.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
    match.replace(/\n/g, '\\n')
  );

  console.log(`NORMALIZED LLM OUTPUT: ${normalized}`);

  try {
    const emailJSON = NormalizedEmailSchema.parse(JSON.parse(normalized)) as unknown as emailJSON;
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

// ── Agent 1: Usage tickets ────────────────────────────────────────────────────
// Covers platform/account access issues, bugs, billing, and technical problems.

const USAGE_PROMPT = `
${BASE_CONTEXT}

Your complaint must be specifically about a USAGE issue — a technical or account-related
problem with the platform itself. This includes:
- Login or account access failures
- Billing charges or subscription errors
- Broken features, crashes, or unexpected platform behavior
- Profile or settings not saving correctly

Example of a valid output:

{
  "sender": "alex.rodriguez@gmail.com",
  "subject": "Login Difficulty",
  "stripped-text": "Hello,\\nI am having trouble logging into my account. I keep getting an error message saying my credentials are invalid, but even after resetting my password, I still get the error.\\nCould you please help me resolve this issue?\\nThank you,\\nAlex Rodriguez"
}`;

export async function generateUsageEmail(): Promise<emailJSON> {
  return callMlvoca(USAGE_PROMPT);
}

// ── Agent 2: Education tickets ────────────────────────────────────────────────
// Covers course content access, certifications, and learning material problems.

const EDUCATION_PROMPT = `
${BASE_CONTEXT}

Your complaint must be specifically about an EDUCATION issue — a problem related to
courses, learning materials, or certifications on the platform. This includes:
- Unable to access enrolled course content or modules
- Videos, quizzes, or assignments not loading
- Course progress not being saved or tracked
- Certificate not issued after completing a course
- Confusion about course curriculum or learning paths

Example of a valid output:

{
  "sender": "emily.chen@outlook.com",
  "subject": "Course Videos Not Loading",
  "stripped-text": "Hello,\\nI recently enrolled in the CDL program, but several video lessons in Module 3 fail to load entirely.\\nI've tried different browsers and clearing my cache, but the issue persists. My progress also doesn't seem to be saving correctly.\\nCould you please look into this?\\nThanks,\\nEmily Chen"
}`;

export async function generateEducationEmail(): Promise<emailJSON> {
  return callMlvoca(EDUCATION_PROMPT);
}

// ── Agent 3: Career tickets ───────────────────────────────────────────────────
// Covers job placements, coaching sessions, applications, and career services.

const CAREER_PROMPT = `
${BASE_CONTEXT}

Your complaint must be specifically about a CAREER service issue — a problem related to
job placement, coaching, or professional development features. This includes:
- Job applications stuck in "pending" with no updates
- Unable to book or access coaching sessions
- Career coach unresponsive or sessions not honored
- Resume review or feedback not received
- Job matches being irrelevant to stated preferences

Example of a valid output:

{
  "sender": "marcus.pinkman@gmail.com",
  "subject": "Coaching Session Information Needed",
  "stripped-text": "Hi,\\nI had an accident and broke my phone, which had all of my coaching information on it. I believe the meeting with my coach is sometime next week.\\nCould you please send me the proper information so that I can still attend?\\nBest regards,\\nMarcusPinkman"
}`;

export async function generateCareerEmail(): Promise<emailJSON> {
  return callMlvoca(CAREER_PROMPT);
}