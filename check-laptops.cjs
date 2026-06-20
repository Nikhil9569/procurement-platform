const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

function cosineSimilarity(a, b) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function run() {
  console.log('Trying Anonymous Sign-in...');
  let session = null;
  try {
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (!authError && authData.session) {
      console.log('Anonymous sign-in success! User ID:', authData.user.id);
      session = authData.session;
    } else {
      console.log('Anonymous sign-in failed:', authError?.message || authError);
    }
  } catch (err) {
    console.log('Anonymous sign-in error:', err.message || err);
  }

  // If anonymous fails, try to sign in with password using an existing user?
  // Wait, is there any user we can use? Let's check.
  
  const { data: catalog, error: catError } = await supabase
    .from('vendor_catalog')
    .select('id, product_name, category, price, embedding');
    
  if (catError) {
    console.error('Catalog query error:', catError);
    return;
  }
  
  console.log(`\nFound ${catalog.length} items in vendor_catalog:`);
  catalog.forEach(item => {
    console.log(`- [${item.id}] ${item.product_name} (${item.category}): Price: ₹${item.price}`);
  });

  const query = "gaming laptops";
  
  // Expand query
  console.log('\nExpanding query "gaming laptops"...');
  const genAI = new GoogleGenerativeAI(env['GEMINI_API_KEY']);
  const modelFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const expansionPrompt = 
    `You are a procurement search assistant. Expand the following single procurement search term or query into a comma-separated list of synonyms, specific model variations, alternative descriptions, and technical specifications of the EXACT same product type. Do NOT include related accessories or different product types (for example, if the query is about a laptop, do NOT include mouse, keyboard, monitor, printer, storage, or desktop; if the query is about a mouse, do NOT include mouse pads, wrist rests, or keyboards). This is for generating search embeddings, so do not include conversational text or headers. Just output the expanded list.\n\n` +
    `Query: "${query}"\n\n` +
    `Expanded List:`;
  
  const expansionRes = await modelFlash.generateContent(expansionPrompt);
  const expandedText = expansionRes.response.text().trim();
  console.log('Expanded Query:', expandedText);
  
  // Embed
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  const qEmbedRes = await model.embedContent(expandedText);
  const qEmbed = qEmbedRes.embedding.values;

  const results = [];
  for (const item of catalog) {
    if (item.embedding) {
      const vector = JSON.parse(item.embedding);
      const sim = cosineSimilarity(qEmbed, vector);
      results.push({ name: item.product_name, category: item.category, sim });
    }
  }

  results.sort((a, b) => b.sim - a.sim);
  console.log('\nSimilarities with expanded query:');
  results.forEach(r => {
    console.log(`- ${r.name} (${r.category}): ${r.sim.toFixed(4)}`);
  });
}

run().catch(console.error);
