FROM node:20-alpine

WORKDIR /app

# Copia package files para cache de dependências
COPY package*.json ./

# Instala todas as dependências
RUN npm install

# Copia o resto do código
COPY . .

# Build do frontend para produção
RUN npm run build

# Expõe a porta do servidor
EXPOSE 3100

# Variáveis de ambiente
ENV PORT=3100
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Inicia o servidor com tsx (já que server.ts é TypeScript ESM)
CMD ["npx", "tsx", "server.ts"]
