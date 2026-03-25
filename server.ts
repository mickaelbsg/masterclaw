import express from "express";
import axios from "axios";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import util from "util";
import similarity from "cosine-similarity";
import dotenv from "dotenv";

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório de dados persistentes (para Docker)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
const OLLAMA_LAUNCH_CMD = process.env.OLLAMA_LAUNCH_CMD || "ollama launch claude";
const EXEC_SHELL = process.env.EXEC_SHELL || (process.platform === "win32" ? "cmd.exe" : "/bin/sh");
const STRICT_ROUTER = process.env.STRICT_ROUTER === "true";
let ollamaLaunchInFlight: Promise<void> | null = null;
let lastOllamaLaunchAttempt = 0;

async function runCommand(command: string, cwd?: string) {
  return execPromise(command, cwd ? { cwd, shell: EXEC_SHELL } : { shell: EXEC_SHELL });
}

const app = express();
app.use(cors());
app.use(express.json());

interface APIConfig {
  id: string;
  name: string;
  type: "openai" | "gemini" | "ollama";
  url?: string;
  key: string;
  model: string;
  enabled: boolean;
  max_chars?: number;
  temperature?: number;
}

function normalizeApiKey(key?: string) {
  if (!key) return "";
  return key.replace(/^Bearer\s+/i, "").trim();
}

const PERSIST_API_KEYS = process.env.PERSIST_API_KEYS === "true";

function getEnvVarNameForApi(api: Partial<APIConfig>) {
  const name = (api.name || "").toLowerCase();
  if (name === "google" || name === "gemini") return "GEMINI_API_KEY";
  if (name === "nvidia") return "NVIDIA_API_KEY";
  if (name === "groq") return "GROQ_API_KEY";
  return null;
}

function resolveApiKey(api: Partial<APIConfig>, previousKey = "") {
  const directKey = normalizeApiKey(api.key);
  const envVarName = getEnvVarNameForApi(api);
  const envKey = envVarName ? normalizeApiKey(process.env[envVarName] || "") : "";
  const fallbackKey = normalizeApiKey(previousKey);

  return directKey || envKey || fallbackKey || "";
}

function normalizeApiConfig(api: any, previous?: APIConfig): APIConfig {
  return {
    ...api,
    enabled: api.enabled !== undefined ? api.enabled : true,
    key: resolveApiKey(api, previous?.key || "")
  };
}

function serializeApiConfig(api: APIConfig): APIConfig {
  return {
    ...api,
    key: PERSIST_API_KEYS ? normalizeApiKey(api.key) : ""
  };
}

function getApiErrorDetails(err: any) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (!data) {
    return {
      status: status || null,
      detail: err?.message || "Erro desconhecido ao chamar API"
    };
  }

  const detail =
    data?.error?.message ||
    data?.detail ||
    data?.title ||
    data?.message ||
    JSON.stringify(data);

  return { status: status || null, detail };
}

async function isOllamaReachable() {
  try {
    await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

async function ensureOllamaReady() {
  if (await isOllamaReachable()) return;

  if (ollamaLaunchInFlight) {
    await ollamaLaunchInFlight;
    return;
  }

  const now = Date.now();
  if (now - lastOllamaLaunchAttempt < 5000) {
    // Evita spam de launch em cascata quando várias requests chegam juntas.
    return;
  }

  lastOllamaLaunchAttempt = now;
  ollamaLaunchInFlight = (async () => {
    try {
      console.log(`🦙 Ollama indisponível. Tentando iniciar automaticamente: "${OLLAMA_LAUNCH_CMD}"`);
      const { stdout, stderr } = await runCommand(OLLAMA_LAUNCH_CMD);
      if (stdout) console.log(`🦙 Ollama launch stdout: ${stdout.trim()}`);
      if (stderr) console.log(`🦙 Ollama launch stderr: ${stderr.trim()}`);
    } catch (err: any) {
      console.log(`❌ Falha ao iniciar Ollama automaticamente: ${err?.message || "erro desconhecido"}`);
    }
  })();

  try {
    await ollamaLaunchInFlight;
  } finally {
    ollamaLaunchInFlight = null;
  }

  const ready = await isOllamaReachable();
  if (!ready) {
    throw new Error(`Ollama não está disponível em ${OLLAMA_BASE_URL} após tentativa automática`);
  }
}

// --- CONFIG CENTRAL ---
let APIS: APIConfig[] = [
  {
    id: "1",
    name: "nvidia",
    type: "openai",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    key: process.env.NVIDIA_API_KEY || "",
    model: "mistralai/mistral-small-4-119b-2603",
    enabled: true,
    max_chars: 8000,
    temperature: 0.2
  },
  {
    id: "2",
    name: "groq",
    type: "openai",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY || "",
    model: "llama3-70b-8192",
    enabled: true,
    max_chars: 4000,
    temperature: 0.1
  },
  {
    id: "3",
    name: "google",
    type: "gemini",
    key: process.env.GEMINI_API_KEY || "",
    model: "gemini-1.5-flash",
    enabled: true,
    max_chars: 12000,
    temperature: 0.7
  },
  {
    id: "4",
    name: "ollama",
    type: "ollama",
    url: `${OLLAMA_BASE_URL}/v1/chat/completions`,
    key: "",
    model: "llama3",
    enabled: false,
    max_chars: 2000,
    temperature: 0.5
  }
];

// --- CONFIG PERSISTENCE ---
async function loadConfig() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(path.join(DATA_DIR, "config.json"), "utf-8");
    const savedConfig = JSON.parse(data);
    const currentApis = APIS;
    APIS = savedConfig.map((api: any) => {
      const previous = currentApis.find((a) => a.id === api.id || a.name === api.name);
      return normalizeApiConfig(api, previous);
    });
    console.log(`⚙️ Configuração carregada: ${APIS.length} APIs.`);
  } catch (err) {
    console.log("📝 Usando configuração padrão (config.json não encontrado)");
  }
}

