# VPS Deployment Guide (meeting.pulseedu.online)

This guide covers deploying the PulseEdu BigBlueButton portal on your VPS at `/var/www/simple-bbb` running on port `4444` with Nginx and/or HAProxy.

---

## 0. Pull Latest Changes on VPS

Before copying files, make sure your local repository on the VPS is up to date:

```bash
cd /var/www/simple-bbb
git pull origin master
```

---

## 1. Running Next.js on Port 4444

Build the production bundle first:

```bash
cd /var/www/simple-bbb
npm install
npm run build
```

### Option A: Systemd Service (Recommended)

1. Copy the systemd service file:
   ```bash
   sudo cp /var/www/simple-bbb/deploy/pulseedu.service /etc/systemd/system/pulseedu.service
   ```

2. Reload systemd and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable pulseedu
   sudo systemctl restart pulseedu
   sudo systemctl status pulseedu
   ```

### Option B: PM2 Process Manager

```bash
cd /var/www/simple-bbb
npm install -g pm2
pm2 start "npm run start" --name pulseedu
pm2 save
pm2 startup
```

---

## 2. Nginx Setup (meeting.pulseedu.online.conf)

1. Copy the Nginx configuration:
   ```bash
   sudo cp /var/www/simple-bbb/deploy/meeting.pulseedu.online.conf /etc/nginx/sites-available/meeting.pulseedu.online.conf
   sudo ln -sf /etc/nginx/sites-available/meeting.pulseedu.online.conf /etc/nginx/sites-enabled/
   ```

2. Generate or update SSL with Certbot:
   ```bash
   sudo certbot --nginx -d meeting.pulseedu.online
   ```

3. Test configuration and reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 3. HAProxy Setup (meeting.pulseedu.online.cfg)

1. Prepare SSL certificate for HAProxy:
   ```bash
   sudo mkdir -p /etc/ssl/pulseedu
   sudo cat /etc/letsencrypt/live/meeting.pulseedu.online/fullchain.pem /etc/letsencrypt/live/meeting.pulseedu.online/privkey.pem > /etc/ssl/pulseedu/meeting.pulseedu.online.pem
   sudo chmod 600 /etc/ssl/pulseedu/meeting.pulseedu.online.pem
   ```

2. Copy the HAProxy configuration:
   ```bash
   sudo cp /var/www/simple-bbb/deploy/meeting.pulseedu.online.cfg /etc/haproxy/haproxy.cfg
   ```

3. Test configuration and restart HAProxy:
   ```bash
   sudo haproxy -c -f /etc/haproxy/haproxy.cfg
   sudo systemctl restart haproxy
   sudo systemctl status haproxy
   ```

---

## 4. Troubleshooting

- **Check Next.js response**:
  ```bash
  curl -I http://127.0.0.1:4444
  ```
- **View Next.js logs**:
  ```bash
  journalctl -u pulseedu -f
  ```
- **Check listening ports**:
  ```bash
  ss -tulpn | grep 4444
  ```
