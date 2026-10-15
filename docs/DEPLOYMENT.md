# Deployment Guide — Quartet Web

> Setup untuk deploy Quartet Web ke VPS dengan domain + HTTPS.
> Scope saat ini: **staging deployment** (Phase 0+1, landing page + health endpoint).
> Production launch proper = setelah Phase 2 (FE Game UI) selesai.

---

## 0. Prasyarat Server

Tested on **Ubuntu 22.04 LTS** (recommended). Domain: `quartet.adit.dev`.

Asumsi:

- Akses SSH ke VPS sebagai user dengan `sudo`.
- Domain `quartet.adit.dev` sudah pointing ke IP server (A record).
- Port 22 (SSH), 80 (HTTP), 443 (HTTPS) terbuka di firewall.

---

## 1. Initial Setup (jalankan sekali)

SSH ke server sebagai user biasa:

```bash
ssh user@quartet.adit.dev
```

### 1.1 Update + install dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx ufw
```

### 1.2 Install Node.js 20 LTS via NodeSource

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # harus v20.x
```

### 1.3 Install pnpm 9

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc   # atau restart shell
pnpm --version     # harus 9.x
```

### 1.4 Setup firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # buka 80 + 443
sudo ufw enable
sudo ufw status
```

---

## 2. Deploy Aplikasi

### 2.1 Buat user & folder (opsional, untuk isolasi)

```bash
sudo useradd -m -s /bin/bash quartet
sudo mkdir -p /opt/quartet
sudo chown quartet:quartet /opt/quartet
```

### 2.2 Clone repository

```bash
sudo -u quartet git clone https://github.com/adityabm/quartet.git /opt/quartet/app
cd /opt/quartet/app
```

### 2.3 Install dependencies

```bash
pnpm install --frozen-lockfile
```

### 2.4 Build semua packages

```bash
pnpm build
```

Output:

- `apps/web/dist/` → static files (FE)
- `apps/server/dist/index.js` → server bundle
- `packages/*/dist/` → shared packages (konsumtif via workspace)

### 2.5 Set environment

Buat `/opt/quartet/.env`:

```bash
sudo -u quartet nano /opt/quartet/.env
```

Isi:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DATABASE_URL=    # kosong di Phase 0, dipakai mulai Phase 4
REDIS_URL=       # kosong di Phase 0
ROOM_EXPIRY_MINUTES=30
BLUFF_WINDOW_MS=5000
MAX_PLAYERS=6
MIN_PLAYERS=2
```

### 2.6 Test manual (sanity check)

```bash
cd /opt/quartet/app
node apps/server/dist/index.js
```

Di terminal lain:

```bash
curl http://localhost:3000/health
```

Harusnya dapat `{"status":"ok","service":"quartet-server","version":"0.1.0",...}`. Ctrl+C stop.

---

## 3. Process Manager (systemd)

Buat service file:

```bash
sudo nano /etc/systemd/system/quartet.service
```

Isi:

```ini
[Unit]
Description=Quartet Web Server (Fastify + WS)
After=network.target

[Service]
Type=simple
User=quartet
Group=quartet
WorkingDirectory=/opt/quartet/app
EnvironmentFile=/opt/quartet/.env
ExecStart=/usr/bin/node apps/server/dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable + start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable quartet
sudo systemctl start quartet
sudo systemctl status quartet
```

Lihat logs:

```bash
sudo journalctl -u quartet -f
```

---

## 4. Reverse Proxy (Nginx)

### 4.1 Config

```bash
sudo nano /etc/nginx/sites-available/quartet.adit.dev
```

Isi:

```nginx
# HTTP server — redirect semua ke HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name quartet.adit.dev;

    # Untuk certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name quartet.adit.dev;

    # SSL certs (akan diisi certbot)
    ssl_certificate     /etc/letsencrypt/live/quartet.adit.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quartet.adit.dev/privkey.pem;

    # Security headers (basic — Phase 5 akan diperkuat)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # FE static files (Vite build output)
    root /opt/quartet/app/apps/web/dist;
    index index.html;

    # SPA fallback — semua non-API route ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API + WS
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket endpoint (Phase 4+)
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # Health check (no auth, untuk monitoring)
    location = /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable + test config:

```bash
sudo ln -s /etc/nginx/sites-available/quartet.adit.dev /etc/nginx/sites-enabled/
sudo nginx -t
```

### 4.2 HTTPS dengan Let's Encrypt

```bash
sudo certbot --nginx -d quartet.adit.dev --agree-tos --no-eff-email --redirect
```

Auto-renewal sudah otomatis via systemd timer. Test:

```bash
sudo certbot renew --dry-run
```

### 4.3 Reload nginx

```bash
sudo systemctl reload nginx
```

---

## 5. Verify

```bash
# HTTPS health
curl https://quartet.adit.dev/health

# Landing page (HTML)
curl -s https://quartet.adit.dev/ | head -20

# Browser visit
# https://quartet.adit.dev
```

---

## 6. Update / Redeploy

Setiap kali push ke main dan mau update server:

```bash
ssh user@quartet.adit.dev
sudo -u quartet bash -c '
  cd /opt/quartet/app
  git pull origin main
  pnpm install --frozen-lockfile
  pnpm build
'
sudo systemctl restart quartet
sudo journalctl -u quartet -n 20 --no-pager   # cek log post-restart
```

---

## 7. CI/CD Auto-Deploy (Opsional)

Setup GitHub Actions agar auto-deploy setiap push ke main:

1. Generate SSH keypair:

```bash
ssh-keygen -t ed25519 -C "github-actions@quartet" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

2. Add private key ke GitHub Secrets: `Settings → Secrets → QUARTET_SSH_KEY`.

3. Buat `.github/workflows/deploy.yml` (akan ditambahkan di Phase 5).

**Untuk saat ini (staging manual)**, step 6 (manual redeploy) cukup.

---

## 8. Troubleshooting

### 502 Bad Gateway

- Cek `systemctl status quartet` — server harus running.
- Cek logs: `journalctl -u quartet -n 50`.
- Cek port: `sudo ss -tlnp | grep 3000`.

### Certbot gagal

- Pastikan DNS A record `quartet.adit.dev` → IP server sudah propagate (`dig quartet.adit.dev`).
- Pastikan port 80 terbuka untuk challenge.

### FE tidak load (blank page)

- Cek nginx logs: `sudo tail -50 /var/log/nginx/error.log`.
- Cek `/opt/quartet/app/apps/web/dist/index.html` exists.
- Pastikan nginx config `root` path benar.

### Server tidak start

- Cek `.env` syntax (no trailing spaces, no comments inline).
- Cek `node --version` ≥ 20.
- Cek `apps/server/dist/index.js` exists (kalau tidak, jalankan `pnpm build`).

---

## 9. Phase Scope Status

| Phase   | Scope                    | Hosted?                             |
| ------- | ------------------------ | ----------------------------------- |
| Phase 0 | Skeleton + landing page  | ✅ bisa online (sekarang)           |
| Phase 1 | GameEngine types + rules | ✅ backend only (no visible change) |
| Phase 2 | Single-player vs bot     | ⏳ FE UI baru playable              |
| Phase 3 | Bot Normal/Hard          | ⏳ difficulty selection             |
| Phase 4 | Multiplayer real-time    | ⏳ WS endpoint live                 |
| Phase 5 | Production polish        | ⏳ observability, scaling, CDN      |

**Sekarang setelah setup ini**: https://quartet.adit.dev menampilkan landing page Phase 0 (badge "Phase 0 — Skeleton"). Tombol belum functional — itu normal, butuh Phase 2.

---

_Last updated: 2026-10-15_