async function saveConfigFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const configToPersist = APIS.map(serializeApiConfig);
  await fs.writeFile(path.join(DATA_DIR, "config.json"), JSON.stringify(configToPersist, null, 2));
  console.log(`💾 Configuração salva em config.json${PERSIST_API_KEYS ? "" : " (sem API keys)"}`);
}

loadConfig();

// --- SMART CACHE ---
const smartCache: { embedding: number[], response: string, text: string }[] = [];

// --- MEMORY ENGINE (Bugs, Decisões, Soluções) ---
interface MemoryEntry {
  id: string;
  input: string;
  solution: string;
  type: "bug" | "decision" | "solution";
  tags: string[];
  embedding?: number[];
  score: number;
  hits: number;
  fails: number;
  createdAt: number;
}

let MEMORY: MemoryEntry[] = [];

async function loadMemory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(path.join(DATA_DIR, "memory.json"), "utf-8");
    MEMORY = JSON.parse(data);
    console.log(`🧠 Memória carregada: ${MEMORY.length} entradas.`);
  } catch (err) {
    MEMORY = [];
  }
}

async function saveMemoryFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "memory.json"), JSON.stringify(MEMORY, null, 2));
}

async function checkMemory(text: string) {
  const embedding = await getEmbedding(text);
  if (!embedding) return null;

  let bestMatch = null;
  let highestFinalScore = 0;
  const now = Date.now();

  for (const item of MEMORY) {
    if (!item.embedding) continue;
    
    // 1. Similaridade de Cosseno (0 a 1)
    const similarityScore = similarity(embedding, item.embedding);
    
    // 2. Confiança baseada em Hits/Fails (Normalizado de -1 a 1, depois para 0 a 1)
    const confidence = item.hits - item.fails;
    const confidenceScore = Math.tanh(confidence / 5); // Suaviza a curva de confiança
    const normalizedConfidence = (confidenceScore + 1) / 2;

    // 3. Recência (Mais novo = maior score)
    const ageInDays = (now - (item.createdAt || now)) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-ageInDays / 30); // Decaimento exponencial em 30 dias

    // CÁLCULO FINAL: 70% Similaridade, 20% Confiança, 10% Recência
    const finalScore = (similarityScore * 0.7) + (normalizedConfidence * 0.2) + (recencyScore * 0.1);

    // Threshold de segurança: similaridade mínima de 0.82 e score global positivo
    if (similarityScore > 0.82 && finalScore > highestFinalScore && (item.score || 0) >= -2) {
      highestFinalScore = finalScore;
      bestMatch = item;
    }
  }

  if (bestMatch) {
    console.log(`🧠 MEMORY HIT (Final Score: ${highestFinalScore.toFixed(4)}) para: "${text}"`);
    return {
      id: bestMatch.id,
      text: `[MEMÓRIA: ${bestMatch.type.toUpperCase()}]\n${bestMatch.solution}`,
      type: bestMatch.type,
      score: highestFinalScore,
      confidence: bestMatch.hits - bestMatch.fails
    };
  }
  return null;
}

loadMemory();

// --- STATS ---
let STATS = {
  totalRequests: 0,
  cacheHits: 0,
  memoryHits: 0,
  totalTokens: 0,
  totalCost: 0, // USD
  totalSavings: 0, // USD
  avgLatency: 0,
  latencies: [] as number[],
  modelUsage: {} as { [key: string]: number },
  intentDistribution: { fast: 0, smart: 0 } as { [key: string]: number }
};

const MODEL_COSTS: { [key: string]: { input: number, output: number } } = {
  "mistralai/mistral-small-4-119b-2603": { input: 0.0002, output: 0.0006 },
  "llama3-70b-8192": { input: 0.00059, output: 0.00079 },
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  "llama3": { input: 0, output: 0 }, // Local
  "smart_cache": { input: 0, output: 0 }
};

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function updateStats(latency: number, isCache: boolean, model: string, inputText: string, outputText: string) {
  STATS.totalRequests++;
  
  // Track model usage
  STATS.modelUsage[model] = (STATS.modelUsage[model] || 0) + 1;

  if (isCache) {
    if (model === "memory") STATS.memoryHits++;
    else STATS.cacheHits++;
    
    const tokens = estimateTokens(inputText) + estimateTokens(outputText);
    const cost = (MODEL_COSTS["llama3-70b-8192"].input * estimateTokens(inputText) / 1000) + 
                 (MODEL_COSTS["llama3-70b-8192"].output * estimateTokens(outputText) / 1000);
    STATS.totalSavings += cost;
  } else {
    const costConfig = MODEL_COSTS[model] || { input: 0.0005, output: 0.0015 };
    const inputTokens = estimateTokens(inputText);
    const outputTokens = estimateTokens(outputText);
    const cost = (costConfig.input * inputTokens / 1000) + (costConfig.output * outputTokens / 1000);
    STATS.totalTokens += (inputTokens + outputTokens);
    STATS.totalCost += cost;
  }
  
  STATS.latencies.push(latency);
  if (STATS.latencies.length > 50) STATS.latencies.shift();
  STATS.avgLatency = STATS.latencies.reduce((a, b) => a + b, 0) / STATS.latencies.length;
}

