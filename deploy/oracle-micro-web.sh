#!/usr/bin/env bash
# Sets up the website on the small Oracle Always Free server "schooldhundo-web" (VM.Standard.E2.1.Micro, 1 GB).
# Caddy (HTTPS, ports 80/443) -> nginx on 127.0.0.1:8081 (the project's frontend/nginx.conf) -> Spring Boot on
# 127.0.0.1:8080 -> PostgreSQL on schooldhundo-db (oracle-micro-db.sh). Nothing is built here: the jar and the React
# build are made elsewhere and uploaded first (deploy/oracle-micro-deploy.ps1 does both). Safe to run again.
#
# Expects in /tmp/schooldhundo: app.jar, www/ (frontend dist), nginx.conf, security-headers.conf, and on the first
# run db.txt (DB_HOST/DB_NAME/DB_USER/DB_PASSWORD from the database server).
set -euo pipefail

DOMAIN="${DOMAIN:-schooldhundo.in}"
UPLOAD=/tmp/schooldhundo
ENV_FILE=/etc/schooldhundo/backend.env
say() { printf '\n==> %s\n' "$*"; }

if ! command -v caddy >/dev/null || ! command -v nginx >/dev/null || ! command -v java >/dev/null; then
  say "Installing Java 25, nginx and Caddy"
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx curl gpg openssl debian-keyring debian-archive-keyring apt-transport-https
  curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/adoptium.gpg
  echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(. /etc/os-release; echo "$VERSION_CODENAME") main" \
    | sudo tee /etc/apt/sources.list.d/adoptium.list >/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y temurin-25-jre caddy
fi

if ! swapon --show | grep -q /swapfile; then
  say "Adding 2 GB of swap"
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Oracle's Ubuntu images block everything except SSH in iptables, in addition to the cloud security list.
say "Opening ports 80 and 443"
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    reject=$(sudo iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
    sudo iptables -I INPUT "${reject:-1}" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  fi
done
if command -v netfilter-persistent >/dev/null; then sudo netfilter-persistent save; fi

if ! sudo test -f "$ENV_FILE"; then
  say "Creating $ENV_FILE with fresh secrets"
  # shellcheck disable=SC1091
  . "$UPLOAD/db.txt"
  admin_password=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
  sudo install -d -m 750 /etc/schooldhundo
  sudo tee "$ENV_FILE" >/dev/null <<EOF
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
DB_URL=jdbc:postgresql://$DB_HOST:5432/$DB_NAME
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_POOL_SIZE=5
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
PUBLIC_SITE_URL=https://$DOMAIN
CORS_ALLOWED_ORIGINS=https://$DOMAIN
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=$admin_password
SWAGGER_ENABLED=false
SESSION_TIMEOUT=2h
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Account email: uncomment and fill in all of these together. An empty SPRING_MAIL_HOST still switches mail on
# (and fails the health check), so the lines stay commented out until there is an SMTP provider.
#MAIL_FROM=
#SPRING_MAIL_HOST=
#SPRING_MAIL_PORT=587
#SPRING_MAIL_USERNAME=
#SPRING_MAIL_PASSWORD=
#SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
#SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
EOF
  sudo chmod 640 "$ENV_FILE"
  (umask 077; printf 'SchoolDhundo admin\nusername: admin\npassword: %s\n' "$admin_password" > "$HOME/schooldhundo-admin.txt")
  rm -f "$UPLOAD/db.txt"
  echo "First admin password saved in $HOME/schooldhundo-admin.txt (not shown here)."
fi

say "Installing the backend"
id schooldhundo >/dev/null 2>&1 || sudo useradd --system --home /opt/schooldhundo --shell /usr/sbin/nologin schooldhundo
sudo install -d -o schooldhundo -g schooldhundo /opt/schooldhundo
sudo chgrp schooldhundo "$ENV_FILE" /etc/schooldhundo
sudo install -o schooldhundo -g schooldhundo -m 640 "$UPLOAD/app.jar" /opt/schooldhundo/app.jar
sudo tee /etc/systemd/system/schooldhundo.service >/dev/null <<'EOF'
[Unit]
Description=SchoolDhundo backend (Spring Boot)
After=network-online.target
Wants=network-online.target

[Service]
User=schooldhundo
WorkingDirectory=/opt/schooldhundo
EnvironmentFile=/etc/schooldhundo/backend.env
# Sized for a 1 GB server: small heap, serial GC, JIT kept light.
ExecStart=/usr/bin/java -Xms128m -Xmx400m -XX:MaxMetaspaceSize=200m -Xss512k -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -jar /opt/schooldhundo/app.jar
Restart=always
RestartSec=10
TimeoutStartSec=300
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable schooldhundo >/dev/null
sudo systemctl restart schooldhundo

say "Installing the website (nginx on 127.0.0.1:8081)"
sudo rm -rf /var/www/schooldhundo.new
sudo cp -r "$UPLOAD/www" /var/www/schooldhundo.new
# Uploads from Windows can arrive without read permission for others; nginx runs as www-data.
sudo chown -R root:root /var/www/schooldhundo.new
sudo chmod -R u=rwX,go=rX /var/www/schooldhundo.new
sudo rm -rf /var/www/schooldhundo.old
if [ -d /var/www/schooldhundo ]; then sudo mv /var/www/schooldhundo /var/www/schooldhundo.old; fi
sudo mv /var/www/schooldhundo.new /var/www/schooldhundo
sudo install -d /etc/nginx/snippets
sudo cp "$UPLOAD/security-headers.conf" /etc/nginx/snippets/security-headers.conf
sed -e 's#listen 80;#listen 127.0.0.1:8081;#' \
    -e 's#http://backend:8080#http://127.0.0.1:8080#g' \
    -e 's#root /usr/share/nginx/html;#root /var/www/schooldhundo;#' \
    "$UPLOAD/nginx.conf" | sudo tee /etc/nginx/sites-available/schooldhundo >/dev/null
sudo ln -sf /etc/nginx/sites-available/schooldhundo /etc/nginx/sites-enabled/schooldhundo
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx >/dev/null
sudo systemctl reload nginx || sudo systemctl restart nginx

say "Configuring Caddy (HTTPS) for $DOMAIN"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMAIN {
    encode gzip
    reverse_proxy 127.0.0.1:8081 {
        header_up X-Forwarded-Proto https
    }
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}

www.$DOMAIN {
    redir https://$DOMAIN{uri} permanent
}
EOF
sudo systemctl enable caddy >/dev/null
sudo systemctl reload caddy || sudo systemctl restart caddy

say "Waiting for the backend to start (can take a few minutes on this small server)"
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/actuator/health 2>/dev/null | grep -q UP; then echo "Backend is UP"; break; fi
  sleep 10
done
curl -fsS http://127.0.0.1:8080/actuator/health || { echo "Backend not up yet; see: sudo journalctl -u schooldhundo -n 100"; exit 1; }
echo
curl -fsS -o /dev/null -w "Website through nginx: HTTP %{http_code}\n" http://127.0.0.1:8081/
free -m
