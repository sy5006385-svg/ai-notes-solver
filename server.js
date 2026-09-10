import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(express.static("."));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function askGemini(prompt) {
  const models = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash"
  ];

  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt
        });

        return response.text;
      } catch (err) {
        lastError = err;

        const message = err?.message || "";
        const retryable =
          message.includes("503") ||
          message.includes("UNAVAILABLE") ||
          message.includes("high demand") ||
          message.includes("429");

        if (!retryable) throw err;

        await new Promise(resolve =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError;
}

app.post("/api/ask", async (req, res) => {
  try {
    const {
      question,
      selectedText,
      pageText,
      history = []
    } = req.body;

    const prompt = `
You are a helpful AI study tutor.

Reply in simple Hinglish by default.
Explain concepts clearly and step-by-step.
For numerical questions, show calculation steps.

Student question:
${question || "Explain the selected content."}

Selected PDF text:
${selectedText || "(none)"}

Current PDF page context:
${(pageText || "").slice(0, 12000)}

Recent conversation:
${history
  .slice(-6)
  .map(x => `${x.role}: ${x.content}`)
  .join("\n")}
`;

    const answer = await askGemini(prompt);

    res.json({ answer });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "AI temporarily busy. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
