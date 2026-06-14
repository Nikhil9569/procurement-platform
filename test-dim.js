const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AQ.Ab8RN6KzjbkdF9lPfANyOQVamGUCA9G_4o1d0B0V7Xjodx1ojA");
const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

async function run() {
  const result = await model.embedContent("Hello world");
  console.log("gemini-embedding-2 length:", result.embedding.values.length);
}

run().catch(console.error);
