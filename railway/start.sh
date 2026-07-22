#!/bin/sh
set -e

# Railway sets the PORT environment variable
export PORT=${PORT:-8080}
echo "🚀 Starting OKO on port $PORT..."

# Generate encryption keys when they are not configured
if [ -z "$RSA_PRIVATE_KEY" ]; then
    export RSA_PRIVATE_KEY=$(openssl genrsa 2048 2>/dev/null)
fi
if [ -z "$DATA_ENCRYPTION_KEY" ]; then
    export DATA_ENCRYPTION_KEY=$(openssl rand -base64 32)
fi

# Generate the nginx configuration
cat > /etc/nginx/http.d/default.conf << NGINX_EOF
server {
    listen $PORT;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8081/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

# Start the backend on port 8081
API_SERVER_PORT=8081 /app/oko &
sleep 2

# Start nginx in the background
nginx

echo "✅ OKO started successfully"

# Keep the container running
tail -f /dev/null