// --- TUNING: INTENT CLASSIFICATION ---
async function classifyIntent(text: string): Promise<"fast" | "smart"> {
  const fastApi = APIS.find(a => a.name === "google" || a.name === "groq");
  if (!fastApi || !fastApi.key) return "smart";

  try {
    const prompt = `Classifique a intenção do usuário em 'fast' ou 'smart'.
'fast': Perguntas simples, saudações, refactors básicos, explicações curtas.
'smart': Lógica complexa, depuração de bugs difíceis, arquitetura, escrita de arquivos grandes.
Responda APENAS com a palavra 'fast' ou 'smart'.
Usuário: ${text}`;

    const result = await tryAPI(fastApi, [{ role: "user", content: prompt }]);
    const intent = result?.toLowerCase().includes("fast") ? "fast" : "smart";
    STATS.intentDistribution[intent]++;
    return intent;
  } catch {
    return "smart";
  }
}

// --- TUNING: CONTEXT COMPRESSION ---
async function compressHistory(history: any[]) {
  if (history.length < 10) return history;

  const fastApi = APIS.find(a => a.name === "google" || a.name === "groq");
  if (!fastApi || !fastApi.key) return history.slice(-6); // Fallback: trim

  try {
    const toCompress = history.slice(0, -4);
    const keep = history.slice(-4);
    
    const prompt = `Resuma as mensagens anteriores desta conversa de forma técnica e concisa, mantendo fatos importantes e decisões tomadas.
Histórico: ${JSON.stringify(toCompress)}`;

    const summary = await tryAPI(fastApi, [{ role: "user", content: prompt }]);
    return [
      { role: "system", content: `Resumo do histórico anterior: ${summary}` },
      ...keep
    ];
  } catch {
    return history.slice(-6);
  }
}

async function getEmbedding(text: string) {
  // Tenta Ollama primeiro
  const ollamaApi = APIS.find(a => a.type === "ollama" && a.enabled);
  if (ollamaApi) {
    try {
      await ensureOllamaReady();
      const res = await axios.post(`${OLLAMA_BASE_URL}/api/embeddings`, {
        model: "nomic-embed-text",
        prompt: text
      });
      return res.data.embedding;
    } catch (err) {
      console.log("⚠️ Ollama embedding falhou, tentando Gemini...");
    }
  }

  // Fallback para Gemini
  const geminiApi = APIS.find(a => a.type === "gemini" && a.enabled && a.key);
  if (geminiApi) {
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApi.key}`,
        {
          content: { parts: [{ text }] }
        }
      );
      return res.data.embedding.values;
    } catch (err) {
      console.log("⚠️ Gemini embedding falhou");
    }
  }

  return null;
}

async function checkSmartCache(text: string) {
  const embedding = await getEmbedding(text);
  if (!embedding) return null;

  for (const item of smartCache) {
    const score = similarity(embedding, item.embedding);
    if (score > 0.92) {
      console.log(`🧠 SMART CACHE HIT (score: ${score.toFixed(4)}) para: "${text}"`);
      return item.response;
    }
  }
  return null;
}

async function saveSmartCache(text: string, response: string) {
  const embedding = await getEmbedding(text);
  if (embedding) {
    smartCache.push({ embedding, response, text });
    if (smartCache.length > 100) smartCache.shift(); // Limite simples
  }
}

// --- UTILS ---

function limitMessages(messages: any[], maxChars: number) {
  let total = 0;
  const result = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i].content || "";
    total += typeof content === 'string' ? content.length : JSON.stringify(content).length;
    if (total > maxChars && result.length > 0) break; // Garante pelo menos a última msg
    result.unshift(messages[i]);
  }

  return result;
}

// --- ADAPTADORES ---

async function callOpenAI(api: any, messages: any, stream = false) {
  const limitedMessages = limitMessages(messages, api.max_chars || 5000);
  const authKey = normalizeApiKey(api.key);
  if (api.type === "ollama") {
    await ensureOllamaReady();
  }
  const requestUrl = api.url || `${OLLAMA_BASE_URL}/v1/chat/completions`;
  
  const res = await axios.post(requestUrl, {
    model: api.model,
    messages: limitedMessages,
    temperature: api.temperature || 0.7,
    stream: stream
  }, {
    headers: authKey ? { Authorization: `Bearer ${authKey}` } : {},
    responseType: stream ? 'stream' : 'json'
  });

  if (stream) return res.data;
  return res.data.choices[0].message.content;
}

async function callGemini(api: any, messages: any, stream = false) {
  const limitedMessages = limitMessages(messages, api.max_chars || 10000);
  const lastMessage = limitedMessages[limitedMessages.length - 1].content;
  const model = api.model || "gemini-1.5-flash";
  const authKey = normalizeApiKey(api.key);
  
  const endpoint = stream ? "streamGenerateContent" : "generateContent";
  
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${authKey}`,
    {
      contents: [{ parts: [{ text: lastMessage }] }],
      generationConfig: {
        temperature: api.temperature || 0.7
      }
    },
    { responseType: stream ? 'stream' : 'json' }
  );

  if (stream) return res.data;
  return res.data.candidates[0].content.parts[0].text;
}

