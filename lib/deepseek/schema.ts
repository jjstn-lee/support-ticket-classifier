import { z } from "zod"

const MAX_CHARS = 10000

const THIRD_PERSON_PRONOUNS = /\b(he|she|they|his|her|their|him|them|it)\b/i

const hasPlaceholders = (val: string) => /\[.*?\]/.test(val)

export const EmailSchema = z.object({
  sender: z.string().email(),
  subject: z.string().min(1).max(998),
  "stripped-text": z.string().optional(),
  "body-plain": z.string().optional(),
})
  .refine(
    (data) => data["stripped-text"] || data["body-plain"],
    {
      message: "Either 'stripped-text' or 'body-plain' must be provided",
      path: ["stripped-text"],
    }
  )
  // Case 1: Too many characters
  .refine(
    (data) => data.subject.length <= MAX_CHARS,
    { message: `Subject exceeds ${MAX_CHARS} characters`, path: ["subject"] }
  )
  .refine(
    (data) => {
      const body = data["stripped-text"] ?? data["body-plain"] ?? ""
      return body.length <= MAX_CHARS
    },
    { message: `Body exceeds ${MAX_CHARS} characters`, path: ["body-plain"] }
  )
  // Case 2: Placeholders like [Name] or [Date]
  .refine(
    (data) => !hasPlaceholders(data.subject),
    { message: "Subject contains unfilled placeholders (e.g. [Name])", path: ["subject"] }
  )
  .refine(
    (data) => {
      const body = data["stripped-text"] ?? data["body-plain"] ?? ""
      return !hasPlaceholders(body)
    },
    { message: "Body contains unfilled placeholders (e.g. [Name])", path: ["body-plain"] }
  )
  // Case 3: Third-person pronouns in subject
  .refine(
    (data) => !THIRD_PERSON_PRONOUNS.test(data.subject),
    { message: "Subject appears to be written in third person", path: ["subject"] }
  )
  // third-person pronouns in body
  // .refine(
  //   (data) => {
  //     const body = data["stripped-text"] ?? data["body-plain"] ?? ""
  //     return !THIRD_PERSON_PRONOUNS.test(body)
  //   },
  //   { message: "Body appears to be written in third person", path: ["body-plain"] }
  // )
  // Sender email validation
  .refine(
    (data) => !/\b(emerge|career)\b/i.test(data.sender),
    { message: "Sender email may not contain 'emerge' or 'career'", path: ["sender"] }
  )

export const NormalizedEmailSchema = EmailSchema.transform((data) => ({
  sender: data.sender,
  subject: data.subject,
  body: data["stripped-text"] ?? data["body-plain"],
}))