const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function run() {
  const genAI = new GoogleGenerativeAI(env['GEMINI_API_KEY']);
  const modelFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const query = "mouse that won't hurt my wrist";
  const expansionPrompt = 
    `You are a procurement search assistant. Expand the following single procurement search term or query into a comma-separated list of synonyms, related product types, specifications, materials, and generic variations. This is for generating search embeddings, so do not include conversational text or headers. Just output the expanded list.\n\n` +
    `Query: "${query}"\n\n` +
    `Expanded List:`;
  
  const expansionResult = await modelFlash.generateContent(expansionPrompt);
  const expandedText = expansionResult.response.text().trim();
  console.log('Query:', query);
  console.log('Expanded Query:', expandedText);

  // Let's fetch catalog items
  const res = await fetch(`${url}/rest/v1/vendor_catalog?select=id,product_name,category,price,embedding`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const catalog = await res.json();
  console.log(`\nCatalog items count: ${catalog.length}`);
  
  // Calculate similarity
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  const qEmbedRes = await model.embedContent(expandedText);
  const qEmbed = qEmbedRes.embedding.values;

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

  const results = [];
  for (const item of catalog) {
    if (item.embedding) {
      // Parse vector string "[0.1, 0.2, ...]" to array
      const vector = JSON.parse(item.embedding);
      const sim = cosineSimilarity(qEmbed, vector);
      results.push({ id: item.id, name: item.product_name, category: item.category, sim });
    }
  }

  results.sort((a, b) => b.sim - a.sim);
  console.log('\nSimilarities with expanded query:');
  results.forEach(r => {
    console.log(`- ${r.name} (${r.category}): ${r.sim.toFixed(4)}`);
  });

  // Calculate similarity with ORIGINAL query
  const qOrigEmbedRes = await model.embedContent(query);
  const qOrigEmbed = qOrigEmbedRes.embedding.values;
  const resultsOrig = [];
  for (const item of catalog) {
    if (item.embedding) {
      const vector = JSON.parse(item.embedding);
      const sim = cosineSimilarity(qOrigEmbed, vector);
      resultsOrig.push({ id: item.id, name: item.product_name, category: item.category, sim });
    }
  }
  resultsOrig.sort((a, b) => b.sim - a.sim);
  console.log('\nSimilarities with ORIGINAL query (no expansion):');
  resultsOrig.forEach(r => {
    console.log(`- ${r.name} (${r.category}): ${r.sim.toFixed(4)}`);
  });
}

run().catch(console.error);