// --- ROUTER ---

async function tryAPI(api: any, messages: any, stream = false, logContext = "") {
  try {
    if (api.type === "openai" || api.type === "ollama") {
      return await callOpenAI(api, messages, stream);
    }

    if (api.type === "gemini") {
      return await callGemini(api, messages, stream);
    }
  } catch (err: any) {
    const parsed = getApiErrorDetails(err);
    const prefix = logContext ? `[${logContext}] ` : "";
    console.log(`❌ ${prefix}${api.name} falhou (${parsed.status || "unknown"}): ${parsed.detail}`);
    return null;
  }
}

// --- ENDPOINTS API ---

app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/api/stats", (req, res) => {
  res.json(STATS);
});

app.post("/api/config/test/:id", async (req, res) => {
  const { id } = req.params;
  const api = APIS.find(a => a.id === id);
  if (!api) return res.status(404).json({ error: "API não encontrada" });

  try {
    const start = Date.now();
    let result: any = null;

    if (api.type === "openai" || api.type === "ollama") {
      result = await callOpenAI(api, [{ role: "user", content: "Ping" }]);
    } else if (api.type === "gemini") {
      result = await callGemini(api, [{ role: "user", content: "Ping" }]);
    }

    const latency = Date.now() - start;

    if (!result) throw new Error("Resposta vazia da API");
    res.json({ success: true, latency, model: api.model });
  } catch (err: any) {
    const parsed = getApiErrorDetails(err);
    console.log(`❌ Teste ${api.name} falhou: ${parsed.status || "unknown"} - ${parsed.detail}`);
    res.status(parsed.status || 500).json({
      error: "Falha no teste",
      detail: parsed.detail,
      status: parsed.status,
      provider: api.name
    });
  }
});

app.get("/api/config", (req, res) => {
  res.json(APIS);
});

