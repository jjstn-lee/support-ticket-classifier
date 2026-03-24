import { NormalizedEmailSchema } from "../qwen/schema";

export interface emailJSON {
    sender: string,
    subject: string,
    body: string,
}