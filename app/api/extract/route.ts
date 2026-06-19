import { GoogleGenerativeAI, SchemaType, Schema } from"@google/generative-ai";
import { createClient } from"@/lib/supabase/server";
import { NextResponse } from"next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const confidenceSchema: Schema = {
  type: SchemaType.STRING,
  description:"Confidence level of the extracted value: high, medium, or low",
  // Note: removing'enum' to avoid strict validation errors with Gemini SDK string enums, 
  // relying on the prompt to enforce"high","medium", or"low".
};

const schema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    products: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          product_name: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, confidence: confidenceSchema }, required: ["value","confidence"] },
          category: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, confidence: confidenceSchema }, required: ["value","confidence"] },
          price: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.NUMBER }, confidence: confidenceSchema }, required: ["value","confidence"] },
          warranty_months: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.NUMBER, nullable: true }, confidence: confidenceSchema }, required: ["value","confidence"] },
          delivery_days: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.NUMBER, nullable: true }, confidence: confidenceSchema }, required: ["value","confidence"] },
          moq: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.NUMBER, nullable: true }, confidence: confidenceSchema }, required: ["value","confidence"] },
          stock: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.NUMBER, nullable: true }, confidence: confidenceSchema }, required: ["value","confidence"] },
          rating: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.NUMBER, nullable: true }, confidence: confidenceSchema }, required: ["value","confidence"] },
        },
        required: ["product_name","category","price","warranty_months","delivery_days","moq","stock","rating"],
      },
    },
  },
  required: ["products"],
};

const getMimeType = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext ==='csv') return'text/csv';
  if (ext ==='png') return'image/png';
  if (ext ==='jpg' || ext ==='jpeg') return'image/jpeg';
  if (ext ==='webp') return'image/webp';
  return'application/pdf'; // fallback
};

export async function POST(request: Request) {
  const { path } = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Not signed in" }, { status: 401 });

  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error:"Unauthorized access to file path" }, { status: 403 });
  }

  const { data: fileData, error: dlErr } = await supabase.storage.from("brochures").download(path);
  if (dlErr || !fileData) {
    return NextResponse.json({ error:"Could not read file" }, { status: 400 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  if (buffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error:"File exceeds 10MB limit" }, { status: 400 });
  }

  const mime = getMimeType(path);
  const model = genAI.getGenerativeModel({
    model:"gemini-2.5-flash-lite",
    generationConfig: { responseMimeType:"application/json", responseSchema: schema },
  });

  const prompt =
"Extract the product catalogue from this brochure or file." +
"Classify each product into exactly ONE of these categories:" +
"Laptops, Desktops, Monitors, Keyboards, Mice, Storage, Networking, Accessories, Other." +
"Use'Other' only if none clearly fit." +
"Return only products actually present. If warranty, delivery time, MOQ, or rating" +
"is not stated, leave the value null. Ratings should be a number between 0 and 5." +
"Never invent values. Prices must be numbers only.";

  try {
    let result;
    if (mime ==='text/csv') {
      const textContent = buffer.toString('utf-8');
      result = await model.generateContent([
        { text: prompt },
        { text:"CSV Content:\n" + textContent }
      ]);
    } else {
      const base64 = buffer.toString("base64");
      result = await model.generateContent([
        { inlineData: { data: base64, mimeType: mime } },
        { text: prompt },
      ]);
    }

    const parsed = JSON.parse(result.response.text());
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Extraction error:", error?.message || error);
    return NextResponse.json({ error: error?.message ||"Extraction failed" }, { status: 500 });
  }
}