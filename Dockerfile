# =============================================================
# ETAPA 1: Construcción y dependencias de producción
# =============================================================
FROM node:22-alpine AS dependencies

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción mediante npm ci
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --package-lock-only && npm ci --omit=dev; fi

# =============================================================
# ETAPA 2: Imagen final de producción
# =============================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Variables de entorno de producción
ENV NODE_ENV=production \
    PORT=3000

# Copiar dependencias de producción instaladas en la etapa 1
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/
COPY tests/ ./tests/

# Asignar permisos al usuario no privilegiado 'node'
RUN chown -R node:node /app

# Configuración explícita del usuario sin privilegios para ejecución segura
USER node

# Exponer el puerto de la aplicación
EXPOSE 3000

# Comando de arranque del servidor
CMD ["node", "src/server.js"]
