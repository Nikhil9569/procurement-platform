const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const result = await model.embedContent("Hello world");
    console.log("gemini-embedding-2 dimensions:", result.embedding.values.length);
  } catch (e) {
    console.log("gemini-embedding-2 error:", e.message);
  }
}

checkModels();
