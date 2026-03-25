# MasterClaw

Proxy inteligente de IA para desenvolvimento, com roteamento multi-provider, smart cache, memória técnica evolutiva e fallback automático.

## O que o sistema já entrega
- Multi-API (OpenAI-compatible, Gemini, Ollama)
- Streaming SSE com fallback automático
- Smart cache semântico (embeddings + similaridade)
- Memória técnica (bug/decisão/solução) com ranking e feedback
- Dashboard com métricas de uso, custo e latência
- Gestão de APIs com prioridade por drag-and-drop
- Endpoint compatível com Claude: `POST /v1/messages`

## Rodando local (Node)
### Pré-requisitos
- Node.js 18+
- npm

### Passos
```bash
npm install
cp .env.example .env.local
npm run dev
```

App disponível em `http://localhost:3100`.

## Rodando com Docker
### Pré-requisitos
- Docker + Docker Compose

### Subir stack
```bash
docker compose up -d --build
```

### Ver status
```bash
docker compose ps
```

### Parar stack
```bash
docker compose down
```

## Healthcheck
- Endpoint: `GET /api/health`
- `docker-compose.yml` usa: `http://127.0.0.1:3100/api/health`

## Scripts úteis
- `npm run dev`: sobe backend+frontend via `tsx server.ts`
- `npm run build`: build do frontend
- `npm run lint`: type-check (`tsc --noEmit`)
- `npm run clean`: remove `dist/`

## Endpoints principais
### Sistema e configuração
- `GET /api/health`
- `GET /api/stats`
- `GET /api/config`
- `POST /api/config`
- `PUT /api/config/:id`
- `DELETE /api/config/:id`
- `POST /api/config/test/:id`

### Memória técnica
- `GET /api/memory`
- `POST /api/memory`
- `POST /api/memory/:id/feedback`
- `DELETE /api/memory/:id`
- `GET /api/memory/download`
- `POST /api/memory/upload`

### Agente / compatibilidade
- `POST /api/agent/chat`
- `POST /api/agent/execute`
- `POST /v1/messages`

## Claude Code com o roteador
- O roteamento usa a ordem definida no painel (drag-and-drop) como prioridade de fallback.
- Endpoint compatível para clientes Anthropic/Claude: `http://localhost:3100/v1/messages`.
- Ative `STRICT_ROUTER=true` para usar somente a ordem do painel no agente (sem heurística de compress/classificação).
- Launcher local para Claude Code já apontando para o MasterClaw:
```bash
npm run claude:masterclaw
```
- Você também pode passar argumentos ao Claude:
```bash
npm run claude:masterclaw -- --model qwen3.5
```
- Exemplo mínimo de proxy compatível: `examples/minimal-proxy.js`.

## Aderência ao PRD (2026-03-24)
### Atendido
- Orquestração multi-API
- Streaming em tempo real
- Smart cache
- Memória evolutiva com score
- Feedback de memória
- Métricas base (latência/custo/hits)
- Monitoramento por teste individual de API
- Import/export de memória
- Execução local com Docker

### Parcial / pendente
- Logs estruturados
- Testes automatizados
- Rate limiting
- Métricas avançadas por modelo no backend

## Observações
- `config.json` e `memory.json` são persistidos em `DATA_DIR` (`/app/data` no Docker).
- Por padrão, API keys **não** são salvas em `config.json` (`PERSIST_API_KEYS=false`).
- Use `.env.local` / variáveis de ambiente para segredos (`GEMINI_API_KEY`, `NVIDIA_API_KEY`, `GROQ_API_KEY`).
- Embeddings usam Ollama (preferencial) com fallback para Gemini.
- Ollama roda local e não exige API key; login é opcional com `ollama login`.
- O backend tenta iniciar Ollama automaticamente no fallback com `OLLAMA_LAUNCH_CMD` (default: `ollama launch claude`).
- Você pode ajustar host/comando via `.env.local`: `OLLAMA_BASE_URL` e `OLLAMA_LAUNCH_CMD`.
