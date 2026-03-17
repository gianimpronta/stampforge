# Stage 1: build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: runner — imagem mínima, sem dev deps, sem ferramentas de build
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Atualiza pacotes Alpine e remove npm (não necessário em runtime);
# os CVEs detectados pelo Trivy estão todos em deps internas do npm,
# não na aplicação — o runner usa apenas `node server.js`
RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm \
           /usr/local/bin/npx

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copia apenas o output standalone + assets estáticos
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
