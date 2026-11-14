#!/usr/bin/env bash
# One-shot setup of SchoolDhundo on a fresh Oracle Cloud Ubuntu 24.04 server (Always Free A1.Flex works).
# Safe to run again: later runs pull the latest code and rebuild; existing secrets and data are kept.
#
#   ssh ubuntu@<server ip> 'bash -s' < deploy/oracle-setup.sh
#
# Afterwards, point the domain's A records (schooldhundo.in and www) at the server; Caddy then gets the
# HTTPS certificate by itself. See DEPLOYMENT.md for Google sign-in, email and loading the school data.
set -euo pipefail

DOMAIN="${DOMAIN:-schooldhundo.in}"
REPO="${REPO:-https://github.com/rakeshkuma/SchoolFinder.git}"
BRANCH="${BRANCH:-develop}"
APP_DIR="${APP_DIR:-$HOME/schooldhundo}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

say() { printf '\n==> %s\n' "$*"; }

say "Updating the system"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl openssl debian-keyring debian-archive-keyring apt-transport-https

# Oracle's Ubuntu images block everything except SSH in iptables, in addition to the cloud security list.
say "Opening ports 80 and 443 in the server firewall"
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    reject=$(sudo iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
    sudo iptables -I INPUT "${reject:-1}" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  fi
done
if command -v netfilter-persistent >/dev/null; then sudo netfilter-persistent save; fi

# Swap keeps the image builds (Maven, npm) from running out of memory on the smaller shape.
if ! swapon --show | grep -q /swapfile; then
  say "Adding 4 GB of swap"
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

if ! command -v docker >/dev/null; then
  say "Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

if ! command -v caddy >/dev/null; then
  say "Installing Caddy (HTTPS)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi

say "Getting the code ($BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  git -C "$APP_DIR" checkout --quiet "$BRANCH"
  git -C "$APP_DIR" reset --quiet --hard "origin/$BRANCH"
else
  git clone --quiet --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

if [ ! -f .env ]; then
  say "Creating .env with fresh secrets"
  admin_password=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
  umask 077
  cat > .env <<EOF
POSTGRES_DB=india_school_finder
POSTGRES_USER=isf_app
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=$admin_password
PUBLIC_SITE_URL=https://$DOMAIN
# Bound to this machine only; Caddy is the public front door on 80/443.
FRONTEND_PORT=127.0.0.1:8081
SWAGGER_ENABLED=false
SESSION_TIMEOUT=2h
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MAIL_FROM=
SPRING_MAIL_HOST=
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=
SPRING_MAIL_PASSWORD=
EOF
  # The first admin password is kept only on the server, readable by this user alone.
  printf 'SchoolDhundo admin\nusername: admin\npassword: %s\n' "$admin_password" > "$HOME/schooldhundo-admin.txt"
  echo "First admin password saved in $HOME/schooldhundo-admin.txt (not shown here)."
fi

say "Configuring Caddy for $DOMAIN"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMAIN {
    encode gzip
    reverse_proxy 127.0.0.1:8081
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}

www.$DOMAIN {
    redir https://$DOMAIN{uri} permanent
}
EOF
sudo systemctl enable --now caddy
sudo systemctl reload caddy

say "Building and starting the site (the first build takes 10-20 minutes)"
sudo $COMPOSE up -d --build
sudo $COMPOSE ps

say "Done"
echo "Server address: $(curl -fsS https://api.ipify.org || echo unknown)"
echo "Next: point the A records of $DOMAIN and www.$DOMAIN at that address, then open https://$DOMAIN"
