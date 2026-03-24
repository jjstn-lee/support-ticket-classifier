import { NormalizedEmailSchema } from "../qwen/schema";

export interface emailJSON {
    sender: string,
    date: Date,
    subject: string,
    body: string,
}