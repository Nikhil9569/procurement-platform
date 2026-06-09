import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    products: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          product_name: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          price: { type: SchemaType.NUMBER },
          warranty_months: { type: SchemaType.NUMBER, nullable: true },
          delivery_days: { type: SchemaType.NUMBER, nullable: true },
          moq: { type: SchemaType.NUMBER, nullable: true },
        },
        required: ["product_name","category","price"],
      },
    },
  },
  required: ["products"],
};

export async function POST(request: Request) {
  const { path } = await request.json();
  const supabase = await createClient();

  // confirm the user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // download the brochure from storage
  const { data: fileData, error: dlErr } = await supabase
    .storage.from("brochures").download(path);
  if (dlErr || !fileData) {
    return NextResponse.json({ error: "Could not read file" }, { status: 400 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mime = fileData.type || "application/pdf";

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: { responseMimeType: "application/json", responseSchema: schema as any },
  });

const prompt =
    "Extract the product catalogue from this brochure. " +
    "Classify each product into exactly ONE of these categories: " +
    "Laptops, Desktops, Monitors, Keyboards, Mice, Storage, Networking, Accessories, Other. " +
    "Use 'Other' only if none clearly fit. " +
    "Return only products actually present. If warranty, delivery time, or MOQ " +
    "is not stated, leave it null. Never invent values. Prices must be numbers only.";

  try {
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: mime } },
      { text: prompt },
    ]);
    const parsed = JSON.parse(result.response.text());
    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error("Extraction error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Extraction failed" }, { status: 500 });
  }
}