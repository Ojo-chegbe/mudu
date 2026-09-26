import * as mammoth from "mammoth";
declare const require: any;
const pdfParse = require("pdf-parse");
import { CryptoHasher } from "bun";

export type SupportedMimeType =
  | "text/plain"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/msword";

export async function extractText(file: File): Promise<string> {
  const mime = file.type as SupportedMimeType;

  // Max 5MB file limit
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File exceeds the 5MB size limit.");
  }

  if (mime === "text/plain") {
    return await file.text();
  }

  if (mime === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword" ||
    file.name.endsWith(".docx")
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mime || file.name}`);
}

export function generateTextHash(text: string): string {
  return new CryptoHasher("sha256").update(text).digest("hex");
}
