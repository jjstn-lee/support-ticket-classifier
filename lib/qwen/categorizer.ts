import axios from 'axios';
import { readFile } from 'node:fs/promises';
export type Category = "usage" | "account" | "feedback" | "education | career";

const INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!;

function buildPrompt(subject: string, body: string) {
    return `
        You are an email classification assistant.

        Your task is to read the email subject and body, and classify the email into exactly one of the following categories:

        - "usage": Questions or issues about how to use the product, features, errors, bugs, or performance.
        - "account": Issues related to login, billing, subscriptions, account settings, or personal data.
        - "feedback": Suggestions, feature requests, opinions, compliments, or complaints not tied to a specific usage issue.
        - "education": Clarifying questions about course material or issues related to scheduling tests
        - "career": Issues related to job placement, career coaching, employers, etc.

        Instructions:
        - Choose the single best category.
        - Respond with ONLY the category name (no explanation).
        - Respond with plain text only. Do not use markdown, bullet points, headers, special characters, newline characters, or formatting of any kind.

        Email Subject:
        ${subject}

        Email Body:
        ${body}
    `;
}

interface NvidiaResponse {
  choices: { message: { content: string } }[];
}
 
export async function categorize(subject: string, body: string): Promise<string> {
  const response = await fetch(INVOKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.5-122b-a10b",
        messages: [{ role: "user", content: buildPrompt(subject, body) }],
        max_tokens: 16384,
        temperature: 0.6,
        top_p: 0.95,
        stream: false,
        chat_template_kwargs: { enable_thinking: true },
      }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA API error ${response.status}: ${errorText}`);
    }
  
    const data: NvidiaResponse = await response.json();
    return data.choices[0].message.content
      .trim()
      .replace(/[\n\r]+/g, '')           // newlines
      .replace(/[*_~`#>]+/g, '')          // markdown symbols
}