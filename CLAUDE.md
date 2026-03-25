# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (Vite + Express backend)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Type check with tsc --noEmit
npm run clean      # Remove dist folder
```

## Architecture

**MasterClaw** is an intelligent AI proxy/router with the following structure:

- **server.ts** - Express backend that handles:
  - Multi-provider AI routing (OpenAI-compatible, Gemini, Ollama)
  - Smart caching with cosine similarity embeddings
  - Memory engine for persisting bugs/decisions/solutions
  - Intent classification (fast vs smart routing)
  - Context compression for long conversations
  - Streaming with intelligent fallback between providers
  - File system API for agent operations
  - Stats/cost tracking

- **src/App.tsx** - React frontend with:
  - API configuration management (add/edit/test providers)
  - Memory management UI (view, upload, download, feedback)
  - Real-time stats dashboard (cost, latency, model usage)
  - Dependency checker
  - Dark/light theme with i18n support (pt-BR/EN)

- **vite.config.ts** - Vite bundler with React plugin and Tailwind CSS

## Key Patterns

- API providers are configured in `server.ts` with type-specific adapters (`callOpenAI`, `callGemini`)
- Memory entries use embeddings for semantic search with hit/fail scoring
- Smart cache stores recent Q&A pairs with similarity-based retrieval
- Streaming responses use `streamWithFallback` to switch providers on connection issues
- Agent commands: `READ:`, `WRITE:`, `EXEC:`, `MEMORY_SAVE:`

## Context for AI Agents

**Read `CONTEXT.md` first** when joining this codebase. It contains:
- Recent security fixes and bug resolutions (2026-03-24)
- Current TODOs and priorities
- Debugging guide for common issues
