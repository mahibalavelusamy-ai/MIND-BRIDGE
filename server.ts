import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

function safeJsonParse(str: string, defaultVal: any) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultVal;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---

  app.post('/api/gemini/insight', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING },
              concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["status", "concerns", "recommendations"]
          }
        }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "");
      res.json(safeJsonParse(textStr, {}));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch insight" });
    }
  });

  app.post('/api/gemini/pattern', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              patterns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['cyclical', 'trend', 'behavioral'] },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    impact: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
                    confidence: { type: Type.NUMBER }
                  },
                  required: ['type', 'title', 'description', 'frequency', 'impact', 'confidence']
                }
              },
              anomalies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.STRING },
                    metric: { type: Type.STRING },
                    deviation: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
                  },
                  required: ['timestamp', 'metric', 'deviation', 'description', 'severity']
                }
              }
            },
            required: ['patterns', 'anomalies']
          }
        }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
      res.json(safeJsonParse(textStr, { patterns: [], anomalies: [] }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch pattern" });
    }
  });

  app.post('/api/gemini/predict', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictedRisk: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
              confidence: { type: Type.NUMBER, description: "Confidence score from 0-100" },
              predictedTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
              preemptiveActions: { type: Type.ARRAY, items: { type: Type.STRING } },
              evidence: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Logic points explaining the prediction" }
            },
            required: ['predictedRisk', 'confidence', 'predictedTriggers', 'preemptiveActions', 'evidence']
          }
        }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
      res.json(safeJsonParse(textStr, null));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to predict risk" });
    }
  });

  app.post('/api/gemini/recommend', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['activity', 'resource', 'strategy'] },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                    context: { type: Type.STRING },
                    actionLabel: { type: Type.STRING },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['type', 'title', 'description', 'priority', 'context', 'actionLabel', 'steps']
                }
              }
            },
            required: ['recommendations']
          }
        }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
      res.json(safeJsonParse(textStr, { recommendations: [] }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  app.post('/api/gemini/root-cause', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryFactor: { type: Type.STRING },
              explanation: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ['primaryFactor', 'explanation', 'confidence']
          }
        }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
      res.json(safeJsonParse(textStr, { primaryFactor: "General Adjustment", explanation: "", confidence: 0.7 }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to perform root cause analysis" });
    }
  });

  app.post('/api/gemini/supportive-summary', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "");
      res.json({ text: textStr });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  app.post('/api/gemini/progressive-questions', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "[]");
      res.json(safeJsonParse(textStr, []));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate progressive questions" });
    }
  });

  app.post('/api/gemini/analyze-progressive-assessment', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
      res.json(safeJsonParse(textStr, {}));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze progressive assessment" });
    }
  });

  app.post('/api/gemini/parse-syllabus', async (req, res) => {
    try {
      const { prompt, parts } = req.body;
      let finalParts: any[] = [];
      if (prompt) finalParts.push({ text: prompt });
      if (parts && Array.isArray(parts)) finalParts = finalParts.concat(parts);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: finalParts }
      });
      const rawText = (response as any).text;
      let textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
      textStr = textStr.replace(/```json/g, '').replace(/```/g, '').trim();
      res.json(safeJsonParse(textStr, { events: [], insights: [] }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to parse syllabus" });
    }
  });

  app.post('/api/gemini/analyze-emotion', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
      res.json(safeJsonParse(textStr, {}));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze emotion" });
    }
  });

  app.post('/api/gemini/analyze-assessment', async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const rawText = (response as any).text;
      const textStr = typeof rawText === 'function' ? rawText.call(response) : (rawText || "{}");
      res.json(safeJsonParse(textStr, { primaryFactor: "Unknown", recommendations: [] }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze assessment" });
    }
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