app.get("/api/config/models/:id", async (req, res) => {
  const { id } = req.params;
  const api = APIS.find(a => a.id === id);
  if (!api) return res.status(404).json({ error: "API não encontrada" });

  try {
    if (api.type === "gemini") {
      const authKey = normalizeApiKey(api.key);
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${authKey}`;
      const response = await axios.get(listUrl);
      const models = (response.data.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => (m.name || "").replace(/^models\//, ""))
        .filter(Boolean);

      return res.json({ models: Array.from(new Set(models)).sort() });
    }

    if (api.type === "openai" || api.type === "ollama") {
      if (!api.url) {
        return res.status(400).json({ error: "API sem URL configurada" });
      }

      const parsedUrl = new URL(api.url);
      parsedUrl.pathname = parsedUrl.pathname.replace(/\/chat\/completions\/?$/, "/models");
      if (!/\/models$/.test(parsedUrl.pathname)) parsedUrl.pathname = "/v1/models";

      const authKey = normalizeApiKey(api.key);
      const response = await axios.get(parsedUrl.toString(), {
        headers: authKey ? { Authorization: `Bearer ${authKey}` } : {}
      });

      const data = response.data?.data || response.data?.models || [];
      const models = data
        .map((m: any) => m.id || m.name)
        .filter(Boolean);

      return res.json({ models: Array.from(new Set(models)).sort() });
    }

    return res.status(400).json({ error: "Tipo de API não suportado para listagem" });
  } catch (err: any) {
    const parsed = getApiErrorDetails(err);
    res.status(parsed.status || 500).json({
      error: "Falha ao listar modelos",
      detail: parsed.detail,
      status: parsed.status
    });
  }
});

// --- MEMORY ENDPOINTS ---
app.get("/api/memory", (req, res) => {
  res.json(MEMORY);
});

app.post("/api/memory", async (req, res) => {
  const { input, solution, type, tags } = req.body;
  const embedding = await getEmbedding(input);
  const newEntry: MemoryEntry = {
    id: Date.now().toString(),
    input,
    solution,
    type,
    tags: tags || [],
    embedding,
    score: 1,
    hits: 0,
    fails: 0,
    createdAt: Date.now()
  };
  MEMORY.push(newEntry);
  await saveMemoryFile();
  res.json(newEntry);
});

// --- FEEDBACK ENDPOINT ---
app.post("/api/memory/:id/feedback", async (req, res) => {
  const { id } = req.params;
  const { helpful } = req.body; // boolean
  
  const index = MEMORY.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: "Memória não encontrada" });

  if (helpful) {
    MEMORY[index].score += 2;
    MEMORY[index].hits += 1;
  } else {
    MEMORY[index].score -= 1;
    MEMORY[index].fails += 1;
  }

  await saveMemoryFile();
  res.json({ success: true, newScore: MEMORY[index].score });
});

app.delete("/api/memory/:id", async (req, res) => {
  MEMORY = MEMORY.filter(m => m.id !== req.params.id);
  await saveMemoryFile();
  res.json({ success: true });
});

app.get("/api/memory/download", async (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, "memory.json");
    res.download(filePath, "masterclaw_memory.json");
  } catch (err) {
    res.status(500).json({ error: "Erro ao baixar arquivo de memória" });
  }
});

app.post("/api/memory/upload", async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) throw new Error("Formato inválido");
    
    // Re-calcula embeddings se faltarem (opcional, mas bom para integridade)
    for (const item of data) {
      if (!item.embedding) {
        item.embedding = await getEmbedding(item.input);
      }
      // Garante campos de ranking
      if (item.score === undefined) item.score = 1;
      if (item.hits === undefined) item.hits = 0;
      if (item.fails === undefined) item.fails = 0;
      if (item.createdAt === undefined) item.createdAt = Date.now();
    }
    
    MEMORY = data;
    await saveMemoryFile();
    res.json({ success: true, count: MEMORY.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/agent/execute", async (req, res) => {
  const { command, workingDir } = req.body;
  const currentDir = workingDir || process.cwd();

  if (command.startsWith("READ:")) {
    const fileName = command.replace("READ:", "").trim();
    try {
      const content = await fs.readFile(path.join(currentDir, fileName), "utf-8");
      return res.json({ text: `Lendo ${fileName}:\n\n${content}` });
    } catch (err: any) {
      return res.json({ text: `Erro ao ler arquivo: ${err.message}` });
    }
  }

  if (command.startsWith("WRITE:")) {
    const lines = command.split("\n");
    const fileName = lines[0].replace("WRITE:", "").trim();
    const content = lines.slice(1).join("\n");
    try {
      await fs.writeFile(path.join(currentDir, fileName), content, "utf-8");
      return res.json({ text: `Arquivo ${fileName} escrito com sucesso!` });
    } catch (err: any) {
      return res.json({ text: `Erro ao escrever arquivo: ${err.message}` });
    }
  }

  if (command.startsWith("EXEC:")) {
    const cmd = command.replace("EXEC:", "").trim();
    try {
      const { stdout, stderr } = await runCommand(cmd, currentDir);
      return res.json({ text: `Executado: ${cmd}\n\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}` });
    } catch (err: any) {
      return res.json({ text: `Erro ao executar comando: ${err.message}` });
    }
  }

  res.status(400).json({ error: "Comando inválido" });
});

// Suporta tanto adicionar uma única API quanto atualizar a lista inteira (bulk)
app.post("/api/config", async (req, res) => {
  if (Array.isArray(req.body)) {
    APIS = req.body.map((api) => {
      const existing = APIS.find((a) => a.id === api.id || a.name === api.name);
      return normalizeApiConfig(
        {
          ...api,
          id: api.id || Math.random().toString(36).substr(2, 9)
        },
        existing
      );
    });
    console.log("🔥 APIs atualizadas via bulk upload");
    await saveConfigFile();
    return res.json({ success: true, count: APIS.length });
  }

  const newApi = normalizeApiConfig({
    ...req.body,
    id: Math.random().toString(36).substr(2, 9),
    enabled: true
  });
  APIS.push(newApi);
  await saveConfigFile();
  res.json(newApi);
});

app.put("/api/config/:id", async (req, res) => {
  const { id } = req.params;
  APIS = APIS.map((api) => {
    if (api.id !== id) return api;
    return normalizeApiConfig({ ...api, ...req.body }, api);
  });
  await saveConfigFile();
  res.json({ success: true });
});

app.delete("/api/config/:id", async (req, res) => {
  const { id } = req.params;
  APIS = APIS.filter(api => api.id !== id);
  await saveConfigFile();
  res.json({ success: true });
});

// --- DEPENDENCY MANAGER ---
const DEPENDENCIES = [
  { id: "node", name: "Node.js (>= 18)", check: "node -v", install: { ubuntu: "sudo apt install nodejs", macos: "brew install node", windows: "winget install OpenJS.NodeJS" } },
  { id: "git", name: "Git", check: "git --version", install: { ubuntu: "sudo apt install git", macos: "brew install git", windows: "winget install Git.Git" } },
  { id: "claude", name: "Claude Code CLI", check: "claude --version", install: { all: "npm install -g @anthropic-ai/claude-code" } },
  { id: "docker", name: "Docker", check: "docker --version", install: { ubuntu: "sudo apt install docker.io", macos: "brew install --cask docker", windows: "winget install Docker.DockerDesktop" } },
  { id: "tsc", name: "TypeScript Compiler", check: "tsc -v", install: { all: "npm install -g typescript" } }
];

app.get("/api/deps", async (req, res) => {
  const results = await Promise.all(DEPENDENCIES.map(async (dep) => {
    try {
      const { stdout } = await runCommand(dep.check);
      return { ...dep, installed: true, version: stdout.trim() };
    } catch (err) {
      return { ...dep, installed: false, version: null };
    }
  }));
  res.json(results);
});

app.post("/api/deps/install", async (req, res) => {
  const { id, os } = req.body;
  const dep = DEPENDENCIES.find(d => d.id === id);
  if (!dep) return res.status(404).json({ error: "Dependência não encontrada" });

  const installCmd = (dep.install as any)[os] || (dep.install as any).all;
  if (!installCmd) return res.status(400).json({ error: `Instalação não disponível para ${os}` });

  try {
    const { stdout, stderr } = await runCommand(installCmd);
    res.json({ success: true, stdout, stderr });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- FILE SYSTEM API ---
// Validação de path traversal: garante que o path esteja dentro do diretório do projeto

const PROJECT_ROOT = process.cwd();

function validatePath(requestedPath: string): string {
  const resolvedPath = path.resolve(requestedPath);
  const realPath = fsSync.realpathSync(resolvedPath).replace(/\\/g, '/');
  const projectRoot = PROJECT_ROOT.replace(/\\/g, '/');

  if (!realPath.startsWith(projectRoot)) {
    throw new Error(`Path traversal detectado: acesso fora do diretório do projeto (${projectRoot})`);
  }

  return resolvedPath;
}

app.get("/api/fs/ls", async (req, res) => {
  const dirPath = (req.query.path as string) || process.cwd();
  try {
    const validatedPath = validatePath(dirPath);
    const files = await fs.readdir(validatedPath, { withFileTypes: true });
    const result = files.map(f => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      path: path.join(validatedPath, f.name)
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/fs/read", async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: "Path is required" });
  try {
    const validatedPath = validatePath(filePath);
    const content = await fs.readFile(validatedPath, "utf-8");
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fs/write", async (req, res) => {
  const { path: filePath, content } = req.body;
  try {
    const validatedPath = validatePath(filePath);
    await fs.writeFile(validatedPath, content, "utf-8");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- STREAMING HANDLER WITH INTELLIGENT FALLBACK ---

async function streamWithFallback(apis: any[], messages: any[], res: any, onComplete: (fullText: string, model: string) => void, logContext = "") {
  let fullText = "";
  let usedModel = "";

  const tryNextStream = async (startIndex: number, partialText = "") => {
    if (startIndex >= apis.length) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Todas as APIs falharam no stream' })}\n\n`);
      res.end();
      return;
    }

    const api = apis[startIndex];
    if (!api.enabled || (!api.key && api.name !== 'ollama')) {
      return tryNextStream(startIndex + 1, partialText);
    }

    const prefix = logContext ? `[${logContext}] ` : "";
    console.log(`🚀 ${prefix}Tentando stream com ${api.name} (index: ${startIndex})`);
    
    // Se for um fallback no meio, ajustamos o prompt para continuar
    let currentMessages = [...messages];
    if (partialText) {
      currentMessages.push({ role: "assistant", content: partialText });
      currentMessages.push({ role: "user", content: "Continue exatamente de onde parou, sem repetir o que já foi dito." });
      res.write(`data: ${JSON.stringify({ type: 'system', message: `⚠️ Conexão instável. Trocando para ${api.name}...` })}\n\n`);
    }

    try {
      const result = await tryAPI(api, currentMessages, true, logContext);
      if (!result) throw new Error("Falha ao iniciar stream");

      usedModel = api.model;
      console.log(`✅ ${prefix}stream conectado via ${api.name} (${api.model})`);
      let stallTimer: any;

      const resetStallTimer = () => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          console.log(`⚠️ Stream de ${api.name} estagnou. Trocando...`);
          if (result.destroy) result.destroy(); 
          tryNextStream(startIndex + 1, fullText);
        }, 4000); // 4 segundos sem dados = stall
      };

      resetStallTimer();

      if (api.type === 'openai' || api.type === 'ollama') {
        result.on('data', (chunk: any) => {
          resetStallTimer();
          const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
          for (const line of lines) {
            const msg = line.replace(/^data: /, '');
            if (msg === '[DONE]') continue;
            try {
              const parsed = JSON.parse(msg);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: content }, model: usedModel })}\n\n`);
              }
            } catch (e) {}
          }
        });
      } else if (api.type === 'gemini') {
        result.on('data', (chunk: any) => {
          resetStallTimer();
          try {
            const str = chunk.toString();
            const matches = str.match(/"text":\s*"([^"]+)"/g);
            if (matches) {
              for (const match of matches) {
                const text = match.split('"')[3].replace(/\\n/g, '\n');
                fullText += text;
                res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: text }, model: usedModel })}\n\n`);
              }
            }
          } catch (e) {}
        });
      }

      result.on('end', () => {
        clearTimeout(stallTimer);
        onComplete(fullText, usedModel);
        res.write('data: [DONE]\n\n');
        res.end();
      });

      result.on('error', (err: any) => {
        console.log(`❌ Erro no stream de ${api.name}: ${err.message}`);
        clearTimeout(stallTimer);
        tryNextStream(startIndex + 1, fullText);
      });

      result.on('close', () => {
        clearTimeout(stallTimer);
        stallTimer = null as any;
      });

    } catch (err) {
      console.log(`❌ Falha ao conectar stream com ${api.name}`);
      return tryNextStream(startIndex + 1, partialText);
    }
  };

  await tryNextStream(0);
}

