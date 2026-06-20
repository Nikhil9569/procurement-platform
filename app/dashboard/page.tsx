"use client";

import { useState, useEffect, useMemo } from"react";
import { createClient } from"@/lib/supabase/client";
import { useRouter } from"next/navigation";
import { scoreVendors, PRESETS, CatalogItem } from"@/lib/scoring";
import { haversineKm } from"@/lib/distance";

// Vendor Dashboard Workflow
import VendorDashboard from"@/components/VendorDashboard";

// Buyer Redesigned Components
import VendorSearchForm from"@/components/buyer/VendorSearchForm";
import ScoringWeights from"@/components/buyer/ScoringWeights";
import DeliveryDestination from"@/components/buyer/DeliveryDestination";
import VendorResultsGrid from"@/components/buyer/VendorResultsGrid";

type Pos = { lat: number; lng: number };

export default function Dashboard() {
  const [profile, setProfile] = useState<{ role: string; company_name: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Shared Sourcing State managed in page.tsx
  const [mode, setMode] = useState<'catalog' | 'semantic'>('catalog');
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [volume, setVolume] = useState('');
  const [sla, setSla] = useState('');
  const [weightPreset, setWeightPreset] = useState<'balanced' | 'price' | 'speed' | 'custom'>('balanced');
  const [weights, setWeights] = useState({ price: 33, proximity: 33, speed: 34 });
  const [destination, setDestination] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState(50);
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Mobile accordion state
  const [isMobile, setIsMobile] = useState(false);
  const [weightsExpanded, setWeightsExpanded] = useState(true);
  const [destinationExpanded, setDestinationExpanded] = useState(true);



  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setWeightsExpanded(false);
        setDestinationExpanded(false);
      } else {
        setWeightsExpanded(true);
        setDestinationExpanded(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Catalog metadata for exact filters
  const [catalogMeta, setCatalogMeta] = useState<{product_name: string, category: string, stock: number | null}[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role, company_name")
        .eq("id", user.id)
        .single();
      
      if (!data?.role) {
        router.push("/select-role");
        return;
      }
      setProfile(data);
      setLoadingProfile(false);

      // Load catalog info
      const { data: catalog } = await supabase.from("vendor_catalog").select("product_name, category, stock");
      if (catalog) {
        setCatalogMeta(catalog as {product_name: string, category: string, stock: number | null}[]);
      }
    })();
  }, [supabase, router]);

  const categories = useMemo(() => {
    return Array.from(new Set(catalogMeta.map((d) => d.category))).filter(Boolean).sort();
  }, [catalogMeta]);

  const availableProducts = useMemo(() => {
    if (!category) return [];
    return Array.from(new Set(catalogMeta.filter(d => d.category === category).map((d) => d.product_name))).sort();
  }, [catalogMeta, category]);

  const handleSearch = async (overrideParams?: {
    mode?: 'catalog' | 'semantic';
    category?: string;
    item?: string;
    volume?: string;
    destination?: string;
    coords?: Pos;
  }) => {
    setLoading(true);
    setResults([]);

    const activeMode = overrideParams?.mode ?? mode;
    const activeItem = overrideParams?.item ?? item;
    const activeVolume = overrideParams?.volume ?? volume;
    const activeCoords = overrideParams?.coords ?? coords;

    try {
      let valid: CatalogItem[] = [];
      if (activeMode === "catalog") {
        console.log("handleSearch [catalog]: querying product_name =", activeItem);
        let queryBuilder = supabase
          .from("vendor_catalog")
          .select("id, vendor_id, product_name, category, price, warranty_months, delivery_days, moq, stock")
          .eq("product_name", activeItem);

        if (activeVolume) {
          queryBuilder = queryBuilder
            .lte("moq", Number(activeVolume))
            .gte("stock", Number(activeVolume));
        }
        if (sla) {
          queryBuilder = queryBuilder.lte("delivery_days", Number(sla));
        }

        const { data: catalogData, error: catErr } = await queryBuilder;
        
        if (catErr) {
          console.error("handleSearch [catalog] query error:", catErr);
        } else {
          console.log("handleSearch [catalog] query raw results:", catalogData);
        }
        valid = (catalogData || []) as CatalogItem[];
      } else {
        // Semantic Sourcing Mode
        console.log("handleSearch [semantic]: querying description =", destination);
        const res = await fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: [destination] }) // Use destination/semantic query
        });
        const data = await res.json();
        if (data.embeddings && data.embeddings.length > 0) {
          const { data: rpcData, error: rpcErr } = await supabase.rpc("match_products", {
            query_embedding: `[${data.embeddings[0].join(',')}]`,
            match_threshold: 0.5,
            match_count: 50,
            min_stock: activeVolume ? Number(activeVolume) : null,
            max_moq: activeVolume ? Number(activeVolume) : null,
            max_delivery_days: sla ? Number(sla) : null
          });
          if (rpcErr) {
            console.error("handleSearch [semantic] RPC error:", rpcErr);
          } else {
            console.log("handleSearch [semantic] RPC raw results:", rpcData);
          }
          if (!rpcErr) {
            valid = (rpcData || []) as CatalogItem[];
          }
        }
      }

      console.log("handleSearch: database filtered results count =", valid.length);

      // Vendor details profiles
      const vendorIds = [...new Set(valid.map(c => c.vendor_id))];
      const companyMap: Record<string, {name: string, email: string}> = {};
      const coordMap: Record<string, Pos> = {};
      if (vendorIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, company_name, contact_email, latitude, longitude")
          .in("id", vendorIds);
        if (profileData) {
          profileData.forEach(p => {
            if (p.company_name) companyMap[p.id] = { name: p.company_name, email: p.contact_email };
            if (p.latitude != null && p.longitude != null) {
              coordMap[p.id] = { lat: p.latitude, lng: p.longitude };
            }
          });
        }
      }

      // Convert manual sliders to weights structure
      const totalWeight = weights.price + weights.speed + 50;
      const activeWeights = {
        price: weights.price / totalWeight,
        delivery_days: weights.speed / totalWeight,
        warranty_months: 25 / totalWeight,
        rating: 25 / totalWeight,
      };

      let ranked = scoreVendors(valid, activeWeights).map((r) => {
        const vendorPos = coordMap[r.vendor_id];
        const distanceKm = activeCoords && vendorPos ? haversineKm(activeCoords, vendorPos) : null;
        return {
          ...r,
          company_name: companyMap[r.vendor_id]?.name ||`Vendor ${r.vendor_id.slice(0, 8)}`,
          contact_email: companyMap[r.vendor_id]?.email,
          distanceKm,
          vendorPos,
        };
      });

      // Max Distance slider filter
      console.log("handleSearch: activeCoords =", activeCoords, "radius =", radius, "ranked before distance filtering =", ranked);
      if (radius < 500) {
        ranked = ranked.filter(r => {
          const keep = r.distanceKm == null || r.distanceKm <= radius;
          if (!keep) {
            console.log(`handleSearch: filtered out ${r.company_name} due to distance (${r.distanceKm} km > ${radius} km)`);
          }
          return keep;
        });
      }

      console.log("handleSearch: final ranked results =", ranked);
      setResults(ranked);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Pre-fill fields for preset queries
  const handleTryPreset = async (cat: string, vol: string, dest?: string) => {
    setMode("catalog");
    setCategory(cat);
    setVolume(vol);

    // Pick first matching item in that category for convenience
    const matchingItem = catalogMeta.find(d => d.category === cat);
    if (matchingItem) {
      setItem(matchingItem.product_name);
    }

    let activeCoords = coords;
    if (dest) {
      setDestination(dest);
      if (dest.toLowerCase().includes("mumbai")) {
        const mumbaiPos = { lat: 19.0760, lng: 72.8777 };
        setBuyerPos(mumbaiPos);
        activeCoords = mumbaiPos;
      }
    }

    // Trigger instant matching
    setTimeout(async () => {
      await handleSearch({
        mode: "catalog",
        category: cat,
        item: matchingItem ? matchingItem.product_name : undefined,
        volume: vol,
        destination: dest,
        coords: activeCoords || undefined
      });
    }, 100);
  };

  const setBuyerPos = (p: Pos) => {
    setCoords(p);
  };

  const handleViewProfile = (vendorId: string) => {
    router.push(`/dashboard/vendor/${vendorId}`);
  };

  const handleNegotiate = async (vendorId: string, companyName: string, selectedProduct: string, selectedPrice: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let savedAmount = 0;
    if (results && results.length > 1 && volume) {
      const avgPrice = results.reduce((acc, r) => acc + r.price, 0) / results.length;
      if (avgPrice > selectedPrice) {
        savedAmount = (avgPrice - selectedPrice) * Number(volume);
      }
    }

    const { data: newRfq } = await supabase.from("rfq_history").insert({
      buyer_id: user.id,
      vendor_id: vendorId,
      product_name: selectedProduct,
      quantity: Number(volume) || 1,
      price_per_unit: selectedPrice,
      saved_amount: savedAmount,
      priority: weightPreset,
      experience_rating: null,
      feedback_notes: null
    }).select().single();

    if (newRfq?.id) {
      router.push(`/dashboard/deals/${newRfq.id}`);
    } else {
      router.push("/dashboard/deals");
    }
  };



  const handleSeedCatalog = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const mockItems = [
      {
        vendor_id: user.id,
        product_name: 'Printer Paper A4',
        category: 'Office supplies',
        price: 280,
        warranty_months: 0,
        delivery_days: 1,
        moq: 20,
        stock: 1500,
        rating: 4.8
      },
      {
        vendor_id: user.id,
        product_name: 'Premium Gel Pens',
        category: 'Office supplies',
        price: 15,
        warranty_months: 0,
        delivery_days: 2,
        moq: 100,
        stock: 5000,
        rating: 4.2
      },
      {
        vendor_id: user.id,
        product_name: 'Ergonomic Office Chair',
        category: 'Office supplies',
        price: 6500,
        warranty_months: 12,
        delivery_days: 3,
        moq: 5,
        stock: 120,
        rating: 4.5
      },
      {
        vendor_id: user.id,
        product_name: 'M12 Hex Bolts',
        category: 'Industrial fasteners',
        price: 8,
        warranty_months: 12,
        delivery_days: 3,
        moq: 500,
        stock: 50000,
        rating: 4.4
      },
      {
        vendor_id: user.id,
        product_name: 'Stainless Steel Screws',
        category: 'Industrial fasteners',
        price: 2,
        warranty_months: 24,
        delivery_days: 4,
        moq: 1000,
        stock: 100000,
        rating: 4.6
      }
    ];

    const { error } = await supabase.from("vendor_catalog").insert(mockItems);
    if (!error) {
      const { data: catalog } = await supabase.from("vendor_catalog").select("product_name, category, stock");
      if (catalog) {
        setCatalogMeta(catalog as {product_name: string, category: string, stock: number | null}[]);
      }
      alert("Mock catalog items successfully seeded under your account!");
    } else {
      alert("Error seeding catalog: " + error.message);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-[#F8F7F4]">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-10 w-10 rounded-full border-4 border-neutral-200 border-t-[#0F1E3C] animate-spin" />
          <span className="text-xs text-[#6B7280] font-semibold">Loading dashboard profile...</span>
        </div>
      </div>
    );
  }

  // Render Vendor Flow
  if (profile?.role ==="vendor") {
    return <VendorDashboard />;
  }

  return (
    <div className="w-full min-h-[calc(100vh-128px)] lg:h-[calc(100vh-128px)] lg:overflow-hidden flex flex-col lg:flex-row gap-6 text-left min-w-0 bg-[#F8F7F4]">
      
      {/* Left Column (400px fixed width, scrollable card container on desktop) */}
      <div className="w-full lg:w-[400px] shrink-0 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col lg:h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Card 1: Find Vendors */}
          <VendorSearchForm
            mode={mode}
            setMode={setMode}
            category={category}
            setCategory={setCategory}
            categories={categories}
            item={item}
            setItem={setItem}
            items={availableProducts}
            volume={volume}
            setVolume={setVolume}
            sla={sla}
            setSla={setSla}
            onSearch={handleSearch}
            loading={loading}
          />

          <hr className="border-neutral-100" />

          {/* Card 2: Scoring Weights */}
          <ScoringWeights
            weightPreset={weightPreset}
            setWeightPreset={setWeightPreset}
            weights={weights}
            setWeights={setWeights}
            isMobile={isMobile}
            expanded={weightsExpanded}
            onToggle={() => setWeightsExpanded(!weightsExpanded)}
          />

          <hr className="border-neutral-100" />

          {/* Card 3: Delivery Location */}
          <DeliveryDestination
            coords={coords}
            setCoords={setBuyerPos}
            destination={destination}
            setDestination={setDestination}
            radius={radius}
            setRadius={setRadius}
            isMobile={isMobile}
            expanded={destinationExpanded}
            onToggle={() => setDestinationExpanded(!destinationExpanded)}
          />
        </div>
      </div>

      {/* Right Column (1fr fills remaining width) */}
      <div className="flex-1 min-w-0 w-full lg:h-full lg:overflow-y-auto pl-1">
        <VendorResultsGrid
          vendors={results || []}
          loading={loading}
          hasSearched={results !== null}
          onNegotiate={handleNegotiate}
          onTryPreset={handleTryPreset}
          onViewProfile={handleViewProfile}
          catalogEmpty={catalogMeta.length === 0}
          onSeedCatalog={handleSeedCatalog}
        />
      </div>



    </div>
  );
}