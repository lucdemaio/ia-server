FROM node:18-alpine

WORKDIR /usr/src/app

# copia package files
COPY package*.json ./

# installa dipendenze
RUN npm ci --only=production

# copia app
COPY . .

# crea dir per file caricati
RUN mkdir -p uploaded-models

# expose port
EXPOSE 5000

# start server
CMD ["node", "server.js"]
