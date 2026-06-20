import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const { texts, taskType } = await request.json();
  if (!Array.isArray(texts) || texts.length === 0) {
    return NextResponse.json({ error: "No texts provided" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    let textsToEmbed = texts;

    // Apply Query Expansion on search queries to broaden matches with synonyms and specifications
    if (taskType === "RETRIEVAL_QUERY" && texts.length === 1) {
      try {
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const expansionPrompt = 
          `You are a procurement search assistant. Expand the following single procurement search term or query into a comma-separated list of synonyms, specific model variations, alternative descriptions, and technical specifications of the EXACT same product type. Do NOT include related accessories or different product types (for example, if the query is about a laptop, do NOT include mouse, keyboard, monitor, printer, storage, or desktop; if the query is about a mouse, do NOT include mouse pads, wrist rests, or keyboards). This is for generating search embeddings, so do not include conversational text or headers. Just output the expanded list.\n\n` +
          `Query: "${texts[0]}"\n\n` +
          `Expanded List:`;
        
        const expansionResult = await modelFlash.generateContent(expansionPrompt);
        const expandedText = expansionResult.response.text().trim();
        if (expandedText) {
          console.log(`Expanded query "${texts[0]}" to: "${expandedText}"`);
          textsToEmbed = [expandedText];
        }
      } catch (err) {
        console.error("Query expansion failed, utilizing original query:", err);
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    
    // Process embeddings in a single batch request with custom task types
    const result = await model.batchEmbedContents({
      requests: textsToEmbed.map((text) => ({
        content: { role: "user", parts: [{ text }] },
        model: "models/gemini-embedding-2",
        ...(taskType ? { taskType } : {}),
      })),
    });
    const embeddings = result.embeddings.map((e) => e.values);

    return NextResponse.json({ embeddings });
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Embedding error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Embedding failed" }, { status: 500 });
  }
}
