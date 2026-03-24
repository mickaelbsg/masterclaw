import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Plus, 
  Trash2, 
  Settings, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  Key, 
  Globe, 
  MessageSquare,
  ChevronRight,
  Loader2,
  Save,
  Power,
  GripVertical,
  Brain,
  Zap,
  Activity,
  TrendingUp,
  DollarSign,
  Clock,
  RefreshCw,
  BookOpen,
  Database,
  Tag,
  Upload,
  Download,
  ThumbsUp,
  ThumbsDown,
  Terminal,
  ShieldCheck,
  HardDrive,
  Check,
  X,
  Sun,
  Moon,
  Languages
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area
} from 'recharts';

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
  status?: 'online' | 'offline' | 'unknown';
  lastLatency?: number;
  testing?: boolean;
}

interface MemoryEntry {
  id: string;
  input: string;
  solution: string;
  type: "bug" | "decision" | "solution";
  tags: string[];
  score?: number;
  hits?: number;
  fails?: number;
  createdAt?: number;
}

interface Dependency {
  id: string;
  name: string;
  check: string;
  installed: boolean;
  version: string | null;
  install: { ubuntu?: string; macos?: string; windows?: string; all?: string };
  installing?: boolean;
}

interface SortableItemProps {
  key?: any;
  api: APIConfig;
  handleToggle: (id: string, enabled: boolean) => Promise<void> | void;
  handleDelete: (id: string) => Promise<void> | void;
  handleUpdate: (id: string, updates: Partial<APIConfig>) => Promise<void> | void;
  testSingleApi: (id: string) => Promise<void> | void;
}

