# Lumira AI API

Backend REST API untuk aplikasi Lumira AI, dibangun dengan **NestJS**, **TypeORM**, **PostgreSQL**, dan **Redis**.

---

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Persyaratan](#persyaratan)
- [Struktur Proyek](#struktur-proyek)
- [Setup & Instalasi](#setup--instalasi)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Instalasi Dependencies](#2-instalasi-dependencies)
  - [3. Konfigurasi Environment](#3-konfigurasi-environment)
  - [4. Menjalankan Database & Redis (Docker)](#4-menjalankan-database--redis-docker)
  - [5. Menjalankan Migrasi](#5-menjalankan-migrasi)
  - [6. Menjalankan Seeder](#6-menjalankan-seeder)
  - [7. Menjalankan Aplikasi](#7-menjalankan-aplikasi)
- [Scripts Tersedia](#scripts-tersedia)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Migrasi Database](#migrasi-database)
- [Seeder](#seeder)

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | [NestJS](https://nestjs.com/) v10 |
| Language | TypeScript |
| ORM | [TypeORM](https://typeorm.io/) v0.3 |
| Database | PostgreSQL |
| Cache | Redis |
| Auth | JWT (Access + Refresh Token) |
| Docs | Swagger / OpenAPI |
| Validation | class-validator + Joi |

---

## Persyaratan

Pastikan sudah terinstall di sistem kamu:

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 14 (atau gunakan Docker)
- **Redis** >= 7 (atau gunakan Docker)
- **Docker & Docker Compose** (opsional, tapi sangat direkomendasikan)

---

## Struktur Proyek

```
src/
├── common/               # Utilities global (filters, interceptors, guards, decorators)
├── config/               # Konfigurasi aplikasi (app, db, jwt, redis, mail)
├── database/
│   ├── data-source.ts    # TypeORM DataSource untuk CLI
│   ├── migrations/       # File migrasi database
│   └── seeds/            # File seeder database
│       ├── run-seed.ts         # Entry point seeder
│       └── admin-user.seed.ts  # Seeder admin user
└── modules/              # Modul fitur aplikasi
    ├── users/            # Manajemen user (admin & dokter)
    ├── patients/         # Manajemen pasien
    ├── medical-records/  # Rekam medis & AI diagnosis
    ├── chat/             # Chat antara dokter & pasien
    └── activities/       # Log aktivitas
```

---

## Setup & Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd lumira-ai-api
```

### 2. Instalasi Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Salin file `.env.example` menjadi file environment sesuai kebutuhan:

```bash
# Untuk development
cp .env.example .env.development

# Untuk production
cp .env.example .env.production
```

Kemudian edit file `.env.development` dan sesuaikan nilainya:

```env
# App
NODE_ENV=development
PORT=3000
APP_NAME=Lumira AI API
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=lumira_ai_db
DB_SSL=false
DB_SYNC=false
DB_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d
```

> ⚠️ **Penting:** Jangan pernah commit file `.env.*` ke repository. File ini sudah di-ignore oleh `.gitignore`.

### 4. Setup Database & Redis

#### Redis (via Docker)

`docker-compose.yml` sudah menyertakan Redis. Jalankan dengan:

```bash
docker compose up -d
```

Cek status container:
```bash
docker compose ps
```

#### PostgreSQL (manual)

PostgreSQL **tidak** disertakan di `docker-compose.yml`, sehingga harus diinstall dan dikonfigurasi secara manual.

**Langkah-langkah:**

1. Install PostgreSQL di sistem kamu ([download di sini](https://www.postgresql.org/download/))
2. Buat database baru:

```sql
-- Masuk ke psql
psql -U postgres

-- Buat database
CREATE DATABASE lumira_ai_db;

-- Keluar
\q
```

3. Pastikan nilai `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, dan `DB_NAME` di file `.env.development` sudah sesuai dengan konfigurasi PostgreSQL lokal kamu.

### 5. Menjalankan Migrasi

Migrasi digunakan untuk membuat struktur tabel di database.

```bash
# Jalankan semua migrasi yang belum diterapkan
npm run migration:run
```

Perintah lain terkait migrasi:

```bash
# Generate migrasi baru (otomatis dari perubahan entity)
npm run migration:generate src/database/migrations/NamaMigrasi

# Buat file migrasi kosong
npm run migration:create src/database/migrations/NamaMigrasi

# Rollback migrasi terakhir
npm run migration:revert
```

### 6. Menjalankan Seeder

Seeder digunakan untuk mengisi data awal ke database, termasuk akun **admin default**.

```bash
npm run seed:run
```

Seeder akan otomatis dilewati jika data sudah ada (idempotent/aman dijalankan berulang kali).

**Kredensial Admin Default:**

| Field | Value |
|---|---|
| Email | `admin@lumira.ai` |
| Password | `Admin@123!` |
| Role | `admin` |

> ⚠️ **Segera ganti password admin** setelah pertama kali login di environment production.

### 7. Menjalankan Aplikasi

```bash
# Development (watch mode — auto-restart saat file berubah)
npm run start:dev

# Production
npm run start:prod
```

Aplikasi akan berjalan di: `http://localhost:3000`

---

## Scripts Tersedia

| Script | Perintah | Keterangan |
|---|---|---|
| `start` | `npm run start` | Jalankan aplikasi |
| `start:dev` | `npm run start:dev` | Jalankan dengan watch mode |
| `start:debug` | `npm run start:debug` | Jalankan dengan debug mode |
| `start:prod` | `npm run start:prod` | Jalankan build production |
| `build` | `npm run build` | Build ke folder `dist/` |
| `migration:run` | `npm run migration:run` | Jalankan migrasi |
| `migration:generate` | `npm run migration:generate <path>` | Generate migrasi dari entity |
| `migration:create` | `npm run migration:create <path>` | Buat file migrasi kosong |
| `migration:revert` | `npm run migration:revert` | Rollback migrasi terakhir |
| `seed:run` | `npm run seed:run` | Jalankan semua seeder |
| `lint` | `npm run lint` | Cek kode dengan ESLint |
| `format` | `npm run format` | Format kode dengan Prettier |
| `test` | `npm run test` | Jalankan unit test |
| `test:e2e` | `npm run test:e2e` | Jalankan end-to-end test |
| `test:cov` | `npm run test:cov` | Jalankan test dengan coverage report |

---

## API Documentation

Swagger UI tersedia secara otomatis di environment **non-production**:

```
http://localhost:3000/api/docs
```

Dokumentasi mencakup semua endpoint yang tersedia beserta schema request/response.

---

## Environment Variables

| Variable | Required | Default | Keterangan |
|---|---|---|---|
| `NODE_ENV` | ✅ | `development` | Environment aplikasi |
| `PORT` | ✅ | `3000` | Port server |
| `APP_NAME` | ❌ | `Lumira AI API` | Nama aplikasi |
| `CORS_ORIGINS` | ❌ | `http://localhost:3000,...` | Origin yang diizinkan (comma-separated) |
| `DB_HOST` | ✅ | — | Host PostgreSQL |
| `DB_PORT` | ✅ | — | Port PostgreSQL |
| `DB_USERNAME` | ✅ | — | Username PostgreSQL |
| `DB_PASSWORD` | ✅ | — | Password PostgreSQL |
| `DB_NAME` | ✅ | — | Nama database |
| `DB_SSL` | ❌ | `false` | Gunakan SSL untuk koneksi DB |
| `DB_SYNC` | ❌ | `false` | Auto-sync schema (jangan `true` di production!) |
| `DB_LOGGING` | ❌ | `false` | Tampilkan query log TypeORM |
| `REDIS_HOST` | ✅ | — | Host Redis |
| `REDIS_PORT` | ✅ | — | Port Redis |
| `REDIS_PASSWORD` | ❌ | — | Password Redis |
| `REDIS_TTL` | ❌ | `3600` | TTL cache default (detik) |
| `JWT_SECRET` | ✅ | — | Secret key JWT access token |
| `JWT_EXPIRES_IN` | ✅ | — | Durasi access token (contoh: `15m`) |
| `JWT_REFRESH_SECRET` | ✅ | — | Secret key JWT refresh token |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | — | Durasi refresh token (contoh: `7d`) |
| `MAIL_HOST` | ❌ | — | Host SMTP (opsional) |
| `MAIL_PORT` | ❌ | — | Port SMTP (opsional) |
| `MAIL_USER` | ❌ | — | Username SMTP (opsional) |
| `MAIL_PASSWORD` | ❌ | — | Password SMTP (opsional) |
| `MAIL_FROM` | ❌ | — | Alamat pengirim email (opsional) |

---

## Migrasi Database

Project menggunakan TypeORM migrations untuk mengelola perubahan schema. **Jangan gunakan `DB_SYNC=true` di production**, selalu gunakan migrasi.

**Alur kerja migrasi:**

```
1. Ubah entity TypeScript (*.entity.ts)
        ↓
2. Generate migrasi:
   npm run migration:generate src/database/migrations/NamaPerubahan
        ↓
3. Review file migrasi yang dihasilkan
        ↓
4. Jalankan migrasi:
   npm run migration:run
```

---

## Seeder

Seeder berada di `src/database/seeds/`. Untuk menambahkan seeder baru:

**1. Buat file seeder baru**, contoh `src/database/seeds/doctor-user.seed.ts`:

```typescript
import { DataSource } from 'typeorm';

export async function seedDoctorUser(dataSource: DataSource): Promise<void> {
  // logika seeder di sini
}
```

**2. Daftarkan di `run-seed.ts`:**

```typescript
import { seedDoctorUser } from './doctor-user.seed';

// Di dalam fungsi runSeeds():
await seedDoctorUser(dataSource);
```

**3. Jalankan seeder:**

```bash
npm run seed:run
```
