const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Exemplo mínimo: roteamento sequencial Anthropic-compatible.
const APIS = [
  {
    name: "nvidia",
    type: "openai",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    key: process.env.NVIDIA_API_KEY || "",
    model: "mistralai/mistral-small-4-119b-2603"
  },
  {
    name: "groq",
    type: "openai",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY || "",
    model: "llama3-70b-8192"
  },
  {
    name: "google",
    type: "gemini",
    key: process.env.GEMINI_API_KEY || "",
    model: "gemini-1.5-flash"
  },
  {
    name: "ollama",
    type: "openai",
    url: process.env.OLLAMA_URL || "http://localhost:11434/v1/chat/completions",
    model: "llama3"
  }
];

async function callOpenAI(api, messages) {
  const res = await axios.post(
    api.url,
    { model: api.model, messages },
    { headers: api.key ? { Authorization: `Bearer ${api.key}` } : {} }
  );

  return res.data.choices[0].message.content;
}

async function callGemini(api, messages) {
  const lastMessage = messages[messages.length - 1].content;

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${api.model}:generateContent?key=${api.key}`,
    { contents: [{ parts: [{ text: lastMessage }] }] }
  );

  return res.data.candidates[0].content.parts[0].text;
}

async function tryAPI(api, messages) {
  try {
    if (api.type === "openai") return await callOpenAI(api, messages);
    if (api.type === "gemini") return await callGemini(api, messages);
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.error?.message || err?.message;
    console.log(`❌ ${api.name} falhou${status ? ` (${status})` : ""}: ${detail}`);
    return null;
  }
}

app.post("/v1/messages", async (req, res) => {
  const messages = req.body.messages;

  for (const api of APIS) {
    const result = await tryAPI(api, messages);
    if (result) {
      console.log(`✅ usando ${api.name}`);
      return res.json({
        id: "msg_" + Date.now(),
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: result }]
      });
    }
  }

  res.status(500).json({ error: "todas APIs falharam" });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`🔥 Minimal proxy rodando na porta ${port}`);
});
