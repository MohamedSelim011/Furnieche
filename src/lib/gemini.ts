import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-nano-banana-2.1";

const INSTRUCTIONS =
  "Edit this interior photo as requested below. Keep everything else exactly as it is: the same room, " +
  "layout, furniture, camera angle, perspective and lighting. Change only what is asked, and keep the " +
  "result photorealistic.\n\nRequested change: ";

export class ImageEditError extends Error {}

/** Applies a client's natural-language edit to a photo and returns the new image. */
export async function editPhoto(sourceUrl: string, prompt: string): Promise<{ data: Buffer; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ImageEditError("AI photo editing is not configured");

  const source = await fetch(sourceUrl);
  if (!source.ok) throw new ImageEditError("Couldn't load the original photo");
  const mimeType = (source.headers.get("content-type") ?? "image/jpeg").split(";")[0];
  if (!mimeType.startsWith("image/")) throw new ImageEditError("Only photos can be edited");
  const original = Buffer.from(await source.arrayBuffer());

  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model: MODEL,
    input: [
      { type: "text", text: INSTRUCTIONS + prompt },
      { type: "image", mime_type: mimeType, data: original.toString("base64") },
    ],
  });

  const image = interaction.output_image;
  if (!image?.data) {
    throw new ImageEditError("The AI couldn't produce an edited photo for that request. Try rephrasing it.");
  }
  return { data: Buffer.from(image.data, "base64"), mimeType: image.mime_type ?? "image/png" };
}
