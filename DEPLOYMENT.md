# Deployment Guide

This guide covers different deployment options for the LinkedIn CTO Finder API.

## 🐳 Docker Deployment (Recommended)

### Quick Start

1. **Prerequisites**:
   - Docker and Docker Compose installed
   - API keys (Google Custom Search, optionally SerpAPI and Telegram Bot)

2. **Setup**:
   ```bash
   git clone <repository-url>
   cd LinkedIn_CTO_Finder_API
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

4. **Verify**:
   ```bash
   curl http://localhost:3000
   docker-compose logs -f
   ```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | ✅ | Google Custom Search API key |
| `GOOGLE_CSE_ID` | ✅ | Google Custom Search Engine ID |
| `SERPAPI_KEY` | ❌ | SerpAPI key (alternative search) |
| `TELEGRAM_BOT_TOKEN` | ❌ | Telegram bot token |
| `PORT` | ❌ | Server port (default: 3000) |
| `CORS_ORIGINS` | ❌ | CORS origins (default: *) |

### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View running containers
docker-compose ps
```

### VPS Deployment Notes

When deploying on a VPS, the application uses named volumes to avoid permission issues with CSV file generation:

- **Named Volume**: `csv_data` is automatically created with proper permissions
- **No Manual Setup**: No need to create local temp directories
- **Persistent Data**: CSV files persist across container restarts
- **Permission Handling**: Container runs as `bun` user with proper temp directory permissions

If you encounter permission errors, ensure you're using the latest docker-compose.yml configuration.

## 🚀 Production Deployment

### Using Docker Compose with Nginx (Recommended)

1. **Create nginx.conf**:
   ```nginx
   events {
       worker_connections 1024;
   }
   
   http {
       upstream app {
           server linkedin-cto-finder:3000;
       }
   
       server {
           listen 80;
           server_name your-domain.com;
   
           location / {
               proxy_pass http://app;
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
               proxy_set_header X-Forwarded-Proto $scheme;
           }
       }
   }
   ```

2. **Update docker-compose.yml**:
   ```yaml
   # Uncomment the nginx service in docker-compose.yml
   # Add SSL certificates for HTTPS
   ```

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### Production
```bash
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://your-domain.com
```

## 🔧 Local Development

### Using Bun (Native)

```bash
# Install dependencies
bun install

# Development mode
bun run dev

# Production mode
bun run start
```

### Using Docker for Development

```bash
# Test Docker setup
./docker-test.sh

# Development with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## 🤖 Telegram Bot Setup

1. **Create Bot**:
   - Message [@BotFather](https://t.me/BotFather)
   - Use `/newbot` command
   - Follow instructions to get token

2. **Configure**:
   ```bash
   # Add to .env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

3. **Deploy**:
   ```bash
   docker-compose restart
   ```

4. **Test**:
   - Find your bot on Telegram
   - Send `/start` command

## 📊 Monitoring

### Health Checks
```bash
# API health
curl http://localhost:3000

# Container health
docker-compose ps

# Application logs
docker-compose logs -f linkedin-cto-finder
```

### Log Management
```bash
# View recent logs
docker-compose logs --tail=100 linkedin-cto-finder

# Follow logs in real-time
docker-compose logs -f linkedin-cto-finder

# Export logs
docker-compose logs linkedin-cto-finder > app.log
```

## 🔒 Security Considerations

1. **Environment Variables**:
   - Never commit `.env` files
   - Use secrets management in production
   - Rotate API keys regularly

2. **Network Security**:
   - Use HTTPS in production
   - Configure proper CORS origins
   - Implement rate limiting

3. **Container Security**:
   - Keep base images updated
   - Run containers as non-root user
   - Scan images for vulnerabilities

## 🐛 Troubleshooting

### Common Issues

1. **Docker daemon not running**:
   ```bash
   # macOS/Windows: Start Docker Desktop
   # Linux: sudo systemctl start docker
   ```

2. **Port already in use**:
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "3001:3000"  # Use port 3001 instead
   ```

3. **API keys not working**:
   ```bash
   # Check .env file format
   # Ensure no spaces around = sign
   # Verify API keys are valid
   ```

4. **Telegram bot not responding**:
   ```bash
   # Check bot token is correct
   # Verify bot is not already running elsewhere
   # Check application logs
   ```

5. **CSV generation permission errors on VPS**:
   ```bash
   # Error: EACCES: permission denied
   # Solution: Use named volumes (already configured)
   docker-compose down
   docker-compose up -d
   
   # If still having issues, check volume permissions:
   docker volume ls
   docker volume inspect linkedin_cto_finder_api_csv_data
   ```

### Getting Help

1. **Check logs**:
   ```bash
   docker-compose logs -f
   ```

2. **Test Docker setup**:
   ```bash
   ./docker-test.sh
   ```

3. **Verify configuration**:
   ```bash
   # Check environment variables
   docker-compose config
   ```