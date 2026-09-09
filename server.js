import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(express.static("."));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/ask", async (req, res) => {
  try {
    const { question, selectedText, pageText, history = [], image } = req.body;

    const input = [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: `You are a helpful study tutor. Reply in simple Hinglish by default.
Student question: ${question || "Explain the selected content."}
Selected notes text: ${selectedText || "(none)"}
Current PDF page context: ${(pageText || "").slice(0, 10000)}
Recent context: ${history.slice(-6).map(x => `${x.role}: ${x.content}`).join("\n")}

Explain clearly. For numerical questions, show steps. If an image is provided, analyze the visible study question or diagram.`
        },
        ...(image ? [{ type: "input_image", image_url: image }] : [])
      ]
    }];

    const response = await client.responses.create({
      model: "gpt-5",
      input
    });

    res.json({ answer: response.output_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "AI request failed" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`Running at http://localhost:${process.env.PORT || 3000}`)
);
