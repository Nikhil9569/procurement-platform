import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const schema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    matchingIds: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.NUMBER },
      description: "List of product IDs that are a good match for the user query."
    }
  },
  required: ["matchingIds"]
};

export async function POST(request: Request) {
  try {
    const { query, items } = await request.json();
    
    if (!query || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ matchingIds: [] });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json", responseSchema: schema }
    });

    const prompt = 
      `You are a procurement assistant. Filter the following list of products to keep ONLY those that are a good, specific match for the user's search query.\n\n` +
      `User Query: "${query}"\n\n` +
      `Products:\n` +
      items.map(item => `- ID: ${item.id}, Name: ${item.product_name}, Category: ${item.category}, Price: ${item.price}`).join('\n') +
      `\n\nReturn only the IDs of products that fit the query description. For example, if the query is "gaming laptops", filter out business, budget, or productivity laptops (like ThinkPads or ZenBooks) that are not designed for gaming.`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("Filter API error:", e);
    // If it fails, fallback to returning empty or raw list so it's robust
    return NextResponse.json({ error: "Filtering failed" }, { status: 500 });
  }
}
