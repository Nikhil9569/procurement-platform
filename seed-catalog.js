const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MOCK_ITEMS = [
  // Vendor 1: yabhi (id: 976e799e-64c4-4f8b-a229-0482d0cce138)
  {
    vendor_id: '976e799e-64c4-4f8b-a229-0482d0cce138',
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
    vendor_id: '976e799e-64c4-4f8b-a229-0482d0cce138',
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
    vendor_id: '976e799e-64c4-4f8b-a229-0482d0cce138',
    product_name: 'Stainless Steel Screws',
    category: 'Industrial fasteners',
    price: 2,
    warranty_months: 24,
    delivery_days: 4,
    moq: 1000,
    stock: 100000,
    rating: 4.6
  },
  // Vendor 2: king org (id: ded23755-32d4-415a-af5c-507b375f2100)
  {
    vendor_id: 'ded23755-32d4-415a-af5c-507b375f2100',
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
    vendor_id: 'ded23755-32d4-415a-af5c-507b375f2100',
    product_name: 'M12 Hex Bolts',
    category: 'Industrial fasteners',
    price: 8,
    warranty_months: 12,
    delivery_days: 3,
    moq: 500,
    stock: 50000,
    rating: 4.4
  },
  // Vendor 3: sds (id: 1cac1f09-e3a1-4dcb-8930-7b6572113dc2)
  {
    vendor_id: '1cac1f09-e3a1-4dcb-8930-7b6572113dc2',
    product_name: 'M12 Hex Bolts',
    category: 'Industrial fasteners',
    price: 7,
    warranty_months: 12,
    delivery_days: 5,
    moq: 600,
    stock: 40000,
    rating: 4.3
  },
  {
    vendor_id: '1cac1f09-e3a1-4dcb-8930-7b6572113dc2',
    product_name: 'Stainless Steel Screws',
    category: 'Industrial fasteners',
    price: 1.8,
    warranty_months: 24,
    delivery_days: 3,
    moq: 2000,
    stock: 80000,
    rating: 4.5
  },
  // Vendor 4: df (id: 933b1875-021d-469f-ae72-d02345ef6c42)
  {
    vendor_id: '933b1875-021d-469f-ae72-d02345ef6c42',
    product_name: 'Ergonomic Office Chair',
    category: 'Office supplies',
    price: 6200,
    warranty_months: 18,
    delivery_days: 7,
    moq: 10,
    stock: 80,
    rating: 4.7
  }
];

async function seed() {
  console.log("Seeding mock catalog items...");
  
  // Clear any existing catalog items (just in case)
  const { error: deleteError } = await supabase
    .from('vendor_catalog')
    .delete()
    .neq('id', 0); // Delete all rows
    
  if (deleteError) {
    console.error("Error clearing table:", deleteError);
    return;
  }

  // Insert mock catalog items
  const { data, error } = await supabase
    .from('vendor_catalog')
    .insert(MOCK_ITEMS)
    .select();

  if (error) {
    console.error("Error seeding catalog:", error);
  } else {
    console.log(`Successfully seeded ${data.length} catalog items!`);
  }
}

seed();
