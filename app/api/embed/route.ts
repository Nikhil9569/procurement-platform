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
    const model = genAI.getGenerativeModel({ model:"gemini-embedding-2" });
    
    // Process embeddings in parallel (rate limits permitting)
    // For large catalogs, batching would be better, but we assume brochures are <100 products
    const embeddings = await Promise.all(
      texts.map(async (text) => {
        const result = await model.embedContent(text);
        return result.embedding.values;
      })
    );

    return NextResponse.json({ embeddings });
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Embedding error:", error?.message || error);
    return NextResponse.json({ error: error?.message ||"Embedding failed" }, { status: 500 });
  }
}
