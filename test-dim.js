require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_DIM);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

async function run() {
  const result = await model.embedContent("Hello world");
  console.log("gemini-embedding-2 length:", result.embedding.values.length);
}

run().catch(console.error);
