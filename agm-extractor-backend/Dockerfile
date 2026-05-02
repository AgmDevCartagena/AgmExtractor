# ============================================================
# Stage 1: Base — dependencias del sistema compartidas
# ============================================================
FROM node:22-alpine AS base

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl \
    libc6-compat

ENV CHROMIUM_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# ============================================================
# Stage 2: Builder — instala dependencias y compila
# ============================================================
FROM base AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma/

RUN npx prisma generate

COPY src ./src/

RUN npm run build

# Verificar que el build generó los archivos esperados
RUN ls -la dist/src/ || (echo "ERROR: dist/src no existe" && exit 1)

# ============================================================
# Stage 3: Production — imagen final liviana
# ============================================================
FROM base AS production

WORKDIR /app

RUN addgroup -S nodeuser && adduser -S nodeuser -G nodeuser

RUN mkdir -p /app/data && chown -R nodeuser:nodeuser /app

COPY --from=builder --chown=nodeuser:nodeuser /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodeuser /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodeuser /app/prisma ./prisma
COPY --from=builder --chown=nodeuser:nodeuser /app/package.json ./package.json
COPY --from=builder --chown=nodeuser:nodeuser /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nodeuser:nodeuser /app/tsconfig.json ./tsconfig.json

USER nodeuser

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main"]