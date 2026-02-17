#!/bin/bash
# Deploy script per www.ldm4app.com
# Esegui: bash deploy.sh

set -e

DOMAIN="www.ldm4app.com"
SERVER_USER="your-user"  # MODIFICA: username SSH
SERVER_HOST="your-host"  # MODIFICA: IP o dominio del server
APP_DIR="/var/www/ldm4app"
IA_DIR="/opt/ia-server"

echo "=== Deploy ia-server su $DOMAIN ==="

# 1. Copia file sul server
echo "1. Copiando file..."
ssh $SERVER_USER@$SERVER_HOST "mkdir -p $IA_DIR"
scp -r . $SERVER_USER@$SERVER_HOST:$IA_DIR/

# 2. Installa Docker (se non presente)
echo "2. Verificando Docker..."
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
  if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
  fi
  docker --version
EOF

# 3. Build e avvia container
echo "3. Build e avvio container..."
ssh $SERVER_USER@$SERVER_HOST "cd $IA_DIR && docker-compose up -d"

# 4. Verifica salute
echo "4. Verificando salute del server..."
ssh $SERVER_USER@$SERVER_HOST "sleep 5 && curl -s http://127.0.0.1:5000/health | grep -q ok && echo 'Server OK' || echo 'Errore: server non risponde'"

# 5. Configure Nginx (copia example config e abilita)
echo "5. Aggiornando Nginx..."
ssh $SERVER_USER@$SERVER_HOST << EOF
  sudo cp $IA_DIR/nginx.conf.example /etc/nginx/sites-available/$DOMAIN
  sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
EOF

echo "=== Deploy completato ==="
echo "Verifica: https://$DOMAIN/health"
