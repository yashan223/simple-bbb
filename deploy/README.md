# VPS Deployment Guide

This guide covers hosting the PulseEdu BigBlueButton portal on your VPS running on port `4444` with Nginx and/or HAProxy.

## 1. Running the Next.js Service (Port 4444)

The application is configured to run on port `4444` via `npm run start` (or `npm run dev`).

### Option A: Systemd Service (Recommended)

1. Copy `deploy/pulseedu.service` to `/etc/systemd/system/pulseedu.service`:
   ```bash
   sudo cp deploy/pulseedu.service /etc/systemd/system/pulseedu.service
   ```
2. Adjust `User` and `WorkingDirectory` if your app path differs.
3. Reload systemd and enable service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable pulseedu
   sudo systemctl start pulseedu
   sudo systemctl status pulseedu
   ```

### Option B: PM2 Process Manager

```bash
npm install -g pm2
pm2 start "npm run start" --name pulseedu
pm2 save
pm2 startup
```

---

## 2. Nginx Setup

If using Nginx as your web server / SSL terminator:

1. Copy configuration:
   ```bash
   sudo cp deploy/meeting.pulseedu.online.conf /etc/nginx/sites-available/meeting.pulseedu.online.conf
   sudo ln -s /etc/nginx/sites-available/meeting.pulseedu.online.conf /etc/nginx/sites-enabled/
   ```
2. Generate SSL with Certbot:
   ```bash
   sudo certbot --nginx -d meeting.pulseedu.online
   ```
3. Test and reload Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 3. HAProxy Setup

If using HAProxy for high availability and load balancing:

1. Combine certificate and private key into a single `.pem` file for HAProxy:
   ```bash
   sudo mkdir -p /etc/ssl/pulseedu
   sudo cat /etc/letsencrypt/live/meeting.pulseedu.online/fullchain.pem /etc/letsencrypt/live/meeting.pulseedu.online/privkey.pem > /etc/ssl/pulseedu/meeting.pulseedu.online.pem
   sudo chmod 600 /etc/ssl/pulseedu/meeting.pulseedu.online.pem
   ```
2. Copy configuration:
   ```bash
   sudo cp deploy/haproxy.cfg /etc/haproxy/haproxy.cfg
   ```
3. Test and reload HAProxy:
   ```bash
   sudo haproxy -c -f /etc/haproxy/haproxy.cfg
   sudo systemctl restart haproxy
   ```

---

## 4. Combined Architecture (HAProxy -> Nginx -> Next.js)

If running HAProxy as the edge load balancer and Nginx as the internal web server:
- HAProxy listens on `80/443` and forwards traffic to Nginx on port `8080`.
- Nginx handles static asset caching and proxies dynamic requests to Next.js on port `4444`.
