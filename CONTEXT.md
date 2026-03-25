# CONTEXT - MasterClaw

## Resumo do projeto
MasterClaw é uma camada Anthropic-compatible (`/v1/messages`) com roteamento multi-API configurável via painel.

Arquitetura operacional:
- Cliente Claude-compatible / Claude Code
- `POST /v1/messages` no MasterClaw
- Roteador sequencial (ordem definida por drag-and-drop no painel)
- Fallback entre NVIDIA / Groq / Google / Ollama

Data da atualização: **2026-03-24**.

## O que foi consolidado nesta rodada

### Roteamento e compatibilidade Claude
- Ordem do painel é soberana para fallback (sem reordenação automática por modelo).
- Endpoint compatível `POST /v1/messages` mantido como entrada principal.
- Script launcher adicionado para abrir Claude Code apontando para o MasterClaw:
  - `npm run claude:masterclaw`
- Variável de ambiente para launcher:
  - `MASTERCLAW_BASE_URL` (default `http://localhost:3100`)

### Modo de roteamento estrito
- Novo flag: `STRICT_ROUTER`
- Quando `STRICT_ROUTER=true`:
  - agente usa a ordem do painel sem heurísticas adicionais de compress/classificação.
- Logs de roteamento por request adicionados:
  - API que falhou + status/motivo
  - API final usada para resposta

### Ollama local (sem chave)
- Ollama tratado como local sem API key obrigatória.
- Auto-start no fallback quando necessário:
  - comando padrão `ollama launch claude`
- Variáveis:
  - `OLLAMA_BASE_URL`
  - `OLLAMA_LAUNCH_CMD`

### Agente no terminal
- Fluxo do terminal evoluído para loop autônomo:
  - executa `READ/WRITE/EXEC`
  - devolve saída ao agente
  - continua até conclusão (limite de passos)
- Compatibilidade de shell corrigida para evitar `spawn /bin/sh ENOENT`:
  - variável `EXEC_SHELL`

### Frontend/UX
- Correção de tema claro no Tailwind v4 (`@custom-variant dark ...`).
- Botões de ação da aba Config reposicionados e restilizados.
- Textos PT encurtados para melhor legibilidade visual.
- Card do Ollama atualizado para não pedir API key.

## Estado técnico atual
- `npm run lint` OK
- `npm run build` OK
- Docker validado com container `healthy`

## Aderência ao PRD

### Atendido
- Orquestração multi-API com fallback
- Seleção manual de modelo e prioridade por painel (drag-and-drop)
- Streaming SSE
- Smart cache
- Memória evolutiva com feedback
- Endpoint Claude-compatible (`/v1/messages`)
- Execução local e Docker

### Parcial / pendente
- Logs estruturados (ainda com `console.log`)
- Suíte de testes automatizados
- Rate limiting
- Métricas avançadas por modelo no backend

## Arquivos novos/relevantes
- `server.ts` - roteador, compatibilidade Anthropic, auto-start Ollama, strict router
- `src/App.tsx` - painel, terminal agente, UX de configuração
- `scripts/claude-masterclaw.mjs` - launcher Claude Code -> MasterClaw
- `examples/minimal-proxy.js` - referência minimal Anthropic-compatible proxy
- `.env.example` - flags e variáveis de runtime atualizadas
- `README.md` - uso com Claude Code e observações operacionais
