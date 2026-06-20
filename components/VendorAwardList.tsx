"use client";

import { useState } from "react";
import { X, User, Mail, Phone, MapPin } from "lucide-react";

export interface Award {
  id: string;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  created_at: string;
  buyer_id: string;
}

export interface BuyerProfile {
  id: string;
  company_name: string | null;
  full_name: string | null;
  contact_email: string | null;
  phone_number: string | null;
  address: string | null;
}

interface VendorAwardListProps {
  awards: Award[];
  buyerProfiles: Record<string, BuyerProfile>;
}

export default function VendorAwardList({ awards, buyerProfiles }: VendorAwardListProps) {
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);

  if (!awards || awards.length === 0) {
    return (
      <div className="p-8 text-center text-stone-500 text-sm">
        No RFQs won yet. Keep your catalogue updated!
      </div>
    );
  }

  const getBuyerDisplayName = (profile?: BuyerProfile) => {
    if (!profile) return "Unknown Buyer";
    return profile.company_name || profile.full_name || "Unknown Buyer";
  };

  const selectedProfile = selectedAward ? buyerProfiles[selectedAward.buyer_id] : null;

  return (
    <>
      <ul className="divide-y divide-stone-100">
        {awards.map((rfq) => {
          const profile = buyerProfiles[rfq.buyer_id];
          const displayName = getBuyerDisplayName(profile);

          return (
            <li 
              key={rfq.id} 
              className="p-5 hover:bg-stone-50/50 transition-colors cursor-pointer group flex flex-col"
              onClick={() => setSelectedAward(rfq)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-stone-900 group-hover:text-[#0F1E3C] transition-colors">{rfq.product_name}</span>
                <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                  ₹{(rfq.quantity * rfq.price_per_unit).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-end text-sm text-stone-500 font-normal mt-2">
                <div>
                  <p>Buyer: <span className="font-semibold text-[#0F1E3C]">{displayName}</span></p>
                  <p className="mt-0.5 text-xs">{rfq.quantity} units @ ₹{rfq.price_per_unit.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs">{new Date(rfq.created_at).toLocaleDateString()}</span>
                  <button className="text-xs font-semibold text-[#0F1E3C] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    View Details &rarr;
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Modal */}
      {selectedAward && selectedProfile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedAward(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h3 className="font-bold text-stone-900 text-lg">Buyer Details</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedAward(null); }}
                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-0.5">Contact Name</p>
                    <p className="text-sm font-medium text-stone-900">{selectedProfile.full_name || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-0.5">Email</p>
                    {selectedProfile.contact_email ? (
                      <a href={`mailto:${selectedProfile.contact_email}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {selectedProfile.contact_email}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-stone-900">Not provided</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-0.5">Phone</p>
                    {selectedProfile.phone_number ? (
                      <a href={`tel:${selectedProfile.phone_number}`} className="text-sm font-medium text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                        {selectedProfile.phone_number}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-stone-900">Not provided</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-0.5">Address</p>
                    <p className="text-sm font-medium text-stone-900">{selectedProfile.address || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