// --- AGENT ENDPOINT (CLAUDE CODE SIMULATOR) ---

async function getFileContext(dir: string) {
  try {
    const files = await fs.readdir(dir);
    return files.join(", ");
  } catch {
    return "Nenhum arquivo encontrado ou diretório inválido.";
  }
}

app.post("/api/agent/chat", async (req, res) => {
  const { message, history, workingDir, stream } = req.body;
  const currentDir = workingDir || process.cwd();
  const start = Date.now();
  const requestId = `agent-${Date.now().toString(36)}`;

  // Check Smart Cache
  const cached = await checkSmartCache(message);
  if (cached) {
    const latency = Date.now() - start;
    updateStats(latency, true, "smart_cache", message, cached);
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: cached }, model: 'smart_cache', latency })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.json({ text: cached, model: "smart_cache", latency });
  }

  // Check Memory Engine
  const memoryHit = await checkMemory(message);
  if (memoryHit) {
    const latency = Date.now() - start;
    updateStats(latency, true, "memory", message, memoryHit.text);
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: memoryHit.text }, model: 'memory', latency })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.json({ text: memoryHit.text, model: "memory", latency });
  }

  const context = await getFileContext(currentDir);
  const compressedHistory = STRICT_ROUTER ? history : await compressHistory(history);

  const systemPrompt = `Você é o Claude Code, um assistente de terminal focado em programação.
Diretório atual: ${currentDir}
Arquivos no diretório: ${context}

Regras:
1. Se precisar ler um arquivo, responda APENAS: READ: nome_do_arquivo
2. Se precisar escrever, responda: WRITE: nome_do_arquivo\nCONTEUDO
3. Se quiser rodar um comando, responda: EXEC: comando
4. Se você resolveu um bug ou tomou uma decisão técnica importante, responda no final: MEMORY_SAVE: tipo | tags | solução
   Exemplo: MEMORY_SAVE: bug | postgres, docker | Corrigido erro de conexão alterando a porta para 5432.
5. Caso contrário, responda normalmente.
Sempre use a nossa configuração de APIs roteadas.`;

  const messages = [
    { role: "user", content: systemPrompt },
    ...compressedHistory,
    { role: "user", content: message }
  ];
  const orderedApis = [...APIS];

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await streamWithFallback(orderedApis, messages, res, async (fullText, model) => {
      const latency = Date.now() - start;
      updateStats(latency, false, model, message, fullText);
      
      // Auto-save memory if requested in stream
      if (fullText.includes("MEMORY_SAVE:")) {
        const parts = fullText.split("MEMORY_SAVE:")[1].trim().split("|");
        if (parts.length >= 3) {
          const type = parts[0].trim().toLowerCase() as any;
          const tags = parts[1].trim().split(",").map(t => t.trim());
          const solution = parts.slice(2).join("|").trim();
          const embedding = await getEmbedding(message);
          const newEntry: MemoryEntry = {
            id: Date.now().toString(),
            input: message,
            solution,
            type: ["bug", "decision", "solution"].includes(type) ? type : "solution",
            tags,
            embedding,
            score: 1,
            hits: 0,
            fails: 0,
            createdAt: Date.now()
          };
          MEMORY.push(newEntry);
          await saveMemoryFile();
        }
      }

      if (!fullText.startsWith("READ:") && !fullText.startsWith("WRITE:") && !fullText.startsWith("EXEC:")) {
        saveSmartCache(message, fullText);
      }
    }, requestId);
    return;
  }

  let aiResponse = "";
  let usedModel = "";

  // Usa a ordem definida no painel (drag & drop) também no modo non-stream
  for (const api of orderedApis) {
    if (!api.enabled || (!api.key && api.name !== "ollama")) continue;
    const result = await tryAPI(api, messages, false, requestId);
    if (result) {
      aiResponse = result;
      usedModel = api.model;
      console.log(`✅ [${requestId}] resposta final via ${api.name} (${api.model})`);
      break;
    }
  }

  if (!aiResponse) return res.status(500).json({ error: "APIs falharam" });

  const latency = Date.now() - start;
  updateStats(latency, false, usedModel, message, aiResponse);

  // Save to Smart Cache (only if it's a normal response, not a command)
  if (!aiResponse.startsWith("READ:") && !aiResponse.startsWith("WRITE:") && !aiResponse.startsWith("EXEC:")) {
    await saveSmartCache(message, aiResponse);
  }

  // Lógica de execução de comandos
  if (aiResponse.includes("MEMORY_SAVE:")) {
    const parts = aiResponse.split("MEMORY_SAVE:")[1].trim().split("|");
    if (parts.length >= 3) {
      const type = parts[0].trim().toLowerCase() as any;
      const tags = parts[1].trim().split(",").map(t => t.trim());
      const solution = parts.slice(2).join("|").trim();
      
      const embedding = await getEmbedding(message);
      const newEntry: MemoryEntry = {
        id: Date.now().toString(),
        input: message,
        solution,
        type: ["bug", "decision", "solution"].includes(type) ? type : "solution",
        tags,
        embedding,
        score: 1,
        hits: 0,
        fails: 0,
        createdAt: Date.now()
      };
      MEMORY.push(newEntry);
      await saveMemoryFile();
      console.log("🧠 Memória automática salva!");
    }
  }

  if (aiResponse.startsWith("READ:")) {
    const fileName = aiResponse.replace("READ:", "").trim();
    try {
      const content = await fs.readFile(path.join(currentDir, fileName), "utf-8");
      return res.json({ text: `Lendo ${fileName}:\n\n${content}`, model: usedModel });
    } catch (err: any) {
      return res.json({ text: `Erro ao ler arquivo: ${err.message}`, model: usedModel });
    }
  }

  if (aiResponse.startsWith("WRITE:")) {
    const lines = aiResponse.split("\n");
    const fileName = lines[0].replace("WRITE:", "").trim();
    const content = lines.slice(1).join("\n");
    try {
      await fs.writeFile(path.join(currentDir, fileName), content, "utf-8");
      
      // --- TUNING: SELF-HEALING ---
      // Tenta rodar um lint ou build básico se for arquivo TS/JS
      if (fileName.endsWith(".ts") || fileName.endsWith(".tsx") || fileName.endsWith(".js")) {
        try {
          console.log(`🛠️ Self-healing: Validando ${fileName}...`);
          // Tenta rodar o lint do projeto ou tsc
          await runCommand("npx tsc --noEmit", currentDir);
          return res.json({ text: `Arquivo ${fileName} escrito e validado com sucesso! (Self-healing OK)`, model: usedModel });
        } catch (lintErr: any) {
          console.log(`⚠️ Self-healing detectou erro em ${fileName}`);
          return res.json({ 
            text: `Arquivo escrito, mas o SELF-HEALING detectou erros:\n\n${lintErr.stdout || lintErr.message}\n\nPor favor, corrija os erros acima.`, 
            model: usedModel,
            isHealingError: true 
          });
        }
      }

      return res.json({ text: `Arquivo ${fileName} escrito com sucesso!`, model: usedModel });
    } catch (err: any) {
      return res.json({ text: `Erro ao escrever arquivo: ${err.message}`, model: usedModel });
    }
  }

  if (aiResponse.startsWith("EXEC:")) {
    const command = aiResponse.replace("EXEC:", "").trim();
    try {
      const { stdout, stderr } = await runCommand(command, currentDir);
      return res.json({ text: `Executado: ${command}\n\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`, model: usedModel });
    } catch (err: any) {
      return res.json({ text: `Erro ao executar comando: ${err.message}`, model: usedModel });
    }
  }

  res.json({ text: aiResponse, model: usedModel });
});

