FROM node:18-alpine

WORKDIR /usr/src/app

# copia package files
COPY package*.json ./

# installa dipendenze (include transformers.js)
RUN npm ci --only=production

# copia app
COPY . .

# crea dir per file caricati
RUN mkdir -p uploaded-models

# ENV per transformers.js (cache dei modelli)
ENV TRANSFORMERS_CACHE=/usr/src/app/models-cache
ENV HF_HOME=/usr/src/app/models-cache
RUN mkdir -p $TRANSFORMERS_CACHE

# expose port
EXPOSE 5000

# increase Node heap size per model loading
ENV NODE_OPTIONS="--max-old-space-size=1024"

# start server
# Aumento il timeout CMD per il primo avvio (caricamento modello)
CMD ["node", "server.js"]
