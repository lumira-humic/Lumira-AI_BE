Setup configuration management yang robust:

=== REQUIREMENTS ===
1. @nestjs/config dengan Joi validation schema
2. Pisahkan config per domain (app, database, redis, jwt, mail, dll)
3. Type-safe config service (bukan pakai process.env langsung)
4. Validasi semua env variables saat startup — fail fast jika ada yang missing

=== CONFIG STRUCTURE ===
src/config/
├── app.config.ts
├── database.config.ts
├── redis.config.ts
├── jwt.config.ts
├── mail.config.ts  (jika ada)
└── index.ts        # Export semua configs

=== CONTOH PATTERN ===
// app.config.ts
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [],
}));

// TypeSafe usage:
@Injectable()
export class SomeService {
  constructor(
    @Inject(appConfig.KEY)
    private config: ConfigType<typeof appConfig>
  ) {}
}

=== ENVIRONMENTS ===
Buat contoh file untuk:
- .env.example        (committed ke git)
- .env.development    (local dev)
- .env.test           (testing)
- .env.production     (template, no real values)

=== ENV VARIABLES YANG DIPERLUKAN ===
# App
NODE_ENV=development
PORT=3000
APP_NAME=Lumira AI API
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secret
DB_NAME=lumira_ai_db
DB_SSL=false
DB_SYNC=false          # HARUS false di production!
DB_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# JWT
JWT_SECRET=lumira_ai_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=lumira_ai_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

Output semua config files lengkap dengan Joi validation.