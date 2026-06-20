"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [tab, setTab] = useState<'catalog' | 'reviews'>('catalog');

  useEffect(() => {
    if (!vendorId) return;

    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name, contact_email, full_name, phone_number, address, service_radius")
          .eq("id", vendorId)
          .single();

        const { data: catalog } = await supabase
          .from("vendor_catalog")
          .select("product_name, category, price, delivery_days, moq, stock")
          .eq("vendor_id", vendorId);

        const { data: reviews } = await supabase
          .from("rfq_history")
          .select("experience_rating, feedback_notes, created_at, product_name")
          .eq("vendor_id", vendorId)
          .not("experience_rating", "is", null)
          .order("created_at", { ascending: false });

        setProfileData({
          profile,
          catalog: catalog || [],
          reviews: reviews || []
        });
      } catch (err) {
        console.error("Error loading vendor profile details:", err);
      }
      setLoading(false);
    })();
  }, [vendorId, supabase, router]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-128px)] w-full items-center justify-center bg-[#F8F7F4]">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-10 w-10 rounded-full border-4 border-neutral-200 border-t-[#0F1E3C] animate-spin" />
          <span className="text-xs text-[#6B7280] font-semibold">Loading profile data...</span>
        </div>
      </div>
    );
  }

  if (!profileData || !profileData.profile) {
    return (
      <main className="min-h-screen bg-[#F8F7F4] p-8 flex items-center justify-center text-left">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold text-red-600">Vendor profile not found.</p>
          <Link href="/dashboard" className="inline-block px-4 py-2 bg-[#0F1E3C] text-white rounded-lg text-xs font-bold">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { profile, catalog, reviews } = profileData;
  const initials = profile.company_name?.slice(0, 2).toUpperCase() || "VE";

  return (
    <main className="min-h-screen bg-[#F8F7F4] p-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in text-left">
        
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-stone-500 hover:text-stone-850 transition-colors w-fit text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[#0F1E3C] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  {profile.company_name || "Vendor Partner"}
                </h1>
                <p className="text-xs text-neutral-500 mt-1">
                  Supplier Profile & Catalog Overview
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {reviews.length > 0 ? (
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1.5 shrink-0">
                  <span>★</span>
                  <span>
                    {(reviews.reduce((acc: number, r: any) => acc + r.experience_rating, 0) / reviews.length).toFixed(1)}
                  </span>
                  <span className="text-amber-500 font-normal">
                    ({reviews.length} reviews)
                  </span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-250 text-xs font-semibold text-neutral-500 shrink-0">
                  No ratings yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Left Column: Contact info */}
          <div className="space-y-4 text-xs font-medium text-gray-700 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm h-fit">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#0F1E3C]/60 mb-2">
              Contact Information
            </h4>
            <div className="space-y-1">
              <span className="text-gray-400 block font-semibold">Contact Representative</span>
              <span className="text-gray-900 font-semibold">{profile.full_name || "Not listed"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 block font-semibold">Email Address</span>
              {profile.contact_email ? (
                <a href={`mailto:${profile.contact_email}`} className="text-[#0F1E3C] hover:underline font-bold">
                  {profile.contact_email}
                </a>
              ) : (
                <span className="text-gray-900 font-semibold">Not listed</span>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 block font-semibold">Phone Number</span>
              <span className="text-gray-900 font-semibold">{profile.phone_number || "Not listed"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 block font-semibold">Base Address</span>
              <span className="text-gray-900 leading-relaxed block font-semibold">{profile.address || "Not listed"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 block font-semibold">Transport Service Radius</span>
              <span className="text-gray-900 font-semibold">{profile.service_radius ? `${profile.service_radius} km` : "Global delivery"}</span>
            </div>
          </div>

          {/* Right Column: Catalog / Reviews */}
          <div className="flex flex-col bg-white p-6 rounded-2xl border border-stone-200 shadow-sm min-h-[400px]">
            {/* Tabs Header */}
            <div className="flex border-b border-neutral-100 mb-4">
              <button
                onClick={() => setTab('catalog')}
                className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors ${tab === 'catalog' ? 'border-[#0F1E3C] text-[#0F1E3C]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Product Catalog ({catalog.length})
              </button>
              <button
                onClick={() => setTab('reviews')}
                className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors ${tab === 'reviews' ? 'border-[#0F1E3C] text-[#0F1E3C]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Past Reviews ({reviews.length})
              </button>
            </div>

            {/* Tabs Content */}
            <div className="flex-grow">
              {tab === 'catalog' ? (
                catalog.length > 0 ? (
                  <div className="border border-neutral-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 text-gray-500 border-b border-neutral-100 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Unit Price</th>
                          <th className="p-3">Lead Time</th>
                          <th className="p-3">MOQ</th>
                          <th className="p-3">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.map((item: any, index: number) => (
                          <tr key={index} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                            <td className="p-3 font-semibold text-gray-900">{item.product_name}</td>
                            <td className="p-3 text-gray-500">{item.category}</td>
                            <td className="p-3 font-bold text-[#0F1E3C]">₹{item.price.toLocaleString()}</td>
                            <td className="p-3 font-semibold text-gray-700">{item.delivery_days} days</td>
                            <td className="p-3 text-gray-700">{item.moq ? `${item.moq.toLocaleString()} units` : "None"}</td>
                            <td className="p-3 font-bold text-[#0F1E3C]">{item.stock ? `${item.stock.toLocaleString()} units` : "Out of stock"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-gray-500 font-medium bg-neutral-50 rounded-xl border border-neutral-100">
                    This vendor has not listed any catalog products yet.
                  </div>
                )
              ) : (
                reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((rev: any, index: number) => (
                      <div key={index} className="border border-neutral-100 rounded-xl p-4 bg-[#faf8f5]/40 text-xs">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-[#0F1E3C]">
                            Product: {rev.product_name || "Procurement Item"}
                          </span>
                          <div className="text-amber-500 font-bold flex gap-0.5">
                            {Array.from({ length: rev.experience_rating }).map((_, idx) => (
                              <span key={idx}>★</span>
                            ))}
                            {Array.from({ length: 5 - rev.experience_rating }).map((_, idx) => (
                              <span key={idx} className="text-neutral-200">★</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700 font-semibold leading-relaxed">
                          {rev.feedback_notes || "Awarded deal finalized successfully. No detailed written feedback was provided by the buyer."}
                        </p>
                        <span className="text-[10px] text-gray-400 block mt-2 font-medium">
                          Transacted: {new Date(rev.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-gray-500 font-medium bg-neutral-50 rounded-xl border border-neutral-100">
                    No past ratings or reviews are recorded for this vendor.
                  </div>
                )
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
