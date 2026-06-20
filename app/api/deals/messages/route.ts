import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get("dealId");

  if (!dealId) {
    return NextResponse.json({ error: "Missing dealId parameter" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Verify the user is a participant of the deal
  const { data: rfq, error: rfqErr } = await supabase
    .from("rfq_history")
    .select("buyer_id, vendor_id")
    .eq("id", dealId)
    .single();

  if (rfqErr || !rfq) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (rfq.buyer_id !== user.id && rfq.vendor_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch messages
  const { data: messages, error: msgErr } = await supabase
    .from("deal_messages")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const { dealId, senderRole, messageText } = await request.json();

  if (!dealId || !senderRole || !messageText) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Verify user is a participant of the deal
  const { data: rfq, error: rfqErr } = await supabase
    .from("rfq_history")
    .select("buyer_id, vendor_id")
    .eq("id", dealId)
    .single();

  if (rfqErr || !rfq) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (rfq.buyer_id !== user.id && rfq.vendor_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Insert message
  const { data: newMessage, error: insertErr } = await supabase
    .from("deal_messages")
    .insert({
      deal_id: dealId,
      sender_role: senderRole,
      message_text: messageText,
    })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Update RFQ history timestamp
  await supabase
    .from("rfq_history")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", dealId);

  return NextResponse.json({ message: newMessage });
}
