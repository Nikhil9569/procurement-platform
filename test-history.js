const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('rfq_history')
    .select(`
      id,
      buyer_id,
      vendor:profiles!rfq_history_vendor_id_fkey(company_name)
    `);
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

test();
