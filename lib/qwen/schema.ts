import { z } from "zod"

export const EmailSchema = z.object({

  sender: z.string().email(),

  Date: z
    .string()
    .min(1)
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),

  subject: z.string().min(1).max(998),

  // Require at least one of these
  "stripped-text": z.string().optional(),
  "body-plain": z.string().optional(),
})
.refine(
  (data) => data["stripped-text"] || data["body-plain"],
  {
    message: "Either 'stripped-text' or 'body-plain' must be provided",
    path: ["stripped-text"], // attaches error here
  }
)

export const NormalizedEmailSchema = EmailSchema.transform((data) => ({
  sender: data.sender,
  date: new Date(data.Date),
  subject: data.subject,
  body: data["stripped-text"] ?? data["body-plain"],
}))