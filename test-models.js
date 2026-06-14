require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(name) {
  try {
    const model = genAI.getGenerativeModel({ model: name });
    const res = await model.embedContent("test");
    console.log(name, "SUCCESS, dimensions:", res.embedding.values.length);
  } catch(e) {
    console.log(name, "FAILED:", e.message);
  }
}

async function run() {
  await testModel("text-embedding-004");
  await testModel("embedding-001");
  await testModel("models/embedding-001");
  await testModel("models/text-embedding-004");
  await testModel("gemini-embedding-001");
  await testModel("gemini-embedding-2");
}
run();
