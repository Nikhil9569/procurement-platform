import { GoogleGenerativeAI } from"@google/generative-ai";
import { createClient } from"@/lib/supabase/server";
import { NextResponse } from"next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const { texts } = await request.json();
  if (!Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ error:"No texts provided" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Not signed in" }, { status: 401 });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    
    // Process embeddings in a single batch request
    const result = await model.batchEmbedContents({
      requests: texts.map((text) => ({
        content: { role: "user", parts: [{ text }] },
        model: "models/gemini-embedding-2",
      })),
    });
    const embeddings = result.embeddings.map((e) => e.values);

    return NextResponse.json({ embeddings });
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Embedding error:", error?.message || error);
    return NextResponse.json({ error: error?.message ||"Embedding failed" }, { status: 500 });
  }
}
