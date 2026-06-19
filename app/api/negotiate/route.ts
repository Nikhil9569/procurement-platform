import { GoogleGenerativeAI } from"@google/generative-ai";
import { createClient } from"@/lib/supabase/server";
import { NextResponse } from"next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const { vendors, priority } = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Not signed in" }, { status: 401 });

  const model = genAI.getGenerativeModel({
    model:"gemini-2.5-flash-lite", // Consistently using the requested version
    generationConfig: { responseMimeType:"application/json" },
  });

  const prompt =`
You are an expert procurement negotiator.
The buyer's main priority is: ${priority}.
Here are the top vendors for the selected product:
${JSON.stringify(vendors, null, 2)}

Provide exactly 3 concise, highly actionable bullet points on how the buyer should negotiate with the top-ranked vendor to get a better deal. 
Cite weaknesses in the top vendor (e.g. slow delivery) or competitor strengths (e.g. Vendor B is cheaper) where applicable to create leverage.
CRITICAL: When referring to prices or savings, always use the Indian Rupee symbol"₹" or"INR". Do not use"$".
Return the result as JSON with a single key"bullets" containing an array of exactly 3 strings.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json\n?|\n?```/g,"").trim();
    const parsed = JSON.parse(cleanText);
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Negotiation generation error:", error?.message || error);
    return NextResponse.json({ error:"Failed to generate negotiation brief" }, { status: 500 });
  }
}
