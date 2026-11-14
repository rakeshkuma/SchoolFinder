#!/usr/bin/env bash
# Sets up PostgreSQL on the small Oracle Always Free server "schooldhundo-db" (VM.Standard.E2.1.Micro, 1 GB).
# The database accepts connections only from inside the Oracle network (10.1.0.0/16), never from the internet.
# Safe to run again. The app user's password is created once and kept in ~/schooldhundo-db.txt (not printed).
#
#   ssh ubuntu@<db server ip> 'bash -s' < deploy/oracle-micro-db.sh
set -euo pipefail

DB_NAME="${DB_NAME:-india_school_finder}"
DB_USER="${DB_USER:-isf_app}"
NETWORK="${NETWORK:-10.1.0.0/16}"
say() { printf '\n==> %s\n' "$*"; }

say "Updating the system"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql openssl

if ! swapon --show | grep -q /swapfile; then
  say "Adding 2 GB of swap"
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

say "Opening PostgreSQL to the private network only"
if ! sudo iptables -C INPUT -p tcp -s "$NETWORK" --dport 5432 -j ACCEPT 2>/dev/null; then
  reject=$(sudo iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
  sudo iptables -I INPUT "${reject:-1}" -p tcp -s "$NETWORK" --dport 5432 -j ACCEPT
fi
if command -v netfilter-persistent >/dev/null; then sudo netfilter-persistent save; fi

say "Configuring PostgreSQL for a 1 GB server"
conf_dir=$(sudo -u postgres psql -tAc 'SHOW config_file' | xargs dirname)
private_ip=$(hostname -I | awk '{print $1}')
sudo tee "$conf_dir/conf.d/schooldhundo.conf" >/dev/null <<EOF
listen_addresses = 'localhost,$private_ip'
max_connections = 30
shared_buffers = 128MB
effective_cache_size = 512MB
work_mem = 4MB
maintenance_work_mem = 64MB
password_encryption = scram-sha-256
EOF
hba="$conf_dir/pg_hba.conf"
rule="host    $DB_NAME    $DB_USER    $NETWORK    scram-sha-256"
sudo grep -qF "$rule" "$hba" || echo "$rule" | sudo tee -a "$hba" >/dev/null

secret="$HOME/schooldhundo-db.txt"
if [ ! -f "$secret" ]; then
  say "Creating the database and its user"
  password=$(openssl rand -base64 24 | tr -d '/+=')
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<EOF
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN CREATE ROLE $DB_USER LOGIN; END IF;
END \$\$;
ALTER ROLE $DB_USER PASSWORD '$password';
EOF
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  (umask 077; printf 'DB_HOST=%s\nDB_NAME=%s\nDB_USER=%s\nDB_PASSWORD=%s\n' "$private_ip" "$DB_NAME" "$DB_USER" "$password" > "$secret")
fi
sudo systemctl restart postgresql

say "Nightly backup (keeps 7 days in /var/backups/schooldhundo)"
sudo install -d -o postgres -g postgres -m 700 /var/backups/schooldhundo
sudo tee /etc/cron.d/schooldhundo-backup >/dev/null <<EOF
30 2 * * * postgres pg_dump -Fc $DB_NAME > /var/backups/schooldhundo/$DB_NAME-\$(date +\%F).dump && find /var/backups/schooldhundo -name '*.dump' -mtime +7 -delete
EOF

say "Done"
sudo -u postgres psql -tAc "SELECT 'PostgreSQL ' || current_setting('server_version') || ', listening on ' || current_setting('listen_addresses')"
