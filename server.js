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
For numerical questions, show all calculation steps.

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

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });

    res.json({
      answer: response.text
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err?.message || "Gemini request failed"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
