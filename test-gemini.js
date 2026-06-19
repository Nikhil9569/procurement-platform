import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(key);

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  try {
    const result = await model.generateContent("Hello, are you working?");
    console.log("Success:", result.response.text());
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error.status) console.error("Status:", error.status);
    if (error.response) {
      try {
        console.error("Response:", await error.response.json());
      } catch (e) {
        console.error("Response text:", await error.response.text());
      }
    }
  }
}

main();
