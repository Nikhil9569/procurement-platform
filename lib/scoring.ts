export type CatalogItem = {
  id: number;
  vendor_id: string;
  product_name: string;
  category: string;
  price: number;
  warranty_months: number | null;
  delivery_days: number | null;
  moq: number | null;
  stock: number | null;
  rating?: number | null;
};

export function distinctCategories(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort();
}

export function productsInCategory(items: CatalogItem[], category: string): string[] {
  return Array.from(
    new Set(items.filter((i) => i.category === category).map((i) => i.product_name))
  ).sort();
}

export type Weights = {
  price: number;
  delivery_days: number;
  warranty_months: number;
  rating: number;
};

// preset priorities → weights (always sum to 1 after normalising)
export const PRESETS: Record<string, Weights> = {
  price_critical: { price: 0.5, delivery_days: 0.15, warranty_months: 0.2, rating: 0.15 },
  fast_delivery:  { price: 0.2, delivery_days: 0.5, warranty_months: 0.15, rating: 0.15 },
  quality_first:  { price: 0.15, delivery_days: 0.15, warranty_months: 0.35, rating: 0.35 },
  balanced:       { price: 0.25, delivery_days: 0.25, warranty_months: 0.25, rating: 0.25 },
};

const LOWER_IS_BETTER = new Set(["price", "delivery_days"]);
const FACTORS: (keyof Weights)[] = ["price", "delivery_days", "warranty_months", "rating"];

// normalise one factor across all items to 0..1 (1 = best)
function normalise(values: (number | null)[], lowerBetter: boolean): number[] {
  const present = values.filter((v): v is number => v != null);
  // missing data → neutral (average of present), so vendors aren't unfairly punished
  const avg = present.length ? present.reduce((a, b) => a + b, 0) / present.length : 0;
  const filled = values.map((v) => (v == null ? avg : v));

  const lo = Math.min(...filled);
  const hi = Math.max(...filled);
  if (hi === lo) return filled.map(() => 1); // all equal → neutral

  return filled.map((v) => {
    const n = (v - lo) / (hi - lo); // 0..1, higher = better
    return lowerBetter ? 1 - n : n; // invert where lower is better
  });
}

export type ScoreBreakdown = {
  factor: string;
  label: string;
  rawValue: number | null;
  normalisedScore: number;   // 0..1
  weight: number;            // effective weight after normalisation
  weightedScore: number;     // normalisedScore * weight
};

export function scoreVendors(items: CatalogItem[], weights: Weights) {
  if (items.length === 0) return [];

  // normalise each factor across all items
  const columns: Record<string, number[]> = {};
  for (const f of FACTORS) {
    columns[f] = normalise(items.map((it) => (it[f as keyof CatalogItem] as number) ?? null), LOWER_IS_BETTER.has(f));
  }

  const FACTOR_LABELS: Record<string, string> = {
    price: "Price",
    delivery_days: "Delivery",
    warranty_months: "Warranty",
    rating: "Rating",
  };

  // weighted sum per item, with full breakdown
  const total = FACTORS.reduce((s, f) => s + weights[f], 0) || 1;
  return items
    .map((it, i) => {
      const breakdown: ScoreBreakdown[] = FACTORS.map((f) => {
        const effectiveWeight = weights[f] / total;
        const normalisedScore = columns[f][i];
        return {
          factor: f,
          label: FACTOR_LABELS[f] || f,
          rawValue: (it[f as keyof CatalogItem] as number) ?? null,
          normalisedScore: Math.round(normalisedScore * 1000) / 1000,
          weight: Math.round(effectiveWeight * 1000) / 1000,
          weightedScore: Math.round(effectiveWeight * normalisedScore * 1000) / 1000,
        };
      });
      const score = breakdown.reduce((s, b) => s + b.weightedScore, 0);
      return { ...it, score: Math.round(score * 1000) / 1000, breakdown };
    })
    .sort((a, b) => b.score - a.score);
}

// group catalogue by product name, return distinct product names for search
export function distinctProducts(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.product_name))).sort();
}