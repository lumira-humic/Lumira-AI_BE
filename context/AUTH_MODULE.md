# Auth Module — lumira-ai-api
# Versi ini sudah disesuaikan dengan:
# - Instruksi PM (no cookies, token via body, integrasi mobile)
# - Lumira database schema v3 (UUID, dual actor, UserRole/UserStatus enum)
# - CONVENTIONS.md (naming, structure, response format)

=== CATATAN PM (PRIORITAS UTAMA) ===

Project diintegrasikan dengan mobile app.
DILARANG menggunakan cookies untuk apapun.
Semua token (accessToken, refreshToken) wajib dikirim via RESPONSE BODY.
Client menyimpan token secara mandiri (AsyncStorage / SecureStore).

=== DUA ACTOR ===

Project ini punya dua actor yang bisa login menggunakan endpoint yang SAMA:
- User    → tabel `users`    (role: admin | doctor) — dibuat oleh admin
- Patient → tabel `patients` (role: patient)        — bisa self-register via mobile

Dibedakan via JWT payload field: actorType: 'user' | 'patient'

=== FITUR & ENDPOINTS ===

1. POST /auth/register        → Register patient baru (mobile app only)
2. POST /auth/login           → Login User & Patient, return accessToken + refreshToken
3. GET  /auth/me              → Get profil actor yang sedang login
4. POST /auth/change-password → Update password (butuh currentPassword)
5. POST /auth/refresh-token   → Tukar refreshToken → accessToken baru (token di body)
6. POST /auth/logout          → Invalidate refreshToken di Redis

=== TECHNICAL SPEC ===

AccessToken:
- Expires  : 15 menit
- Secret   : JWT_SECRET
- Payload  : { sub: string (UUID), email: string, role: string, actorType: 'user' | 'patient' }

RefreshToken:
- Expires  : 7 hari (TTL Redis: 604800 detik)
- Secret   : JWT_REFRESH_SECRET (BERBEDA dari JWT_SECRET)
- Storage  : Redis, key pattern: refresh:{actorType}:{userId}
             contoh: refresh:user:uuid-xxx | refresh:patient:uuid-yyy

Password hashing: bcrypt, rounds: 12

=== USER ENTITY FIELDS ===
(Sesuai schema v3 — UUID, tanpa isActive, pakai status enum)

users table:
- id       : string UUID, @PrimaryGeneratedColumn('uuid')
- name     : string, not null
- email    : string, unique, not null
- password : string, select: false, @Exclude()
- role     : UserRole enum → ADMIN = 'admin', DOCTOR = 'doctor'
- status   : UserStatus enum → ACTIVE = 'Active', INACTIVE = 'Inactive'
- createdAt, updatedAt, deletedAt : dari BaseEntity

PERUBAHAN DARI VERSI LAMA:
❌ role: USER | ADMIN          → ✅ role: ADMIN | DOCTOR (lowercase value)
❌ isActive: boolean           → ✅ status: UserStatus enum
❌ bigint auto-increment PK    → ✅ UUID string PK

=== PATIENT ENTITY FIELDS ===
(Dual actor — patient juga bisa login)

patients table:
- id       : string UUID, @PrimaryGeneratedColumn('uuid')
- name     : string, not null
- email    : string, unique, not null
- password : string, select: false, @Exclude()
- phone    : string, nullable
- address  : string, nullable
- createdAt, updatedAt, deletedAt : dari BaseEntity

=== FILES YANG HARUS DIBUAT ===

