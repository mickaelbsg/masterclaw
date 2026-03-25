---
date: 2026-03-24
title: Erro de conexão ao falar com o agente
status: resolved
tags: [server, connection, startup]
---

## Problema

Ao iniciar o Claude Code CLI (Web Emulation) e tentar enviar uma mensagem ("ola"), o erro era exibido:

```
❌ Erro ao falar com o agente.
```

## Causa

O servidor Express não estava rodando na porta 3100 quando o cliente tentou conectar. O erro `curl exit code 7` indica "Connection refused" - o servidor não estava escutando na porta esperada.

## Diagnóstico

```bash
# Verificar se a porta está escutando
curl -s http://localhost:3100/api/agent/chat -X POST -H "Content-Type: application/json" -d '{"message":"ola","history":[]}'
# Exit code 7 = Connection refused

# Verificar logs do servidor
npm run dev
```

## Solução

Iniciar o servidor de desenvolvimento antes de usar o cliente:

```bash
npm run dev
```

O servidor deve exibir no log:
```
⚙️ Configuração carregada: 4 APIs.
🔥 Proxy inteligente rodando na porta 3100
```

## Verificação

Após o servidor estar rodando, testar o endpoint:

```bash
curl -v http://localhost:3100/api/agent/chat -X POST -H "Content-Type: application/json" -d '{"message":"ola","history":[]}'
```

Resposta esperada:
```json
{
  "text": "Olá! Estou aqui para ajudar...",
  "model": "llama-3.3-70b-versatile"
}
```

## Prevenção

- Sempre executar `npm run dev` em um terminal antes de acessar o cliente
- Verificar se o log `🔥 Proxy inteligente rodando na porta 3100` apareceu
- Em produção, considerar adicionar um health check endpoint (`/api/health`) para monitoramento

## Solução Alternativa (Docker)

Para evitar problemas de dependências e ambiente, use Docker:

```bash
# Build e inicia o container
docker-compose up -d

# Verifica logs
docker-compose logs -f

# Para o container
docker-compose down
```

O container isola o ambiente e garante que o servidor esteja sempre disponível na porta 3100.
