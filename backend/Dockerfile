# Backend ParkyFilms — imagen de producción local
FROM node:20-alpine

WORKDIR /app

# Instalar solo dependencias de producción (rápido y liviano)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Código del backend
COPY backend/server.js ./
COPY backend/src ./src

# El backend genera PDFs en ./temp -> debe ser escribible por el usuario node
RUN mkdir -p /app/temp && chown -R node:node /app

# Usuario no-root por seguridad
USER node

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Chequeo de salud para Docker / Compose / K8s
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
