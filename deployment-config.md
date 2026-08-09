# Production Deployment Configuration

## PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'resume-builder-api',
    script: './backend-setup.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.env']
  }]
};
```

Start with PM2:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Nginx Configuration

Create `/etc/nginx/sites-available/resume-builder`:

```nginx
upstream resume_builder {
  least_conn;
  server 127.0.0.1:5000;
  server 127.0.0.1:5001;
  server 127.0.0.1:5002;
  keepalive 64;
}

server {
  listen 80;
  server_name api.resumebuilder.com;
  
  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.resumebuilder.com;

  # SSL Configuration
  ssl_certificate /etc/letsencrypt/live/api.resumebuilder.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.resumebuilder.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # Security Headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "no-referrer-when-downgrade" always;

  # Compression
  gzip on;
  gzip_vary on;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_types text/plain text/css text/xml text/javascript 
             application/json application/javascript application/xml+rss 
             application/rss+xml font/truetype font/opentype 
             application/vnd.ms-fontobject image/svg+xml;

  # Logging
  access_log /var/log/nginx/resume-builder-access.log;
  error_log /var/log/nginx/resume-builder-error.log;

  # Rate Limiting
  limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
  
  limit_req zone=general burst=20 nodelay;

  # API Proxy
  location /api/ {
    limit_req zone=general burst=20 nodelay;
    
    proxy_pass http://resume_builder;
    proxy_http_version 1.1;
    
    # Headers
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Buffering
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
  }

  # Login rate limiting
  location /api/auth/login {
    limit_req zone=login burst=5 nodelay;
    proxy_pass http://resume_builder;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # Health check
  location /api/health {
    proxy_pass http://resume_builder;
    access_log off;
  }

  # Static files caching
  location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    proxy_pass http://resume_builder;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  # Deny access to sensitive files
  location ~ /\.env {
    deny all;
  }
  
  location ~ /\.git/ {
    deny all;
  }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/resume-builder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.resumebuilder.com
```

Auto-renewal:
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## MySQL Optimization

### my.cnf Configuration

```ini
[mysqld]
# Performance
max_connections = 100
max_allowed_packet = 256M
thread_stack = 256K
thread_cache_size = 8

# InnoDB
default-storage-engine = InnoDB
innodb_buffer_pool_size = 1GB
innodb_log_file_size = 256MB
innodb_flush_log_at_trx_commit = 2

# Query Cache
query_cache_type = 1
query_cache_size = 16M
query_cache_limit = 2M

# Slow Query Log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_queries_not_using_indexes = 1

# Binary Logging (for replication/backup)
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = row
```

## Backup Strategy

### Daily Backup Script

Create `/usr/local/bin/backup-resume-builder.sh`:

```bash
#!/bin/bash

# Configuration
DB_USER="root"
DB_PASSWORD="your_password"
DB_NAME="resume_builder"
BACKUP_DIR="/var/backups/resume-builder"
RETENTION_DAYS=30

# Create backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/resume_builder_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_FILE
gzip $BACKUP_FILE

# Cleanup old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
# aws s3 cp "${BACKUP_FILE}.gz" s3://your-backup-bucket/

echo "Backup completed: ${BACKUP_FILE}.gz"
```

Make executable and add to crontab:
```bash
chmod +x /usr/local/bin/backup-resume-builder.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /usr/local/bin/backup-resume-builder.sh
```

## Monitoring & Logging

### Application Performance Monitoring

Consider using:
- **New Relic** - APM and infrastructure monitoring
- **DataDog** - Comprehensive monitoring
- **Sentry** - Error tracking
- **LogRocket** - Session replay and errors

### Log Rotation

Create `/etc/logrotate.d/resume-builder`:

```
/var/log/nginx/resume-builder-*.log {
  daily
  missingok
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 www-data www-data
  sharedscripts
}

/home/app/logs/* {
  daily
  missingok
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 app app
}
```

## Health Check & Auto-Recovery

Create `/usr/local/bin/health-check.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:5000/api/health"
MAX_RETRIES=3
RETRY_COUNT=0

check_health() {
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
  if [ $STATUS -eq 200 ]; then
    return 0
  else
    return 1
  fi
}

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if check_health; then
    echo "API is healthy"
    exit 0
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 5
done

echo "API is down. Restarting service..."
pm2 restart resume-builder-api
```

Add to crontab (check every 5 minutes):
```bash
*/5 * * * * /usr/local/bin/health-check.sh
```

## Environment Variables for Production

```env
# Server
PORT=5000
NODE_ENV=production

# Database
DB_HOST=production-db.example.com
DB_PORT=3306
DB_USER=resume_prod_user
DB_PASSWORD=strong_secure_password_here
DB_NAME=resume_builder_prod

# JWT Security
JWT_SECRET=very_long_secure_random_string_minimum_32_chars
JWT_REFRESH_SECRET=another_very_long_secure_random_string

# Frontend
FRONTEND_URL=https://resumebuilder.com

# HTTPS
HTTPS_KEY=/etc/letsencrypt/live/api.resumebuilder.com/privkey.pem
HTTPS_CERT=/etc/letsencrypt/live/api.resumebuilder.com/fullchain.pem

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=resume-builder-uploads-prod
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=your_sentry_dsn
NEW_RELIC_LICENSE_KEY=your_new_relic_key

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/resume-builder/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=https://resumebuilder.com
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=Strict
```

## Database Replication Setup

For high availability, setup MySQL replication:

### Primary Server Configuration

```sql
-- On primary server
CHANGE MASTER TO
  MASTER_HOST='slave-server-ip',
  MASTER_USER='replication_user',
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=154;

START SLAVE;
SHOW SLAVE STATUS;
```

## Disaster Recovery

### Recovery Time Objective (RTO): 4 hours
### Recovery Point Objective (RPO): 1 hour

Maintain:
- Daily encrypted backups stored off-site
- Weekly full database snapshots
- Documented restoration procedures
- Regular recovery drills

## Compliance & Security Checklist

- ✅ HTTPS/TLS enabled
- ✅ SSL certificates auto-renewed
- ✅ Database encryption at rest
- ✅ Database encryption in transit
- ✅ Regular security updates applied
- ✅ Strong password policies
- ✅ Two-factor authentication available
- ✅ Regular security audits scheduled
- ✅ Backup encryption enabled
- ✅ Access logs maintained
- ✅ Intrusion detection enabled
- ✅ DDoS protection configured
- ✅ WAF rules configured
- ✅ Data retention policies defined

## Performance Targets

- Page Load Time: < 2 seconds
- API Response Time: < 500ms
- 99.9% Uptime SLA
- Zero unplanned downtime per month

---

**Last Updated:** January 2024