// --- ENDPOINT CLAUDE COMPATIBLE (WITH STREAMING) ---

app.post("/v1/messages", async (req, res) => {
  const messages = req.body.messages;
  const stream = req.body.stream === true;
  const start = Date.now();
  const requestId = `v1-${Date.now().toString(36)}`;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const lastMessage = messages[messages.length - 1].content;
  const cached = await checkSmartCache(lastMessage);
  
  if (cached) {
    const latency = Date.now() - start;
    updateStats(latency, true, "smart_cache", lastMessage, cached);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'message_start', message: { id: 'smart', role: 'assistant', model: 'smart_cache', latency } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: cached } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      return res.end();
    }
    return res.json({
      id: "smart_" + Date.now(),
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: cached }],
      model: "smart_cache",
      latency,
      usage: { input_tokens: 0, output_tokens: 0 }
    });
  }

  // Check Memory Engine
  const memoryHit = await checkMemory(lastMessage);
  if (memoryHit) {
    const latency = Date.now() - start;
    updateStats(latency, true, "memory", lastMessage, memoryHit.text);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'message_start', message: { id: 'mem', role: 'assistant', model: 'memory', latency } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: memoryHit.text } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      return res.end();
    }
    return res.json({
      id: "mem_" + Date.now(),
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: memoryHit.text }],
      model: "memory",
      latency,
      usage: { input_tokens: 0, output_tokens: 0 }
    });
  }

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await streamWithFallback(APIS, messages, res, (fullText, model) => {
      const latency = Date.now() - start;
      updateStats(latency, false, model, lastMessage, fullText);
      saveSmartCache(lastMessage, fullText);
    }, requestId);
    return;
  }

  for (const api of APIS) {
    if (!api.enabled) continue;
    if (!api.key && api.name !== 'ollama') continue;

    const result = await tryAPI(api, messages, false, requestId);

    if (result) {
      console.log(`✅ [${requestId}] resposta final via ${api.name} (${api.model})`);
      const latency = Date.now() - start;
      updateStats(latency, false, api.model, lastMessage, result);
      await saveSmartCache(lastMessage, result);
      return res.json({
        id: "msg_" + Date.now(),
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: result }],
        model: api.model,
        latency,
        usage: { input_tokens: 0, output_tokens: 0 }
      });
    }
  }

  res.status(500).json({ error: "Todas as APIs falharam ou não estão configuradas corretamente." });
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  const PORT = process.env.PORT || 3100;

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

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🔥 Proxy inteligente rodando na porta ${PORT}`);
    console.log(`📍 Host: 0.0.0.0:${PORT} (IPv4)`);
  }).on('error', (err) => {
    console.error(`❌ Erro ao iniciar servidor: ${err.message}`);
  });
}

startServer();
