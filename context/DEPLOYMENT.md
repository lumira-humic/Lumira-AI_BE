Setup untuk production deployment:

=== DOCKERFILE ===
Buat multi-stage Dockerfile:
- Stage 1 (builder): install deps + build
- Stage 2 (runner): copy dist only, minimal image
- Gunakan node:20-alpine
- Non-root user untuk security
- Health check endpoint

=== docker-compose.yml (production) ===
- App service dengan restart: always
- PostgreSQL dengan volume persistence
- Redis dengan volume persistence
- Nginx sebagai reverse proxy (optional)
- Environment via .env file

=== HEALTH CHECK MODULE ===
Buat /health endpoint yang check:
- Database connectivity
- Redis connectivity
- Disk space
- Memory usage
Gunakan @nestjs/terminus

=== GRACEFUL SHUTDOWN ===
Di main.ts setup:
- enableShutdownHooks()
- Handle SIGTERM, SIGINT
- Close DB connections
- Drain active queues
- Wait for in-flight requests (timeout 10s)

=== CI/CD TEMPLATE (GitHub Actions) ===
Buat .github/workflows/ci.yml:
- Trigger: push ke main dan PR
- Jobs: lint → test → build → (deploy ke staging)
- Cache node_modules
- Run tests dengan test DB (postgres service container)

Output semua files lengkap.