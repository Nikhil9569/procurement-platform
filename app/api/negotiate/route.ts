import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Case A: Legacy Sourcing Brief (Bullet Points)
  if (body.vendors && body.priority) {
    const { vendors, priority } = body;
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
You are an expert procurement negotiator.
The buyer's main priority is: ${priority}.
Here are the top vendors for the selected product:
${JSON.stringify(vendors, null, 2)}

Provide exactly 3 concise, highly actionable bullet points on how the buyer should negotiate with the top-ranked vendor to get a better deal. 
Cite weaknesses in the top vendor (e.g. slow delivery) or competitor strengths (e.g. Vendor B is cheaper) where applicable to create leverage.
CRITICAL: When referring to prices or savings, always use the Indian Rupee symbol "₹" or "INR". Do not use "$".
Return the result as JSON with a single key "bullets" containing an array of exactly 3 strings.
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
      return NextResponse.json(JSON.parse(cleanText));
    } catch (e: any) {
      console.error("Negotiation brief generation error:", e);
      return NextResponse.json({ error: "Failed to generate negotiation brief" }, { status: 500 });
    }
  }

  // Case B: Deal Room Active Negotiation AI Assistant & Chatbot
  if (body.dealId) {
    const { dealId, messageHistory, currentPrice, negotiatedPrice, quantity, productName, isBuyer } = body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    const myRole = isBuyer ? "buyer" : "vendor";
    const opponentRole = isBuyer ? "vendor" : "buyer";

    const prompt = `
You are acting as the opposing party in a procurement negotiation deal room.
Context:
- Product Name: "${productName}"
- Quantity requested: ${quantity} units
- Original Quote Price: ₹${currentPrice.toLocaleString()} per unit
- Current Negotiated Price: ${negotiatedPrice ? `₹${negotiatedPrice.toLocaleString()}` : "Not set"}
- Opposing Party Role: ${opponentRole} (You are acting as this role)
- Your Client Role: ${myRole} (You are chatting with this user)

Here is the conversation history:
${JSON.stringify(messageHistory, null, 2)}

Generate:
1. A realistic, professional reply message to the last message in the history.
   - If the last message proposed a new counter-offer price, negotiate or accept/counter it professionally.
   - Keep the reply concise (max 3 sentences).
2. A suggested counter-offer unit price (integer value in INR, e.g. close to the current price but with minor adjustments).
3. Exactly 1 or 2 relevant "risk audit flags" based on the chat or deal parameters (e.g., warranty gaps, logistics delays, or inventory limitations).

Return the response strictly as a JSON object with this structure:
{
  "replyText": "string",
  "suggestedPrice": number,
  "riskFlags": [
    {
      "type": "error" | "warning",
      "title": "string",
      "desc": "string"
    }
  ]
}
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanText);

      // Insert AI-generated opponent reply into the database deal_messages
      const { data: insertedMsg, error: insertErr } = await supabase
        .from("deal_messages")
        .insert({
          deal_id: dealId,
          sender_role: opponentRole,
          message_text: parsed.replyText
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("Failed to insert AI counterpart message:", insertErr);
      }

      return NextResponse.json({
        replyMessage: insertedMsg,
        suggestedPrice: parsed.suggestedPrice,
        riskFlags: parsed.riskFlags
      });
    } catch (e: any) {
      console.error("AI Deal Room generation error:", e);
      return NextResponse.json({ error: "Failed to process AI negotiation response" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
}
