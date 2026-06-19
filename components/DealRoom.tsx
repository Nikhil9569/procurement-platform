"use client";

import { useState, useEffect, useRef } from"react";
import Link from"next/link";

type Message = {
  id: string;
  sender:"me" |"them" |"ai";
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
  const [dealStage, setDealStage] = useState<"Inquiry" |"Proposal" |"Negotiation" |"Closed">("Negotiation");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize realistic mock messages
  useEffect(() => {
    const formattedDate = new Date(createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const initialMsgs: Message[] = [
      {
        id:"1",
        sender:"them",
        text: isBuyer 
          ?`Hello, thank you for awarding the contract to us. We have reserved the inventory for ${quantity.toLocaleString()} units of"${productName}".`
          :`Hello, we have awarded the contract to you. Let's align on delivery dates and final specifications for ${quantity.toLocaleString()} units of"${productName}".`,
        timestamp: formattedDate
      },
      {
        id:"2",
        sender:"me",
        text: isBuyer
          ?`Thanks for the prompt response. Regarding the unit price of ₹${pricePerUnit.toLocaleString()}, we wanted to discuss if there is room for a volume discount since this is classified as a ${priority.replace("_","")} request.`
          :`Thank you for choosing us! We're preparing the draft. Our standard lead time is set, but we can fast-track the shipment if required. Let's discuss pricing adjustments for this volume.`,
        timestamp: formattedDate
      },
      {
        id:"3",
        sender:"them",
        text: isBuyer
          ?`We understand. Our margins are tight for"${productName}", but since your shipping timeline is flexible, we can offer a 3.5% discount if we ship via consolidated sea freight.`
          :`Consolidated freight sounds interesting. Can you outline the exact warranty coverage if we lock in this price?`,
        timestamp: formattedDate
      }
    ];
    setMessages(initialMsgs);
  }, [createdAt, productName, quantity, pricePerUnit, priority, isBuyer]);

  // Scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      sender:"me",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setIsTyping(true);

    // Simulate realistic partner reply
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender:"them",
        text: isBuyer 
          ?"That sounds reasonable. I will check with our financial compliance lead to get the updated terms approved and send the final contract draft."
          :"Understood. I will revise our billing cycle parameters and update the purchase order structure to reflect these pricing tiers.",
        timestamp: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
      };
      setMessages(prev => [...prev, replyMsg]);
    }, 2500);
  };

  // AI-Assisted actions: pre-fill input
  const adoptOffer = (amount: number) => {
    setInputText(isBuyer
      ?`We would like to propose a counter-offer at a unit price of ₹${amount.toLocaleString()}. Let us know if this aligns with your supply constraints.`
      :`Based on your request, we can adjust the quote to a unit price of ₹${amount.toLocaleString()} for this order volume.`
    );
  };

  const handleCloseDeal = () => {
    setDealStage("Closed");
    const closingMsg: Message = {
      id: Date.now().toString(),
      sender:"ai",
      text:"✓ Deal finalized and locked. Sourcing contract generated. Supabase catalog ledger updated successfully.",
      timestamp: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    };
    setMessages(prev => [...prev, closingMsg]);
  };

  // Dynamic values for AI Panel
  const counterPrice = Math.round(pricePerUnit * 0.95);
  const marketAvg = Math.round(pricePerUnit * 1.03);

  const stages = ["Inquiry","Proposal","Negotiation","Closed"];

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
        {dealStage !=="Closed" && (
          <button
            onClick={handleCloseDeal}
            className="px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-xs font-bold text-white rounded-lg transition-colors cursor-pointer"
          >
            Sign & Finalize Deal ✓
          </button>
        )}
      </div>

      {/* 4-Step Timeline Stepper */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_4px_20px_rgb(15,30,60,0.01)]">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {stages.map((stg, idx) => {
            const isCompleted = stages.indexOf(dealStage) >= idx;
            const isActive = dealStage === stg;
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
                    {stg}
                  </span>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`absolute left-4 top-4 right-0 -translate-y-1/2 h-[2px] z-0
                    ${stages.indexOf(dealStage) > idx ?"bg-[#0F1E3C]" :"bg-neutral-200"}
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
              <p className="text-[10px] text-[#6B7280]  mt-0.5">{quantity} units @ ₹{pricePerUnit.toLocaleString()}</p>
            </div>
          </div>

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
                  <div className={`max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm
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

          {/* Footer Input Area */}
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
              <div className="flex justify-between items-center bg-[#faf8f5] border border-neutral-200 rounded-xl p-3.5">
                <div>
                  <span className="text-sm font-bold text-[#0F1E3C]">₹{counterPrice.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded ml-2">-5.0%</span>
                  <p className="text-[10px] text-[#6B7280] mt-1.5 leading-relaxed">Optimal pricing recommendation based on benchmark datasets.</p>
                </div>
                {dealStage !=="Closed" && (
                  <button
                    onClick={() => adoptOffer(counterPrice)}
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
              <div className="bg-[#faf8f5]/50 border border-neutral-200/60 rounded-xl p-3.5 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280]">Market Average</span>
                  <span className="font-bold text-[#0F1E3C]">₹{marketAvg.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#6B7280]">Price Deviation</span>
                  <span className="font-bold text-emerald-700">-{Math.round(((marketAvg - pricePerUnit) / marketAvg) * 100)}% Lower</span>
                </div>
              </div>
            </div>

            {/* Risk flags */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">AI Risk Audit Flags</span>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200/50 text-[10px] leading-relaxed text-red-800">
                  <span className="text-base leading-none -mt-0.5">⚠️</span>
                  <div>
                    <span className="font-bold block text-red-950">Strict Delivery SLA</span>
                    Contract deadlines leave less than 3 days of logistics buffering. Ensure penalty clauses are discussed.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/50 text-[10px] leading-relaxed text-amber-800">
                  <span className="text-base leading-none -mt-0.5">⚠️</span>
                  <div>
                    <span className="font-bold block text-amber-950">Volume Proximity Risk</span>
                    Order volume exceeds 80% of vendor&apos;s current catalog stock. Confirm secondary fulfillment pathways.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">
            <span>Model Version: Gemini 3.5</span>
            <span>Refreshed: Real-Time</span>
          </div>
        </div>

      </div>

    </div>
  );
}
