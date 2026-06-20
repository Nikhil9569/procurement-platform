"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import VendorRating from "@/components/VendorRating";

type Message = {
  id: string;
  sender: "me" | "them" | "ai";
  text: string;
  timestamp: string;
};

type DealRoomProps = {
  dealId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  createdAt: string;
  priority: string;
  partyName: string;
  isBuyer: boolean;
  myCompanyName: string;
};

export default function DealRoom({
  dealId,
  productName,
  quantity,
  pricePerUnit,
  createdAt,
  priority,
  partyName,
  isBuyer,
  myCompanyName,
}: DealRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dealStage, setDealStage] = useState<"inquiry" | "proposal" | "negotiation" | "buyer_signed" | "vendor_signed" | "closed" | "cancelled">("negotiation");
  const hasISigned = isBuyer ? (dealStage === "buyer_signed") : (dealStage === "vendor_signed");
  const [pricePerUnitState, setPricePerUnitState] = useState<number>(pricePerUnit);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number | null>(null);
  const [proposalInput, setProposalInput] = useState<string>("");
  const [suggestedPrice, setSuggestedPrice] = useState<number>(Math.round(pricePerUnit * 0.95));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load and subscribe to database
  useEffect(() => {
    const supabase = createClient();

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/deals/messages?dealId=${dealId}`);
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const mapped = data.messages.map((msg: any) => {
            const isMe = isBuyer
              ? msg.sender_role === "buyer"
              : msg.sender_role === "vendor";
            const sender = msg.sender_role === "ai" ? "ai" : (isMe ? "me" : "them");
            return {
              id: msg.id,
              sender,
              text: msg.message_text,
              timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          });
          setMessages(mapped);
        } else {
          // Seed initial messages to DB
          const formattedDate = new Date(createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
          const initialMsgs = [
            {
              sender_role: "vendor",
              message_text: isBuyer 
                ? `Hello, thank you for awarding the contract to us. We have reserved the inventory for ${quantity.toLocaleString()} units of "${productName}".`
                : `Hello, we have awarded the contract to you. Let's align on delivery dates and final specifications for ${quantity.toLocaleString()} units of "${productName}".`,
            },
            {
              sender_role: "buyer",
              message_text: isBuyer
                ? `Thanks for the prompt response. Regarding the unit price of ₹${pricePerUnit.toLocaleString()}, we wanted to discuss if there is room for a volume discount since this is classified as a ${priority.replace("_","")} request.`
                : `Thank you for choosing us! We're preparing the draft. Our standard lead time is set, but we can fast-track the shipment if required. Let's discuss pricing adjustments for this volume.`,
            },
            {
              sender_role: "vendor",
              message_text: isBuyer
                ? `We understand. Our margins are tight for "${productName}", but since your shipping timeline is flexible, we can offer a 3.5% discount if we ship via consolidated sea freight.`
                : `Consolidated freight sounds interesting. Can you outline the exact warranty coverage if we lock in this price?`,
            }
          ];
          
          const seeded: Message[] = [];
          for (const msg of initialMsgs) {
            const resInsert = await fetch(`/api/deals/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dealId,
                senderRole: msg.sender_role,
                messageText: msg.message_text,
              }),
            });
            const inserted = await resInsert.json();
            if (inserted.message) {
              const isMe = isBuyer
                ? inserted.message.sender_role === "buyer"
                : inserted.message.sender_role === "vendor";
              const sender = inserted.message.sender_role === "ai" ? "ai" : (isMe ? "me" : "them");
              seeded.push({
                id: inserted.message.id,
                sender,
                text: inserted.message.message_text,
                timestamp: new Date(inserted.message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }
          }
          setMessages(seeded);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    const loadDealData = async () => {
      const { data: rfq, error: rfqErr } = await supabase
        .from("rfq_history")
        .select("price_per_unit, negotiated_price, status, feedback_notes")
        .eq("id", dealId)
        .single();
        
      if (!rfqErr && rfq) {
        setPricePerUnitState(Number(rfq.price_per_unit));
        setNegotiatedPrice(rfq.negotiated_price ? Number(rfq.negotiated_price) : null);
        
        let stage = rfq.status;
        if (rfq.feedback_notes && rfq.feedback_notes.startsWith("SIG_STATE:")) {
          const stateStr = rfq.feedback_notes.replace("SIG_STATE:", "");
          if (stateStr === "cancelled" || stateStr === "buyer_signed" || stateStr === "vendor_signed") {
            stage = stateStr;
          }
        }
        setDealStage((stage as any) || "negotiation");
      }

      await fetchMessages();
      
      // Also load initial AI assistant recommendations once messages are loaded
      try {
        const res = await fetch("/api/negotiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId,
            messageHistory: [],
            currentPrice: pricePerUnit,
            negotiatedPrice: rfq?.negotiated_price ? Number(rfq.negotiated_price) : null,
            quantity,
            productName,
            isBuyer,
          }),
        });
        const data = await res.json();
        if (data.suggestedPrice) setSuggestedPrice(data.suggestedPrice);
      } catch (e) {
        console.error("AI initial suggestions load error:", e);
      }
    };

    loadDealData();

    // Subscribe to messages changes
    const msgChannel = supabase
      .channel(`deal-messages-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deal_messages",
          filter: `deal_id=eq.${dealId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            // Remove any temporary messages with the same text to prevent double rendering
            const filtered = prev.filter(
              (m) => !(m.id.startsWith("temp-") && m.text === newMsg.message_text)
            );
            if (filtered.some((m) => m.id === newMsg.id)) return filtered;
            const isMe = isBuyer
              ? newMsg.sender_role === "buyer"
              : newMsg.sender_role === "vendor";
            const sender = newMsg.sender_role === "ai" ? "ai" : (isMe ? "me" : "them");
            return [
              ...filtered,
              {
                id: newMsg.id,
                sender,
                text: newMsg.message_text,
                timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
          });
        }
      )
      .subscribe();

    // Subscribe to RFQ history changes (pricing/status updates)
    const rfqChannel = supabase
      .channel(`rfq-history-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rfq_history",
          filter: `id=eq.${dealId}`,
        },
        (payload) => {
          const updatedRfq = payload.new as any;
          setPricePerUnitState(Number(updatedRfq.price_per_unit));
          setNegotiatedPrice(updatedRfq.negotiated_price ? Number(updatedRfq.negotiated_price) : null);
          
          let stage = updatedRfq.status;
          if (updatedRfq.feedback_notes && updatedRfq.feedback_notes.startsWith("SIG_STATE:")) {
            const stateStr = updatedRfq.feedback_notes.replace("SIG_STATE:", "");
            if (stateStr === "cancelled" || stateStr === "buyer_signed" || stateStr === "vendor_signed") {
              stage = stateStr;
            }
          }
          setDealStage((stage as any) || "negotiation");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(rfqChannel);
    };
  }, [dealId, isBuyer, createdAt, quantity, productName, pricePerUnit, priority]);

  // Scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, isTyping]);

  const triggerAINegotiation = async (latestNegotiatedPrice?: number | null, latestUserMsg?: string) => {
    setIsTyping(true);
    
    const history = messages.map(m => ({
      sender_role: m.sender === "me" ? (isBuyer ? "buyer" : "vendor") : m.sender === "them" ? (isBuyer ? "vendor" : "buyer") : "ai",
      message_text: m.text
    }));
    
    if (latestUserMsg) {
      history.push({
        sender_role: isBuyer ? "buyer" : "vendor",
        message_text: latestUserMsg
      });
    }

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          messageHistory: history,
          currentPrice: pricePerUnit,
          negotiatedPrice: latestNegotiatedPrice !== undefined ? latestNegotiatedPrice : negotiatedPrice,
          quantity,
          productName,
          isBuyer,
        }),
      });

      const data = await res.json();
      setIsTyping(false);
      
      if (data.suggestedPrice) {
        setSuggestedPrice(data.suggestedPrice);
      }
    } catch (err) {
      console.error("Error in AI negotiation:", err);
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText("");

    // Append temporary message instantly for quick visual feedback
    const tempId = `temp-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      sender: "me",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);

    const senderRole = isBuyer ? "buyer" : "vendor";

    // 1. Post user message to DB
    const res = await fetch(`/api/deals/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        senderRole,
        messageText: textToSend,
      }),
    });

    const data = await res.json();
    if (!data.message) {
      console.error("Failed to send message:", data.error);
      return;
    }

    // 2. Trigger AI counterpart reply & analysis
    await triggerAINegotiation(negotiatedPrice, textToSend);
  };

  const handleProposePrice = async () => {
    const priceVal = parseFloat(proposalInput);
    if (isNaN(priceVal) || priceVal <= 0) return;

    const supabase = createClient();
    
    // 1. Update negotiated_price in RFQ
    const { error: rfqErr } = await supabase
      .from("rfq_history")
      .update({ negotiated_price: priceVal })
      .eq("id", dealId);

    if (rfqErr) {
      console.error("Error proposing price:", rfqErr);
      return;
    }

    // 2. Insert message to chat
    const senderRole = isBuyer ? "buyer" : "vendor";
    const proposalMsg = `PROPOSAL: Proposing a revised contract price of ₹${priceVal.toLocaleString()} per unit.`;
    
    await fetch(`/api/deals/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        senderRole,
        messageText: proposalMsg,
      }),
    });

    setProposalInput("");
    
    // Trigger AI counterpart
    await triggerAINegotiation(priceVal, proposalMsg);
  };

  const handleAcceptBid = async () => {
    if (negotiatedPrice === null) return;
    
    const supabase = createClient();
    
    // Calculate savings: (initial price - final negotiated price) * quantity (guaranteed to be >= 0)
    const calculatedSavings = Math.max(0, (pricePerUnit - negotiatedPrice) * quantity);
    
    // 1. Update price_per_unit and saved_amount in RFQ history
    const { error: rfqErr } = await supabase
      .from("rfq_history")
      .update({
        price_per_unit: negotiatedPrice,
        saved_amount: calculatedSavings,
        negotiated_price: null
      })
      .eq("id", dealId);

    if (rfqErr) {
      console.error("Error accepting bid:", rfqErr);
      return;
    }

    // 2. Insert system/AI confirmation message to chat
    const acceptMsg = `✓ Price proposal of ₹${negotiatedPrice.toLocaleString()} per unit accepted. Contract unit price updated.`;
    await fetch(`/api/deals/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        senderRole: "ai",
        messageText: acceptMsg,
      }),
    });
    
    setPricePerUnitState(negotiatedPrice);
    setNegotiatedPrice(null);
  };

  const handleDeclineBid = async () => {
    if (negotiatedPrice === null) return;
    
    const supabase = createClient();
    
    // 1. Reset negotiated_price in RFQ history
    const { error: rfqErr } = await supabase
      .from("rfq_history")
      .update({
        negotiated_price: null
      })
      .eq("id", dealId);

    if (rfqErr) {
      console.error("Error declining bid:", rfqErr);
      return;
    }

    // 2. Insert decline message to chat
    const declineMsg = `Declined the price proposal of ₹${negotiatedPrice.toLocaleString()} per unit.`;
    await fetch(`/api/deals/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        senderRole: isBuyer ? "buyer" : "vendor",
        messageText: declineMsg,
      }),
    });
    
    setNegotiatedPrice(null);
  };

  const handleSignDeal = async () => {
    const supabase = createClient();
    let newStatus: "buyer_signed" | "vendor_signed" | "closed" = "closed";
    if (isBuyer) {
      newStatus = dealStage === "vendor_signed" ? "closed" : "buyer_signed";
    } else {
      newStatus = dealStage === "buyer_signed" ? "closed" : "vendor_signed";
    }

    // Map to check constraint compliant database fields
    const dbStatus = newStatus === "closed" ? "closed" : "negotiation";
    const dbFeedbackNotes = newStatus === "closed" ? null : `SIG_STATE:${newStatus}`;

    const { error: rfqErr } = await supabase
      .from("rfq_history")
      .update({ status: dbStatus, feedback_notes: dbFeedbackNotes })
      .eq("id", dealId);

    if (rfqErr) {
      console.error("Error signing deal:", rfqErr);
      return;
    }

    const signerName = isBuyer ? "Buyer (Client)" : "Vendor (Supplier Partner)";
    let msgText = `✓ ${signerName} has signed the deal proposal.`;
    if (newStatus === "closed") {
      msgText += " Both parties have signed. Deal finalized and locked. Sourcing contract generated.";
    } else {
      msgText += " Awaiting counterparty signature to finalize.";
    }

    await fetch(`/api/deals/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        senderRole: "ai",
        messageText: msgText,
      }),
    });

    setDealStage(newStatus);
  };

  const handleCancelDeal = async () => {
    const supabase = createClient();
    const { error: rfqErr } = await supabase
      .from("rfq_history")
      .update({ status: "negotiation", feedback_notes: "SIG_STATE:cancelled" })
      .eq("id", dealId);

    if (rfqErr) {
      console.error("Error cancelling deal:", rfqErr);
      return;
    }

    const cancellerName = isBuyer ? "Buyer (Client)" : "Vendor (Supplier Partner)";
    await fetch(`/api/deals/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        senderRole: "ai",
        messageText: `✕ Negotiation cancelled by ${cancellerName}. This deal room is now closed and locked.`,
      }),
    });

    setDealStage("cancelled");
  };

  const adoptOffer = (amount: number) => {
    setInputText(isBuyer
      ?`We would like to propose a counter-offer at a unit price of ₹${amount.toLocaleString()}. Let us know if this aligns with your supply constraints.`
      :`Based on your request, we can adjust the quote to a unit price of ₹${amount.toLocaleString()} for this order volume.`
    );
  };

  const stages = ["inquiry", "proposal", "negotiation", "closed"];
  const stageLabels: Record<string, string> = {
    inquiry: "Inquiry",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed: "Closed"
  };

  const marketAvg = Math.round(pricePerUnitState * 1.03);

  // Check if last proposal message was from the opposing party
  const lastProposalMsg = [...messages].reverse().find(m => m.text.startsWith("PROPOSAL:"));
  const isProposalFromThem = lastProposalMsg && lastProposalMsg.sender === "them";

  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard/deals" 
          className="text-xs font-bold text-[#6B7280] hover:text-[#0F1E3C] transition-colors cursor-pointer"
        >
          &larr; Back to Deals List
        </Link>
        {dealStage === "closed" ? (
          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-fade-in select-none">
            <span>✓</span> Signed & Finalized
          </span>
        ) : dealStage === "cancelled" ? (
          <span className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-fade-in select-none">
            <span>✕</span> Negotiation Cancelled
          </span>
        ) : hasISigned ? (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold rounded-lg select-none">
              ✓ Signed (Awaiting counterparty)
            </span>
            <button
              onClick={handleCancelDeal}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel Negotiation
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 animate-fade-in">
            <button
              onClick={handleCancelDeal}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-600 rounded-lg transition-colors cursor-pointer"
            >
              Reject & Cancel
            </button>
            <button
              onClick={handleSignDeal}
              className="px-4 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-xs font-bold text-white rounded-lg transition-colors cursor-pointer"
            >
              {((isBuyer && dealStage === "vendor_signed") || (!isBuyer && dealStage === "buyer_signed")) 
                ? "Counter-Sign & Finalize ✓" 
                : "Sign & Finalize Deal ✓"}
            </button>
          </div>
        )}
      </div>

      {/* 4-Step Timeline Stepper */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_4px_20px_rgb(15,30,60,0.01)]">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {stages.map((stg, idx) => {
            const currentStageEquivalent = 
              (dealStage === "buyer_signed" || dealStage === "vendor_signed" || dealStage === "cancelled") 
                ? "negotiation" 
                : dealStage;
            const isCompleted = stages.indexOf(currentStageEquivalent) >= idx;
            const isActive = currentStageEquivalent === stg;
            return (
              <div key={stg} className="flex-1 flex items-center relative">
                <div className="flex flex-col items-center z-10">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border
                    ${isCompleted ?"bg-[#0F1E3C] text-white border-[#0F1E3C]" :"bg-neutral-50 text-neutral-400 border-neutral-200"}
                    ${isActive ?"ring-4 ring-[#E8A838]/20 border-[#E8A838]" :""}
`}>
                    {isCompleted ?"✓" : idx + 1}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${isActive ?"text-[#E8A838]" : isCompleted ?"text-[#0F1E3C]" :"text-neutral-400"}`}>
                    {stageLabels[stg]}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`absolute left-4 top-4 right-0 -translate-y-1/2 h-[2px] z-0
                    ${stages.indexOf(currentStageEquivalent) > idx ?"bg-[#0F1E3C]" :"bg-neutral-200"}
`} style={{ width:"calc(100% - 32px)", marginLeft:"24px" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch min-h-[500px]">
        
        {/* Left Panel: Chat Interface */}
        <div className="lg:col-span-8 flex flex-col bg-white border border-neutral-200 rounded-2xl shadow-[0_4px_25px_rgb(15,30,60,0.01)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 bg-[#faf8f5]/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#0F1E3C]/5 text-[#0F1E3C] flex items-center justify-center font-bold text-xs uppercase">
                {partyName.slice(0, 2)}
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-[#0F1E3C]">{partyName}</h3>
                <p className="text-[10px] text-[#6B7280]">Room ID: {dealId.slice(0, 8)}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[#0F1E3C]">{productName}</span>
              <p className="text-[10px] text-[#6B7280]  mt-0.5">{quantity} units @ ₹{pricePerUnitState.toLocaleString()}</p>
            </div>
          </div>

          {/* Active Proposal Banner */}
          {negotiatedPrice !== null && dealStage !== "closed" && dealStage !== "cancelled" && (
            <div className={`p-4 border-b transition-colors flex items-center justify-between gap-4
              ${isProposalFromThem 
                ? "bg-amber-50 border-amber-200 text-amber-900" 
                : "bg-neutral-50 border-neutral-200 text-neutral-600"}`}>
              <div className="flex items-center gap-2">
                <span className="text-base">🤝</span>
                <div className="text-xs text-left">
                  {isProposalFromThem ? (
                    <p className="font-semibold">
                      {partyName} proposed a counter-offer of <span className="font-bold text-[#0F1E3C]">₹{negotiatedPrice.toLocaleString()}</span> per unit.
                    </p>
                  ) : (
                    <p className="font-medium text-neutral-500">
                      You proposed a counter-offer of <span className="font-bold text-neutral-900">₹{negotiatedPrice.toLocaleString()}</span> per unit. Waiting for response...
                    </p>
                  )}
                </div>
              </div>
              {isProposalFromThem && (
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptBid}
                    className="px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-[10px] font-bold text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Accept Bid
                  </button>
                  <button
                    onClick={handleDeclineBid}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-[10px] font-bold text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Decline Bid
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chat Bubble Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[360px] min-h-[300px] bg-[#faf8f5]/20">
            {messages.map((msg) => {
              if (msg.sender ==="ai") {
                return (
                  <div key={msg.id} className="mx-auto w-fit max-w-md rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center text-xs font-semibold text-emerald-800 animate-fade-in">
                    {msg.text}
                  </div>
                );
              }
              const isMe = msg.sender ==="me";
              return (
                <div key={msg.id} className={`flex ${isMe ?"justify-end" :"justify-start"} animate-fade-in`}>
                  <div className={`max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm text-left
                    ${isMe 
                      ?"bg-[#0F1E3C] text-white rounded-tr-none" 
                      :"bg-white border border-neutral-200 text-[#0F1E3C] rounded-tl-none"}`}>
                    <p className="font-medium">{msg.text}</p>
                    <span className={`block text-[9px] mt-1.5 text-right 
                      ${isMe ?"text-neutral-400" :"text-[#6B7280]"}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-neutral-400 flex items-center gap-1 shadow-sm">
                  <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay:"0ms" }} />
                  <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay:"150ms" }} />
                  <span className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay:"300ms" }} />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Proposal Input Bar */}
          {(dealStage !== "closed" && dealStage !== "cancelled" && dealStage !== "buyer_signed" && dealStage !== "vendor_signed") && (
            <div className="px-4 py-2 bg-[#faf8f5] border-t border-neutral-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase">Propose Price:</span>
                <div className="relative rounded-lg border border-neutral-300 bg-white px-2 py-1 flex items-center">
                  <span className="text-xs text-neutral-500 mr-1">₹</span>
                  <input
                    type="number"
                    value={proposalInput}
                    onChange={(e) => setProposalInput(e.target.value)}
                    placeholder="New Price"
                    className="w-24 text-xs font-bold outline-none text-[#111827]"
                  />
                </div>
              </div>
              <button
                onClick={handleProposePrice}
                className="px-3 py-1.5 bg-[#E8A838] hover:bg-[#D9962C] text-[10px] font-bold text-white rounded-lg transition-colors cursor-pointer"
              >
                Submit Proposal
              </button>
            </div>
          )}

          {/* Footer Input Area */}
          {dealStage === "closed" ? (
            <div className="flex flex-col">
              <div className="p-4 border-t border-neutral-200 bg-emerald-50/50 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2 select-none animate-fade-in">
                <span>🔒</span> This negotiation is finalized and locked. Sourcing contract has been signed.
              </div>
              {isBuyer && (
                <div className="p-6 border-t border-neutral-200 bg-white">
                  <VendorRating dealId={dealId} />
                </div>
              )}
            </div>
          ) : dealStage === "cancelled" ? (
            <div className="flex flex-col">
              <div className="p-4 border-t border-neutral-200 bg-red-50/50 text-center text-xs font-bold text-red-800 flex items-center justify-center gap-2 select-none animate-fade-in">
                <span>❌</span> This negotiation has been cancelled and locked.
              </div>
              {isBuyer && (
                <div className="p-6 border-t border-neutral-200 bg-white">
                  <VendorRating dealId={dealId} />
                </div>
              )}
            </div>
          ) : (dealStage === "buyer_signed" || dealStage === "vendor_signed") ? (
            hasISigned ? (
              <div className="p-4 border-t border-neutral-200 bg-purple-50/50 text-center text-xs font-bold text-purple-800 flex items-center justify-center gap-2 select-none animate-fade-in">
                <span>🔒</span> You have signed this proposal. Waiting for counterparty to sign or reject.
              </div>
            ) : (
              <div className="p-4 border-t border-neutral-200 bg-indigo-50/50 text-center text-xs font-bold text-indigo-800 flex items-center justify-center gap-2 select-none animate-fade-in">
                <span>🔒</span> Counterparty has signed. Please Counter-Sign to finalize or click Reject to cancel.
              </div>
            )
          ) : (
            <div className="p-4 border-t border-neutral-200 bg-white flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key ==="Enter" && handleSend()}
                placeholder="Draft contract revisions or request parameters updates..."
                className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-xs outline-none focus:border-[#0F1E3C] transition-all text-[#111827]"
              />
              <button
                onClick={handleSend}
                className="px-5 py-3 bg-[#0F1E3C] hover:bg-[#1A315C] text-xs font-bold text-white rounded-xl transition-all cursor-pointer shrink-0"
              >
                Send
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: AI Suggestions */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-2xl shadow-[0_4px_25px_rgb(15,30,60,0.01)] p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-neutral-100">
              <span className="text-lg">✨</span>
              <h3 className="text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">AI Negotiator Assistant</h3>
            </div>

            {/* Suggested Counter-Offer */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Suggested Counter-Offer</span>
              <div className="flex justify-between items-center bg-[#faf8f5] border border-neutral-200 rounded-xl p-3.5 text-left">
                <div>
                  <span className="text-sm font-bold text-[#0F1E3C]">₹{suggestedPrice.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded ml-2">
                    {suggestedPrice < pricePerUnitState ? `-${Math.round((1 - suggestedPrice / pricePerUnitState) * 100)}%` : `+${Math.round((suggestedPrice / pricePerUnitState - 1) * 100)}%`}
                  </span>
                  <p className="text-[10px] text-[#6B7280] mt-1.5 leading-relaxed">Optimal pricing recommendation based on benchmark datasets.</p>
                </div>
                {(dealStage !== "closed" && dealStage !== "cancelled" && dealStage !== "buyer_signed" && dealStage !== "vendor_signed") && (
                  <button
                    onClick={() => adoptOffer(suggestedPrice)}
                    className="px-2.5 py-1.5 bg-[#0F1E3C]/5 hover:bg-[#0F1E3C] hover:text-white border border-[#0F1E3C]/10 text-[10px] font-bold text-[#0F1E3C] rounded-lg transition-all cursor-pointer"
                  >
                    Adopt
                  </button>
                )}
              </div>
            </div>

            {/* Market Rate comparison */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Estimated Market Rate</span>
              <div className="bg-[#faf8f5]/50 border border-neutral-200/60 rounded-xl p-3.5 space-y-1 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280]">Market Average</span>
                  <span className="font-bold text-[#0F1E3C]">₹{marketAvg.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280]">Price Deviation</span>
                  <span className="font-bold text-emerald-700">-{Math.round(((marketAvg - pricePerUnitState) / marketAvg) * 100)}% Lower</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
