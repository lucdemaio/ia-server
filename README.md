IA Server — Express + Docker (LDM4APP)

Descrizione
Server demo di upload/inferenza per ia.html. Salva file caricati e restituisce risposte simulate (mock).

Contenuti
- server.js: app Express con endpoint upload/infer
- package.json: dipendenze Node
- Dockerfile: immagine Docker
- docker-compose.yml: orchestrazione locale
- nginx.conf.example: configurazione reverse proxy
- deploy.sh: script di deploy automatico

Endpoint API
GET  /health              -> {"ok":true}
GET  /models              -> {"models":[...]}
POST /upload-model        -> multipart, field="file" -> {"model":"...","size":...}
POST /infer               -> JSON {"model":"...","prompt":"..."} -> {"result":"..."}

Setup locale (test)
1) Clone/copia: cd ia-server
2) npm install
3) npm start (ascolta su http://localhost:5000)
4) Verifica: curl http://localhost:5000/health

Setup Docker (consigliato)
docker-compose up -d
docker-compose logs -f
docker-compose down

Deploy su www.ldm4app.com
Prerequisiti
- VPS / server Linux con Docker
- Dominio configurato (DNS A record)
- SSH access

Passi
1) Modifica deploy.sh:
   - SERVER_USER="your-user"
   - SERVER_HOST="your-ip-or-domain"
   - APP_DIR="/var/www/ldm4app"

2) Esegui: bash deploy.sh

3) Configura SSL (Certbot):
   sudo certbot certonly --nginx -d www.ldm4app.com

4) Test:
   curl https://www.ldm4app.com/health

Alternative al deploy script

Manuale:
1) SSH al server
2) git clone ... || scp -r ia-server user@host:/opt/ia-server
3) cd /opt/ia-server && docker-compose up -d
4) cp nginx.conf.example /etc/nginx/sites-available/ldm4app.com
5) ln -s /etc/nginx/sites-available/ldm4app.com /etc/nginx/sites-enabled/
6) sudo nginx -t && sudo systemctl reload nginx

Con PM2 (no Docker):
1) npm install -g pm2
2) pm2 start server.js --name ia-server
3) pm2 save && pm2 startup

Note sviluppo
- /infer è un mock: ritorna {"result":"..."} per test UI
- Per inferenza reale integra Hugging Face API, Transformers.js o un runtime locale
- upload-model salva in ./uploaded-models (persistente via volume Docker)
- CORS abilitato: il client in ia.html può chiamare da stesso origin

Security reminder
- Configura firewall (solo 80/443 pubblici, 5000 privato)
- Usa HTTPS (Certbot/Let's Encrypt)
- Limita upload size (client_max_body_size in Nginx)
- Auth/token se richieso
- Rate-limit per /infer se esposto pubblicamente