src/modules/auth/
├── dto/
│   ├── login.dto.ts               → email + password
│   ├── register.dto.ts            → name, email, password, phone?, address?
│   ├── change-password.dto.ts     → currentPassword + newPassword
│   ├── refresh-token.dto.ts       → refreshToken (string)
│   └── auth-response.dto.ts       → AuthResponseDto + AccessTokenResponseDto
├── interfaces/
│   └── jwt-payload.interface.ts   → { sub, email, role, actorType, iat?, exp? }
├── strategies/
│   ├── jwt.strategy.ts            → decode token, query tabel sesuai actorType
│   └── local.strategy.ts          → cari di users dulu, lalu patients
├── guards/
│   ├── jwt-auth.guard.ts          → global guard, skip jika @Public()
│   └── local-auth.guard.ts        → khusus POST /auth/login
├── decorators/
│   ├── current-user.decorator.ts  → inject request.user (tipe: User | Patient)
│   └── public.decorator.ts        → set metadata IS_PUBLIC_KEY = true
├── auth.controller.ts
├── auth.service.ts
├── auth.module.ts
└── auth.service.spec.ts

src/modules/users/
├── dto/
│   ├── create-user.dto.ts         → untuk admin tambah dokter
│   └── user-response.dto.ts       → outbound shape, tanpa password
├── entities/
│   └── user.entity.ts
├── users.service.ts
├── users.repository.ts
├── users.module.ts
└── index.ts

src/modules/patients/
├── dto/
│   └── patient-response.dto.ts    → outbound shape, tanpa password
├── entities/
│   └── patient.entity.ts
├── patients.service.ts
├── patients.repository.ts
├── patients.module.ts
└── index.ts

=== AUTH SERVICE METHODS ===
(urutan wajib: public methods dulu, private helpers terakhir)

register(dto: RegisterDto): Promise<AuthResponseDto>
login(actor: User | Patient, actorType: 'user' | 'patient'): Promise<AuthResponseDto>
getProfile(userId: string, actorType: 'user' | 'patient'): Promise<UserResponseDto | PatientResponseDto>
changePassword(userId: string, actorType: 'user' | 'patient', dto: ChangePasswordDto): Promise<void>
refreshToken(dto: RefreshTokenDto): Promise<AccessTokenResponseDto>
logout(userId: string, actorType: 'user' | 'patient'): Promise<void>

private generateTokens(payload: JwtPayload): Promise<{ accessToken: string; refreshToken: string }>
private hashPassword(password: string): Promise<string>
private comparePassword(plain: string, hashed: string): Promise<boolean>

=== SWAGGER RULES (WAJIB di setiap endpoint) ===

- @ApiTags('Auth')                          → di class controller
- @ApiOperation({ summary, description })   → di setiap method
- @ApiBody({ type: DtoClass })              → di semua POST
- @ApiResponse({ status, description })     → minimal 2 per endpoint
- @ApiBearerAuth()                          → di endpoint yang butuh JWT
- @ApiProperty({ example })                 → di semua DTO field

Endpoint yang @Public() (tidak pakai @ApiBearerAuth()):
→ register, login, refresh-token

Endpoint yang butuh @ApiBearerAuth():
→ me, change-password, logout

=== ERROR CODES YANG DIGUNAKAN ===

AUTH_INVALID_CREDENTIALS  → login gagal / currentPassword salah (401 / 400)
AUTH_TOKEN_INVALID        → JWT invalid / expired / sudah logout (401)
AUTH_REFRESH_TOKEN_INVALID→ refreshToken tidak ada di Redis / tidak cocok (401)
USER_ALREADY_EXISTS       → email sudah terdaftar saat register (409)

=== ENV VARIABLES ===

JWT_SECRET=min-32-chars-random-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=min-32-chars-different-random-string
JWT_REFRESH_EXPIRES_IN=7d

=== UNIT TEST STUBS (auth.service.spec.ts) ===

Mock: UsersRepository, PatientsRepository, JwtService, CacheManager (Redis)

describe('register')        → happy path + email conflict (409)
describe('login')           → happy path user + happy path patient + invalid creds (401)
describe('getProfile')      → happy path user + happy path patient
describe('changePassword')  → happy path + wrong currentPassword (400)
describe('refreshToken')    → happy path + expired token (401) + not in redis (401)
describe('logout')          → happy path + already logged out (400)