function SortableItem({ api, handleToggle, handleDelete, handleUpdate, testSingleApi }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: api.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1
  };

  return (
    <motion.div 
      ref={setNodeRef}
      style={style}
      layout
      className={`p-5 rounded-2xl border transition-all ${
        isDragging ? "opacity-50 scale-105 shadow-2xl border-orange-500/50" : 
        api.enabled ? "bg-neutral-900 border-neutral-800" : "bg-neutral-900/50 border-neutral-900 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div 
            {...attributes} 
            {...listeners}
            className="p-2 text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={20} />
          </div>
          <div className={`p-3 rounded-xl ${
            api.type === 'gemini' ? 'bg-blue-500/10 text-blue-400' : 
            api.type === 'ollama' ? 'bg-orange-500/10 text-orange-400' : 
            'bg-green-500/10 text-green-400'
          }`}>
            {api.type === 'gemini' ? <Globe size={24} /> : <Cpu size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white capitalize flex items-center gap-2">
              {api.name}
              {api.status && (
                <span className={`w-2 h-2 rounded-full ${api.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
              )}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                {api.type}
              </span>
              <span className="text-sm text-neutral-500 font-mono">{api.model}</span>
              {api.lastLatency && (
                <span className="text-[10px] text-neutral-600 font-mono flex items-center gap-1">
                  <Clock size={10} /> {api.lastLatency}ms
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => testSingleApi(api.id)}
            disabled={api.testing}
            className={`p-2 rounded-lg transition-colors ${api.testing ? 'text-orange-500 animate-pulse' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
            title="Testar API"
          >
            <RefreshCw size={20} className={api.testing ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => handleToggle(api.id, !api.enabled)}
            className={`p-2 rounded-lg transition-colors ${api.enabled ? 'text-green-500 hover:bg-green-500/10' : 'text-neutral-500 hover:bg-neutral-500/10'}`}
          >
            <Power size={20} />
          </button>
          <button 
            onClick={() => handleDelete(api.id)}
            className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 flex items-center gap-1">
            <Cpu size={10} /> Modelo
          </label>
          <input 
            type="text"
            value={api.model}
            onChange={(e) => handleUpdate(api.id, { model: e.target.value })}
            placeholder="Ex: llama3-70b"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 flex items-center gap-1">
            <Key size={10} /> API Key
          </label>
          <input 
            type="password"
            value={api.key}
            onChange={(e) => handleUpdate(api.id, { key: e.target.value })}
            placeholder="Insira sua chave..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 flex items-center gap-1">
            Contexto (Chars)
          </label>
          <input 
            type="number"
            value={api.max_chars || 4000}
            onChange={(e) => handleUpdate(api.id, { max_chars: parseInt(e.target.value) })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 flex items-center gap-1">
            Temp
          </label>
          <input 
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={api.temperature || 0.7}
            onChange={(e) => handleUpdate(api.id, { temperature: parseFloat(e.target.value) })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        {(api.type === 'openai' || api.type === 'ollama') && (
          <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 flex items-center gap-1">
              <Globe size={10} /> Endpoint URL
            </label>
            <input 
              type="text"
              value={api.url}
              onChange={(e) => handleUpdate(api.id, { url: e.target.value })}
              placeholder="https://..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

const translations = {
  pt: {
    appName: "MasterClaw",
    config: "Configurações",
    terminal: "Claude Terminal",
    memory: "Memória Técnica",
    analytics: "Analytics",
    deps: "Dependências",
    saveAll: "Salvar Tudo",
    addApi: "Adicionar API",
    totalRequests: "Requisições Totais",
    avgLatency: "Latência Média",
    totalCost: "Custo Acumulado",
    lightMode: "Modo Claro",
    darkMode: "Modo Escuro",
    language: "Idioma",
    stats: "Estatísticas",
    efficiency: "Taxa de Eficiência",
    tokens: "Tokens Processados",
    intent: "Distribuição de Intenção",
    latencyHistory: "Histórico de Latência (ms)",
    routerStats: "Status do Roteador",
    testRouter: "Testar Roteador",
    testMessage: "Mensagem de Teste",
    placeholderTest: "Olá, quem é você?",
    runTest: "Executar Teste",
    systemRequirements: "Requisitos do Sistema",
    systemDescription: "Garanta que seu ambiente está pronto para o MasterClaw e Claude Code.",
    install: "Instalar",
    recheck: "Verificar novamente",
    detected: "Versão detectada",
    notDetected: "Não encontrado no sistema",
    resilienceTip: "Dica de Resiliência: Use Docker 🐳",
    dockerDescription: "Para evitar conflitos de dependências e garantir que o MasterClaw funcione exatamente igual em qualquer máquina, recomendamos rodar a aplicação via Docker.",
    addMemory: "Adicionar Memória",
    input: "Input (Comando/Erro)",
    solution: "Solução/Decisão",
    type: "Tipo",
    tags: "Tags (separadas por vírgula)",
    cancel: "Cancelar",
    save: "Salvar",
    bug: "Bug",
    decision: "Decisão",
    solutionType: "Solução",
    searchMemory: "Buscar na memória técnica...",
    hits: "Hits",
    fails: "Fails",
    score: "Score",
    noMemory: "Nenhuma memória encontrada.",
    apiSettings: "Configurações de API (Arraste para ordenar o Fallback)",
    endpointUrl: "Endpoint URL",
    apiKey: "Chave da API",
    model: "Modelo",
    maxChars: "Limite de Caracteres",
    temperature: "Temperatura",
    enabled: "Ativo",
    testing: "Testando...",
    test: "Testar",
    delete: "Excluir",
    addApiTitle: "Adicionar Nova API",
    apiName: "Nome da API",
    apiType: "Tipo de API",
    placeholderName: "Ex: NVIDIA Mistral",
    placeholderModel: "Ex: mistralai/mistral-small",
    placeholderKey: "Sua chave de API",
    placeholderUrl: "https://...",
    add: "Adicionar"
  },
  en: {
    appName: "MasterClaw",
    config: "Settings",
    terminal: "Claude Terminal",
    memory: "Technical Memory",
    analytics: "Analytics",
    deps: "Dependencies",
    saveAll: "Save All",
    addApi: "Add API",
    totalRequests: "Total Requests",
    avgLatency: "Avg Latency",
    totalCost: "Total Cost",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    language: "Language",
    stats: "Statistics",
    efficiency: "Efficiency Rate",
    tokens: "Tokens Processed",
    intent: "Intent Distribution",
    latencyHistory: "Latency History (ms)",
    routerStats: "Router Status",
    testRouter: "Test Router",
    testMessage: "Test Message",
    placeholderTest: "Hello, who are you?",
    runTest: "Run Test",
    systemRequirements: "System Requirements",
    systemDescription: "Ensure your environment is ready for MasterClaw and Claude Code.",
    install: "Install",
    recheck: "Recheck",
    detected: "Detected version",
    notDetected: "Not found in system",
    resilienceTip: "Resilience Tip: Use Docker 🐳",
    dockerDescription: "To avoid dependency conflicts and ensure MasterClaw works exactly the same on any machine, we recommend running the application via Docker.",
    addMemory: "Add Memory",
    input: "Input (Command/Error)",
    solution: "Solution/Decision",
    type: "Type",
    tags: "Tags (comma separated)",
    cancel: "Cancel",
    save: "Save",
    bug: "Bug",
    decision: "Decision",
    solutionType: "Solution",
    searchMemory: "Search technical memory...",
    hits: "Hits",
    fails: "Fails",
    score: "Score",
    noMemory: "No memory found.",
    apiSettings: "API Settings (Drag to reorder Fallback)",
    endpointUrl: "Endpoint URL",
    apiKey: "API Key",
    model: "Model",
    maxChars: "Character Limit",
    temperature: "Temperature",
    enabled: "Enabled",
    testing: "Testing...",
    test: "Test",
    delete: "Delete",
    addApiTitle: "Add New API",
    apiName: "API Name",
    apiType: "API Type",
    placeholderName: "Ex: NVIDIA Mistral",
    placeholderModel: "Ex: mistralai/mistral-small",
    placeholderKey: "Your API key",
    placeholderUrl: "https://...",
    add: "Add"
  },
  es: {
    appName: "MasterClaw",
    config: "Configuraciones",
    terminal: "Claude Terminal",
    memory: "Memoria Técnica",
    analytics: "Analytics",
    deps: "Dependencias",
    saveAll: "Guardar Todo",
    addApi: "Agregar API",
    totalRequests: "Solicitudes Totales",
    avgLatency: "Latencia Media",
    totalCost: "Costo Acumulado",
    lightMode: "Modo Claro",
    darkMode: "Modo Oscuro",
    language: "Idioma",
    stats: "Estadísticas",
    efficiency: "Tasa de Eficiencia",
    tokens: "Tokens Procesados",
    intent: "Distribución de Intención",
    latencyHistory: "Historial de Latencia (ms)",
    routerStats: "Estado del Router",
    testRouter: "Probar Router",
    testMessage: "Mensaje de Prueba",
    placeholderTest: "Hola, ¿quién eres?",
    runTest: "Ejecutar Prueba",
    systemRequirements: "Requisitos del Sistema",
    systemDescription: "Asegúrese de que su entorno esté listo para MasterClaw y Claude Code.",
    install: "Instalar",
    recheck: "Verificar de nuevo",
    detected: "Versión detectada",
    notDetected: "No encontrado en el sistema",
    resilienceTip: "Consejo de Resiliencia: Use Docker 🐳",
    dockerDescription: "Para evitar conflictos de dependencias y garantizar que MasterClaw funcione exactamente igual en cualquier máquina, recomendamos ejecutar la aplicación a través de Docker.",
    addMemory: "Agregar Memoria",
    input: "Entrada (Comando/Error)",
    solution: "Solución/Decisión",
    type: "Tipo",
    tags: "Etiquetas (separadas por comas)",
    cancel: "Cancelar",
    save: "Guardar",
    bug: "Bug",
    decision: "Decisión",
    solutionType: "Solución",
    searchMemory: "Buscar en la memoria técnica...",
    hits: "Hits",
    fails: "Fails",
    score: "Score",
    noMemory: "No se encontró memoria.",
    apiSettings: "Configuraciones de API (Arrastre para ordenar el Fallback)",
    endpointUrl: "URL del Endpoint",
    apiKey: "Clave de API",
    model: "Modelo",
    maxChars: "Límite de Caracteres",
    temperature: "Temperatura",
    enabled: "Habilitado",
    testing: "Probando...",
    test: "Probar",
    delete: "Eliminar",
    addApiTitle: "Agregar Nueva API",
    apiName: "Nombre de la API",
    apiType: "Tipo de API",
    placeholderName: "Ej: NVIDIA Mistral",
    placeholderModel: "Ej: mistralai/mistral-small",
    placeholderKey: "Tu clave de API",
    placeholderUrl: "https://...",
    add: "Agregar"
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"config" | "terminal" | "memory" | "analytics" | "deps">("terminal");
  const [apis, setApis] = useState<APIConfig[]>([]);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [selectedOS, setSelectedOS] = useState<"ubuntu" | "macos" | "windows">("ubuntu");
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });
  const [lang, setLang] = useState<'pt' | 'en' | 'es'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('lang') as 'pt' | 'en' | 'es') || 'pt';
    }
    return 'pt';
  });

  const t = translations[lang];

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);
  const [loading, setLoading] = useState(true);
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
  const [newApi, setNewApi] = useState<Partial<APIConfig>>({
    name: "",
    type: "openai",
    url: "",
    key: "",
    model: "",
    enabled: true
  });
  const [newMemory, setNewMemory] = useState<Partial<MemoryEntry>>({
    input: "",
    solution: "",
    type: "bug",
    tags: []
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setApis((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Terminal State
  const [workingDir, setWorkingDir] = useState(".");
  const [terminalHistory, setTerminalHistory] = useState<{
    role: string, 
    content: string, 
    model?: string, 
    latency?: number,
    memoryId?: string,
    feedbackGiven?: boolean
  }[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [stats, setStats] = useState<any>({
    totalRequests: 0,
    cacheHits: 0,
    memoryHits: 0,
    totalTokens: 0,
    totalCost: 0,
    totalSavings: 0,
    avgLatency: 0,
    latencies: [],
    modelUsage: {},
    intentDistribution: { fast: 0, smart: 0 }
  });

  const fetchConfig = async () => {
    try {
      const res = await axios.get("/api/config");
      setApis(res.data);
    } catch (err) {
      console.error("Failed to fetch config", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get("/api/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchMemory = async () => {
    try {
      const res = await axios.get("/api/memory");
      setMemory(res.data);
    } catch (err) {
      console.error("Failed to fetch memory", err);
    }
  };

  const fetchDeps = async () => {
    try {
      const res = await axios.get("/api/deps");
      setDeps(res.data);
    } catch (err) {
      console.error("Failed to fetch deps", err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchStats();
    fetchMemory();
    fetchDeps();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const addMemory = async () => {
    if (!newMemory.input || !newMemory.solution) return;
    try {
      const res = await axios.post("/api/memory", newMemory);
      setMemory([...memory, res.data]);
      setShowAddMemoryModal(false);
      setNewMemory({ input: "", solution: "", type: "bug", tags: [] });
    } catch (err) {
      console.error("Failed to add memory", err);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      await axios.delete(`/api/memory/${id}`);
      setMemory(memory.filter(m => m.id !== id));
    } catch (err) {
      console.error("Failed to delete memory", err);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await axios.put(`/api/config/${id}`, { enabled });
      setApis(apis.map(api => api.id === id ? { ...api, enabled } : api));
    } catch (err) {
      console.error("Failed to toggle API", err);
    }
  };

  const testSingleApi = async (id: string) => {
    setApis(prev => prev.map(api => api.id === id ? { ...api, testing: true } : api));
    try {
      const res = await axios.post(`/api/config/test/${id}`);
      setApis(prev => prev.map(api => api.id === id ? { ...api, testing: false, status: 'online', lastLatency: res.data.latency } : api));
    } catch (err) {
      setApis(prev => prev.map(api => api.id === id ? { ...api, testing: false, status: 'offline' } : api));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/config/${id}`);
      setApis(apis.filter(api => api.id !== id));
    } catch (err) {
      console.error("Failed to delete API", err);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<APIConfig>) => {
    try {
      await axios.put(`/api/config/${id}`, updates);
      setApis(apis.map(api => api.id === id ? { ...api, ...updates } : api));
    } catch (err) {
      console.error("Failed to update API", err);
    }
  };

  const handleAdd = () => {
    const api: APIConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: newApi.name || "Nova API",
      type: (newApi.type as any) || "openai",
      url: newApi.url || "",
      key: newApi.key || "",
      model: newApi.model || "",
      enabled: true
    };
    setApis([...apis, api]);
    setShowAddModal(false);
    setNewApi({
      name: "",
      type: "openai",
      url: "",
      key: "",
      model: "",
      enabled: true
    });
  };

  const saveAll = async () => {
    try {
      await axios.post("/api/config", apis);
      alert("🔥 Configurações salvas no backend!");
    } catch (err) {
      console.error("Failed to save config", err);
      alert("Erro ao salvar no backend.");
    }
  };

  const runTest = async () => {
    if (!testMessage) return;
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: testMessage }],
          stream: true
        })
      });

      if (!response.ok) throw new Error("Falha na requisição");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let model = "";
      let latency = 0;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "message_start") {
                model = data.message.model;
                latency = data.message.latency;
              }
              if (data.type === "system") {
                // Notifica troca de API no teste
                setTestResult(prev => ({ ...prev, systemMessage: data.message }));
              }
              if (data.type === "content_block_delta") {
                fullText += data.delta.text;
                model = data.model || model;
                setTestResult({ text: fullText, model, latency });
              }
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      setTestResult({ error: err.message || "Erro ao processar requisição" });
    } finally {
      setTesting(false);
    }
  };

  const installDep = async (id: string) => {
    setDeps(prev => prev.map(d => d.id === id ? { ...d, installing: true } : d));
    try {
      await axios.post("/api/deps/install", { id, os: selectedOS });
      await fetchDeps();
    } catch (err) {
      console.error("Failed to install dep", err);
    } finally {
      setDeps(prev => prev.map(d => d.id === id ? { ...d, installing: false } : d));
    }
  };

  const handleMemoryFeedback = async (messageIndex: number, memoryId: string, helpful: boolean) => {
    try {
      await axios.post(`/api/memory/${memoryId}/feedback`, { helpful });
      setTerminalHistory(prev => {
        const newHistory = [...prev];
        newHistory[messageIndex].feedbackGiven = true;
        return newHistory;
      });
      fetchMemory();
    } catch (err) {
      console.error("Failed to send feedback", err);
    }
  };

  const sendTerminalMessage = async () => {
    if (!terminalInput) return;
    const input = terminalInput;
    const userMsg = { role: "user", content: input };
    setTerminalHistory(prev => [...prev, userMsg]);
    setTerminalInput("");
    setIsAgentThinking(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: terminalHistory.map(({role, content}) => ({role, content})),
          workingDir,
          stream: true
        })
      });

      if (!response.ok) throw new Error("Falha na requisição");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let model = "";
      let latency = 0;

      // Adiciona mensagem vazia do assistente para começar o stream
      setTerminalHistory(prev => [...prev, { role: "assistant", content: "", model: "thinking..." }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "content_block_delta") {
                fullText += data.delta.text;
                model = data.model;
                latency = data.latency;
                
                setTerminalHistory(prev => {
                  const newHistory = [...prev];
                  const last = newHistory[newHistory.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = fullText;
                    last.model = model;
                    last.latency = latency;
                  }
                  return newHistory;
                });
              }
              if (data.type === "system") {
                setTerminalHistory(prev => [...prev, { 
                  role: "system", 
                  content: data.message,
                  memoryId: data.memoryId 
                }]);
              }
            } catch (e) {}
          }
        }
      }

      // Se for um comando, executa
      if (fullText.startsWith("READ:") || fullText.startsWith("WRITE:") || fullText.startsWith("EXEC:")) {
        const execRes = await axios.post("/api/agent/execute", {
          command: fullText,
          workingDir
        });
        setTerminalHistory(prev => [...prev, { 
          role: "assistant", 
          content: execRes.data.text, 
          model: "system" 
        }]);
      }

      fetchStats();
    } catch (err) {
      setTerminalHistory(prev => [...prev, { role: "assistant", content: "❌ Erro ao falar com o agente." }]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Economia Total</p>
              <p className="text-2xl font-bold text-purple-400 font-mono">
                ${stats.totalSavings.toFixed(4)}
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Brain size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Cache Hits</p>
              <p className="text-2xl font-bold text-blue-400 font-mono">
                {stats.cacheHits} <span className="text-xs font-normal opacity-50">/ {stats.totalRequests}</span>
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">{t.avgLatency}</p>
              <p className="text-2xl font-bold text-orange-400 font-mono">
                {Math.round(stats.avgLatency)}ms
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">{t.totalCost}</p>
              <p className="text-2xl font-bold text-green-400 font-mono">
                ${stats.totalCost.toFixed(4)}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
              <Cpu className="text-orange-500" />
              {t.appName}
            </h1>
            <div className="flex flex-wrap gap-4 mt-4">
              <button 
                onClick={() => setActiveTab("config")}
                className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'config' ? 'border-orange-500 text-orange-500 dark:text-white' : 'border-transparent text-neutral-500'}`}
              >
                {t.config}
              </button>
              <button 
                onClick={() => setActiveTab("terminal")}
                className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'terminal' ? 'border-orange-500 text-orange-500 dark:text-white' : 'border-transparent text-neutral-500'}`}
              >
                {t.terminal}
              </button>
              <button 
                onClick={() => setActiveTab("memory")}
                className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'memory' ? 'border-orange-500 text-orange-500 dark:text-white' : 'border-transparent text-neutral-500'}`}
              >
                {t.memory}
              </button>
              <button 
                onClick={() => setActiveTab("analytics")}
                className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'analytics' ? 'border-orange-500 text-orange-500 dark:text-white' : 'border-transparent text-neutral-500'}`}
              >
                {t.analytics}
              </button>
              <button 
                onClick={() => setActiveTab("deps")}
                className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'deps' ? 'border-orange-500 text-orange-500 dark:text-white' : 'border-transparent text-neutral-500'}`}
              >
                {t.deps}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1 rounded-xl shadow-sm">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-neutral-500 hover:text-orange-500 transition-all"
                title={theme === 'dark' ? t.lightMode : t.darkMode}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />
              <div className="flex items-center gap-1 px-2">
                <Languages size={16} className="text-neutral-500" />
                <select 
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                  className="bg-transparent text-xs font-bold uppercase tracking-widest text-neutral-500 focus:outline-none cursor-pointer"
                >
                  <option value="pt">PT</option>
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                </select>
              </div>
            </div>

            {activeTab === 'config' && (
              <div className="flex gap-3">
                <button 
                  onClick={saveAll}
                  className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white px-6 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all active:scale-95 border border-neutral-200 dark:border-neutral-700"
                >
                  <Save size={20} />
                  {t.saveAll}
                </button>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-600/20"
                >
                  <Plus size={20} />
                  {t.addApi}
                </button>
              </div>
            )}
          </div>
        </header>

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* API List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Settings size={20} className="text-neutral-400" />
                Configurações de API (Arraste para ordenar o Fallback)
              </h2>
              
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={apis.map(a => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-1 gap-4">
                    {apis.map((api) => (
                      <SortableItem 
                        key={api.id}
                        api={api}
                        handleToggle={handleToggle}
                        handleDelete={handleDelete}
                        handleUpdate={handleUpdate}
                        testSingleApi={testSingleApi}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Test Interface */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Play size={20} className="text-neutral-400" />
                Testar Roteador
              </h2>
              
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-400">Mensagem de Teste</label>
                  <textarea 
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Olá, quem é você?"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-sm min-h-[100px] focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>
                
                <button 
                  onClick={runTest}
                  disabled={testing || !testMessage}
                  className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {testing ? <Loader2 className="animate-spin" size={20} /> : <MessageSquare size={20} />}
                  Enviar Requisição
                </button>

                <AnimatePresence>
                  {testResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-4 border-t border-neutral-800 space-y-4"
                    >
                      {testResult.error ? (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
                          <XCircle className="mt-1 shrink-0" size={18} />
                          <p className="text-sm">{testResult.error}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {testResult.systemMessage && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-xl text-xs flex items-center gap-2">
                              <Zap size={14} /> {testResult.systemMessage}
                            </div>
                          )}
                          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-start gap-3">
                            <CheckCircle2 className="mt-1 shrink-0" size={18} />
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <p className="text-sm font-bold">Sucesso!</p>
                                <p className="text-xs opacity-80 flex items-center gap-3">
                                  {testResult.model === 'smart_cache' ? (
                                    <span className="text-purple-400 flex items-center gap-1">
                                      <Brain size={12} /> Smart Cache Hit
                                    </span>
                                  ) : (
                                    <span>API Utilizada: {testResult.model}</span>
                                  )}
                                  {testResult.latency && (
                                    <span className="flex items-center gap-1 opacity-60">
                                      <Clock size={12} /> {testResult.latency}ms
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                            <p className="text-sm leading-relaxed text-neutral-300">
                              {testResult.text}
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-2">Dica Pro</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Aponte seu Claude Code ou qualquer cliente compatível com Anthropic para:
                  <code className="block mt-2 bg-neutral-950 p-2 rounded border border-neutral-800 text-orange-500 break-all">
                    {window.location.origin}/v1/messages
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'memory' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Database className="text-orange-500" /> Memória Técnica
                </h2>
                <p className="text-neutral-500 mt-1">Base de conhecimento acumulativa para bugs, decisões e soluções.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async (e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event: any) => {
                          try {
                            const data = JSON.parse(event.target.result);
                            const res = await fetch('/api/memory/upload', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ data })
                            });
                            if (res.ok) fetchMemory();
                          } catch (err) {
                            alert("Erro ao importar arquivo");
                          }
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  className="p-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-all"
                  title="Importar Memória"
                >
                  <Upload size={18} />
                </button>
                <a 
                  href="/api/memory/download" 
                  download 
                  className="p-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-all"
                  title="Exportar Memória"
                >
                  <Download size={18} />
                </a>
                <button 
                  onClick={() => setShowAddMemoryModal(true)}
                  className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-orange-500 hover:text-white transition-all shadow-xl"
                >
                  <Plus size={18} /> Nova Entrada
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {memory.length === 0 ? (
                <div className="p-12 border border-dashed border-neutral-800 rounded-3xl text-center">
                  <Database size={48} className="mx-auto text-neutral-700 mb-4" />
                  <h3 className="text-white font-bold">Nenhuma memória registrada</h3>
                  <p className="text-neutral-500 text-sm mt-1">Adicione bugs resolvidos ou decisões técnicas para acelerar o Claude.</p>
                </div>
              ) : (
                memory.map((item) => (
                  <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                            item.type === 'bug' ? 'bg-red-500/10 text-red-500' :
                            item.type === 'decision' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-green-500/10 text-green-500'
                          }`}>
                            {item.type}
                          </span>
                          <h3 className="text-white font-bold">{item.input}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-500">
                          <span className="flex items-center gap-1">
                            <TrendingUp size={10} className="text-green-500" /> Score: {item.score || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp size={10} /> Hits: {item.hits || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsDown size={10} /> Fails: {item.fails || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Antiga'}
                          </span>
                        </div>
                        <pre className="text-neutral-400 text-sm font-mono bg-black/30 p-4 rounded-xl whitespace-pre-wrap">
                          {item.solution}
                        </pre>
                        <div className="flex gap-2">
                          {item.tags.map((tag, i) => (
                            <span key={i} className="text-[10px] text-neutral-500 bg-neutral-800 px-2 py-1 rounded-lg flex items-center gap-1">
                              <Tag size={8} /> {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteMemory(item.id)}
                        className="p-2 text-neutral-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Terminal Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Globe size={20} className="text-neutral-400" />
                Diretório
              </h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase">Caminho do Projeto</label>
                <input 
                  type="text"
                  value={workingDir}
                  onChange={(e) => setWorkingDir(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-orange-500 focus:outline-none"
                />
                <p className="text-[10px] text-neutral-500 italic mt-2">
                  Claude terá acesso a este diretório para ler e editar arquivos.
                </p>
              </div>
            </div>

            {/* Terminal Chat */}
            <div className="lg:col-span-3 flex flex-col h-[600px] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
              <div className="bg-neutral-800/50 px-6 py-3 flex items-center justify-between border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                  <span className="ml-4 text-xs font-mono text-neutral-500">claude-code --router-proxy</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-4 scrollbar-hide">
                <div className="text-orange-500">Welcome to Claude Code CLI (Web Emulation)</div>
                <div className="text-neutral-500">Connected to router proxy at {window.location.origin}</div>
                
                {terminalHistory.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'text-white' : msg.role === 'system' ? 'text-yellow-500/80 italic' : 'text-neutral-300'}`}>
                    <div className="flex gap-3">
                      <span className="shrink-0 text-orange-500">
                        {msg.role === 'user' ? '>' : msg.role === 'system' ? '!' : 'claude:'}
                      </span>
                      <div className="flex-1">
                        <pre className="whitespace-pre-wrap font-mono">{msg.content}</pre>
                        
                        {msg.role === 'system' && msg.memoryId && !msg.feedbackGiven && (
                          <div className="mt-2 flex items-center gap-3 no-italic">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold">Esta memória ajudou?</span>
                            <button 
                              onClick={() => handleMemoryFeedback(i, msg.memoryId!, true)}
                              className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all"
                              title="Sim, ajudou!"
                            >
                              <ThumbsUp size={12} />
                            </button>
                            <button 
                              onClick={() => handleMemoryFeedback(i, msg.memoryId!, false)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                              title="Não, foi inútil."
                            >
                              <ThumbsDown size={12} />
                            </button>
                          </div>
                        )}
                        {msg.role === 'system' && msg.memoryId && msg.feedbackGiven && (
                          <div className="mt-2 text-[10px] text-green-500/50 font-bold uppercase no-italic">
                            Feedback enviado! O sistema está aprendendo...
                          </div>
                        )}
                      </div>
                    </div>
                    {msg.model && (
                      <div className="ml-8 flex items-center gap-3 text-[10px] uppercase tracking-tighter font-bold opacity-40">
                        {msg.model === 'smart_cache' ? (
                          <span className="text-purple-400 flex items-center gap-1">
                            <Brain size={10} /> Smart Cache Hit
                          </span>
                        ) : msg.model === 'thinking...' ? (
                          <span className="text-neutral-500 animate-pulse italic">Iniciando stream...</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Zap size={10} className="text-orange-500" /> {msg.model}
                          </span>
                        )}
                        {msg.latency > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> {msg.latency}ms
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isAgentThinking && (
                  <div className="flex gap-3 text-neutral-500 animate-pulse">
                    <span className="shrink-0 text-orange-500">claude:</span>
                    <span>pensando...</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-neutral-950 border-t border-neutral-800">
                <div className="flex items-center gap-3 bg-neutral-900 rounded-xl px-4 py-2 border border-neutral-800 focus-within:border-orange-500 transition-colors">
                  <span className="text-orange-500 font-mono font-bold">{'>'}</span>
                  <input 
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendTerminalMessage()}
                    placeholder="Peça para o Claude fazer algo no seu projeto..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Activity className="text-orange-500" /> Analytics Dashboard
                </h2>
                <p className="text-neutral-500 mt-1">Monitoramento de performance, custos e eficiência do roteador.</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Economia Total</p>
                  <p className="text-2xl font-black text-green-500 mt-1">${stats.totalSavings.toFixed(4)}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Custo Real</p>
                  <p className="text-2xl font-black text-red-500 mt-1">${stats.totalCost.toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latency Chart */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
                <h3 className="text-sm font-bold text-neutral-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <Clock size={16} className="text-orange-500" /> Latência Recente (ms)
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.latencies.map((l: number, i: number) => ({ index: i, value: l }))}>
                      <defs>
                        <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis hide />
                      <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px' }}
                        itemStyle={{ color: '#f97316' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorLat)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Model Usage */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
                <h3 className="text-sm font-bold text-neutral-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <Cpu size={16} className="text-blue-500" /> Uso por Modelo
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(stats.modelUsage || {}).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Intent Distribution */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
                <h3 className="text-sm font-bold text-neutral-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <Zap size={16} className="text-yellow-500" /> Roteamento por Intenção
                </h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Fast', value: stats.intentDistribution?.fast || 0 },
                          { name: 'Smart', value: stats.intentDistribution?.smart || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#eab308" />
                        <Cell fill="#a855f7" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Efficiency Stats */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl grid grid-cols-2 gap-4">
                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 flex flex-col justify-center items-center text-center">
                  <div className="p-3 bg-orange-500/10 text-orange-500 rounded-full mb-3">
                    <Database size={24} />
                  </div>
                  <p className="text-3xl font-black text-white">{stats.cacheHits + stats.memoryHits}</p>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mt-1">Hits de Cache/Memória</p>
                </div>
                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 flex flex-col justify-center items-center text-center">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full mb-3">
                    <TrendingUp size={24} />
                  </div>
                  <p className="text-3xl font-black text-white">{(( (stats.cacheHits + stats.memoryHits) / (stats.totalRequests || 1)) * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mt-1">Taxa de Eficiência</p>
                </div>
                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 flex flex-col justify-center items-center text-center col-span-2">
                  <div className="p-3 bg-green-500/10 text-green-400 rounded-full mb-3">
                    <Zap size={24} />
                  </div>
                  <p className="text-3xl font-black text-white">{stats.totalTokens.toLocaleString()}</p>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mt-1">Tokens Processados</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Dependencies Tab */}
        {activeTab === 'deps' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter">DEPENDÊNCIAS</h2>
                <p className="text-neutral-500 text-sm font-medium">Gerencie os requisitos do sistema MasterClaw</p>
              </div>
              <div className="flex items-center gap-3 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                {(['ubuntu', 'macos', 'windows'] as const).map((os) => (
                  <button
                    key={os}
                    onClick={() => setSelectedOS(os)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                      selectedOS === os 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    {os}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {deps.map((dep) => (
                <div key={dep.id} className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                      dep.installed 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {dep.installed ? <Check size={28} /> : <X size={28} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{dep.name}</h3>
                        {dep.installed && (
                          <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-[10px] font-bold rounded uppercase tracking-widest">
                            {dep.version || 'v?'}
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-sm mt-1">{dep.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={fetchDeps}
                      className="p-3 bg-neutral-800 text-neutral-400 hover:text-white rounded-xl transition-colors border border-neutral-700"
                      title="Verificar novamente"
                    >
                      <RefreshCw size={20} />
                    </button>
                    {!dep.installed && (
                      <button 
                        onClick={() => installDep(dep.id)}
                        className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors flex items-center gap-2"
                      >
                        <Download size={18} />
                        INSTALAR
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-start gap-6">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                <Zap size={24} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">Dica de Resiliência: Use Docker 🐳</h4>
                <p className="text-blue-100/70 text-sm leading-relaxed">
                  Para evitar conflitos de dependências e garantir que o MasterClaw funcione exatamente igual em qualquer máquina, 
                  recomendamos rodar a aplicação via Docker. Isso empacota tudo o que você precisa em um ambiente isolado e seguro.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddMemoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMemoryModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Nova Entrada de Memória</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Problema / Contexto</label>
                    <input 
                      type="text"
                      value={newMemory.input}
                      onChange={(e) => setNewMemory({ ...newMemory, input: e.target.value })}
                      placeholder="Ex: Erro ECONNREFUSED no Postgres"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Tipo</label>
                    <div className="grid grid-cols-3 gap-3">
                      {["bug", "decision", "solution"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setNewMemory({ ...newMemory, type: t as any })}
                          className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                            newMemory.type === t ? "bg-orange-500 text-white" : "bg-neutral-950 text-neutral-500 border border-neutral-800"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Solução / Decisão</label>
                    <textarea 
                      value={newMemory.solution}
                      onChange={(e) => setNewMemory({ ...newMemory, solution: e.target.value })}
                      placeholder="Descreva a solução ou decisão técnica..."
                      rows={4}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-all font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Tags (separadas por vírgula)</label>
                    <input 
                      type="text"
                      placeholder="postgres, docker, auth..."
                      onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value.split(",").map(t => t.trim()) })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={() => setShowAddMemoryModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-neutral-500 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={addMemory}
                    className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                  >
                    Salvar Memória
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Nova Configuração</h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Nome</label>
                  <input 
                    type="text"
                    value={newApi.name}
                    onChange={(e) => setNewApi({ ...newApi, name: e.target.value })}
                    placeholder="Ex: Groq Llama 3"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Tipo</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setNewApi({ ...newApi, type: 'openai' })}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${newApi.type === 'openai' ? 'bg-white text-black border-white' : 'bg-neutral-950 text-neutral-400 border-neutral-800'}`}
                    >
                      OpenAI Style
                    </button>
                    <button 
                      onClick={() => setNewApi({ ...newApi, type: 'gemini' })}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${newApi.type === 'gemini' ? 'bg-white text-black border-white' : 'bg-neutral-950 text-neutral-400 border-neutral-800'}`}
                    >
                      Gemini
                    </button>
                    <button 
                      onClick={() => setNewApi({ ...newApi, type: 'ollama' })}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${newApi.type === 'ollama' ? 'bg-white text-black border-white' : 'bg-neutral-950 text-neutral-400 border-neutral-800'}`}
                    >
                      Ollama
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Modelo</label>
                  <input 
                    type="text"
                    value={newApi.model}
                    onChange={(e) => setNewApi({ ...newApi, model: e.target.value })}
                    placeholder="Ex: llama3-70b-8192"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase">Contexto (Chars)</label>
                    <input 
                      type="number"
                      value={newApi.max_chars || 4000}
                      onChange={(e) => setNewApi({ ...newApi, max_chars: parseInt(e.target.value) })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase">Temperatura</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={newApi.temperature || 0.7}
                      onChange={(e) => setNewApi({ ...newApi, temperature: parseFloat(e.target.value) })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {(newApi.type === 'openai' || newApi.type === 'ollama') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase">URL do Endpoint</label>
                    <input 
                      type="text"
                      value={newApi.url}
                      onChange={(e) => setNewApi({ ...newApi, url: e.target.value })}
                      placeholder={newApi.type === 'ollama' ? "http://localhost:11434/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions"}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-neutral-400 hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAdd}
                    disabled={!newApi.name || !newApi.model}
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
