import dotenv from "dotenv";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt.js";
import { STAGES, validateResponse } from "./contract.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

if (process.env.MOCK !== "true" && !process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY environment variable. Set it, or set MOCK=true to run without one.");
    process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", corsOrigin);
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
    const stub = process.env.MOCK === "true";
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    res.json({ ok: true, stub, hasKey });
});

function extractJson(text) {
    let cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    return cleaned;
}

async function callModelOnce(client, userMessage, extraInstruction) {
    const response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1500,
        system: extraInstruction ? `${SYSTEM_PROMPT}\n\n${extraInstruction}` : SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
    });

    return response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
}

async function callAnthropic(growing, blocker, history) {
    const client = new Anthropic();
    const userMessage = JSON.stringify({ growing, blocker, history });

    const attempts = [
        undefined,
        "Your previous reply could not be used. Return ONLY raw JSON — no markdown fences, no commentary, no trailing text.",
    ];

    let lastError = "The model did not return a usable response.";

    for (let i = 0; i < attempts.length; i++) {
        const rawText = await callModelOnce(client, userMessage, attempts[i]);
        const cleaned = extractJson(rawText);

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (err) {
            console.error(`[callAnthropic] attempt ${i + 1}: JSON.parse failed. Raw output:`, rawText);
            lastError = "The model's reply wasn't valid JSON.";
            continue;
        }

        const result = validateResponse(parsed);
        if (!result.ok) {
            console.error(`[callAnthropic] attempt ${i + 1}: validation failed (${result.error}). Raw output:`, rawText);
            lastError = result.error;
            continue;
        }

        return result.value;
    }

    throw new Error(lastError);
}

app.post("/api/grow", async (req, res) => {
    const { growing, blocker, history } = req.body;

    if (!growing || !growing.trim()) {
        return res
            .status(400)
            .json({ error: "Tell me what you're growing first." });
    }

    if (process.env.MOCK === "true") {
        const stageIndex = Math.min(history?.length || 0, STAGES.length - 1);
        return res.json({
            stage: STAGES[stageIndex],
            principle: "Growth happens in stages",
            action: "Take the next small step",
            minutes: 15,
        });
    }

    try {
        const result = await callAnthropic(growing, blocker, history || []);
        res.json(result);
    } catch (error) {
        res.status(502).json({ error: error.message });
    }
});

const distPath = path.join(__dirname, "dist");
const distExists = fs.existsSync(distPath);

if (distExists) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) {
            return next();
        }
        res.sendFile(path.join(distPath, "index.html"));
    });
} else {
    app.get("/", (req, res) => {
        res.send(
            "<!DOCTYPE html><html><head><title>GROW</title></head><body><h1>GROW — server is live, frontend not deployed yet</h1></body></html>"
        );
    });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
