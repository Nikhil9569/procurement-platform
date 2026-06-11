import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const confidenceSchema: Schema = {
  type: SchemaType.STRING,
  description: "Confidence level of the extracted value: high, medium, or low",
  enum: ["high", "medium", "low"],
};

const makeField = (type: SchemaType, nullable = false): Schema => ({
  type: SchemaType.OBJECT,
  properties: {
    value: { type, nullable },
    confidence: confidenceSchema,
  },
  required: ["value", "confidence"],
});

const schema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    products: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          product_name: makeField(SchemaType.STRING),
          category: makeField(SchemaType.STRING),
          price: makeField(SchemaType.NUMBER),
          warranty_months: makeField(SchemaType.NUMBER, true),
          delivery_days: makeField(SchemaType.NUMBER, true),
          moq: makeField(SchemaType.NUMBER, true),
          stock: makeField(SchemaType.NUMBER, true),
        },
        required: ["product_name", "category", "price", "warranty_months", "delivery_days", "moq", "stock"],
      },
    },
  },
  required: ["products"],
};

const getMimeType = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return 'text/csv';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'application/pdf'; // fallback
};

export async function POST(request: Request) {
  const { path } = await request.json();
  const supabase = await createClient();

  // confirm the user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // validate path belongs to user
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Unauthorized access to file path" }, { status: 403 });
  }

  // download the brochure from storage
  const { data: fileData, error: dlErr } = await supabase
    .storage.from("brochures").download(path);
  if (dlErr || !fileData) {
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  if (buffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const base64 = buffer.toString("base64");
  const mime = getMimeType(path);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite", // Explicitly keeping version as requested
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  });

  const prompt =
    "Extract the product catalogue from this brochure. " +
    "Classify each product into exactly ONE of these categories: " +
    "Laptops, Desktops, Monitors, Keyboards, Mice, Storage, Networking, Accessories, Other. " +
    "Use 'Other' only if none clearly fit. " +
    "Return only products actually present. If warranty, delivery time, or MOQ " +
    "is not stated, leave the value null. Never invent values. Prices must be numbers only.";

  try {
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: mime } },
      { text: prompt },
    ]);
    const parsed = JSON.parse(result.response.text());
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Extraction error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Extraction failed" }, { status: 500 });
  }
}