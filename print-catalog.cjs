const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

global.WebSocket = class {};

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  { auth: { persistSession: false } }
);

async function run() {
  console.log('Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test.vendor.procure1473@gmail.com',
    password: 'Password123!'
  });
  
  if (authError) {
    console.error('Sign in error:', authError);
    return;
  }
  
  console.log('Querying catalog as authenticated user...');
  const { data: catalog, error: catError } = await supabase
    .from('vendor_catalog')
    .select('id, vendor_id, product_name, category, price, embedding');
    
  if (catError) {
    console.error('Catalog error:', catError);
    return;
  }
  
  console.log(`Catalog items count: ${catalog.length}`);
  catalog.forEach(item => {
    console.log(`- [${item.id}] ${item.product_name} (${item.category}): Price: ${item.price}, Has embedding: ${item.embedding !== null}`);
  });
}

run().catch(console.error);
