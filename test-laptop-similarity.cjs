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
  const genAI = new GoogleGenerativeAI(env['GEMINI_API_KEY']);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  
  const query = "gaming laptops";
  
  const products = [
    "Category: Laptops, Product: Lenovo ThinkPad T14, Price: ₹89000, Description: Business laptop with Intel Core i7, 16GB RAM, 512GB SSD. Perfect for office productivity.",
    "Category: Laptops, Product: HP EliteBook 840, Price: ₹78000, Description: Premium enterprise business laptop with long battery life and advanced security features.",
    "Category: Laptops, Product: Asus ZenBook 14, Price: ₹74000, Description: Ultra-thin and light laptop with OLED display, designed for everyday productivity and portabilty.",
    "Category: Laptops, Product: ASUS ROG Zephyrus G14, Price: ₹145000, Description: High-performance gaming laptop with AMD Ryzen 9 and NVIDIA GeForce RTX 4070 graphics."
  ];
  
  console.log(`Query: "${query}"`);
  console.log('Generating embeddings...');
  
  const queryRes = await model.embedContent(query);
  const queryEmbedding = queryRes.embedding.values;
  
  console.log('\n--- Cosine Similarities with ORIGINAL Query ---');
  for (const prod of products) {
    const prodRes = await model.embedContent(prod);
    const prodEmbedding = prodRes.embedding.values;
    const sim = cosineSimilarity(queryEmbedding, prodEmbedding);
    console.log(`- Product: "${prod.split(',')[1]}"`);
    console.log(`  Similarity: ${sim.toFixed(4)}`);
  }

  // Expanded query
  const expandedQuery = "gaming notebooks, high-performance laptops, esports laptops, performance laptops, portable gaming rigs, mobile gaming stations, desktop replacement laptops, enthusiast laptops, overclockable laptops, VR-ready laptops";
  console.log(`\nExpanded Query: "${expandedQuery}"`);
  const expandedRes = await model.embedContent(expandedQuery);
  const expandedEmbedding = expandedRes.embedding.values;
  
  console.log('\n--- Cosine Similarities with EXPANDED Query ---');
  for (const prod of products) {
    const prodRes = await model.embedContent(prod);
    const prodEmbedding = prodRes.embedding.values;
    const sim = cosineSimilarity(expandedEmbedding, prodEmbedding);
    console.log(`- Product: "${prod.split(',')[1]}"`);
    console.log(`  Similarity: ${sim.toFixed(4)}`);
  }
}

run().catch(console.error);
