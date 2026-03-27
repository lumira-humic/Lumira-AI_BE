# Lumira AI API - Coding Conventions

Dokumen ini berisi standar dan konvensi penulisan kode (Coding Conventions) yang **wajib** dipatuhi oleh seluruh developer yang berkontribusi pada project `lumira-ai-api`. Tujuannya adalah untuk menjaga konsistensi, *readability*, dan *maintainability* dari *codebase* kita.

---

## 1. File & Folder Naming

### File Naming
* **Format:** `kebab-case` untuk semua nama file.
* **Pattern:** `[nama-file].[tipe].ts`

| Benar (✅) | Salah (❌) | Alasan |
| :--- | :--- | :--- |
| `user.service.ts` | `UserService.ts` | Menggunakan *PascalCase* |
| `user.controller.ts` | `userService.ts` | Menggunakan *camelCase* |
| `create-user.dto.ts` | `user_service.ts` | Menggunakan *snake_case* |
| `transform.interceptor.ts` | `userservice.ts` | Tidak memiliki suffix tipe |
| `error-code.enum.ts` | | |

*Tipe suffix yang diizinkan:* `.controller.ts`, `.service.ts`, `.module.ts`, `.repository.ts`, `.entity.ts`, `.dto.ts`, `.guard.ts`, `.decorator.ts`, `.filter.ts`, `.interceptor.ts`, `.interface.ts`, `.enum.ts`, `.exception.ts`, `.helper.ts`.

### Folder Naming
* **Format:** `kebab-case`.
* **Koleksi/Module:** Gunakan bentuk **plural** (jamak) untuk merepresentasikan sekumpulan entitas yang sejenis.

| Benar (✅) | Salah (❌) | Alasan |
| :--- | :--- | :--- |
| `modules/users/` | `modules/User/` | Menggunakan huruf kapital dan *singular* |
| `modules/products/`| `modules/product/` | Menggunakan *singular* |
| `common/exceptions/`| `common/Exception/`| Menggunakan huruf kapital dan *singular* |

---

## 2. Class & Type Naming

Gunakan **PascalCase** untuk penamaan _Class_ dan ikuti aturan suffix berikut:

| Tipe | Rule / Pattern | Contoh |
| :--- | :--- | :--- |
| **Service** | `[Name]Service` | `UserService`, `AuthService` |
| **Controller**| `[Name]Controller` | `UserController` |
| **Module** | `[Name]Module` | `UserModule` |
| **Repository**| `[Name]Repository` | `UserRepository` |
| **Entity** | `[Name]` (**Tanpa suffix**) | `User`, `Product`, `Order` |
| **DTO** | `[Verb][Entity]Dto` | `CreateUserDto`, `QueryUserDto` |
| **Guard** | `[Name]Guard` | `JwtAuthGuard`, `RolesGuard` |
| **Interceptor**| `[Name]Interceptor` | `TransformInterceptor` |
| **Filter** | `[Name]Filter` | `GlobalExceptionFilter` |
| **Decorator** | `[Name]` (**Tanpa suffix**) | `CurrentUser`, `Public` |
| **Interface** | `[Name]` (**Tanpa prefix I**) | `ApiResponse`, `ApiMeta` |
| **Enum** | `[Name]` (**Tanpa suffix Enum**) | `ErrorCode`, `UserRole` |
| **Exception** | `[Name]Exception` | `AppException`, `NotFoundException`|
| **Helper** | `[Name]Helper` | `ResponseHelper`, `HashHelper` |

> **Catatan Konfigurasi:** Konfigurasi menggunakan *camelCase* dengan suffix `Config` (misal: `appConfig`, `databaseConfig`) karena di-*register* menggunakan `registerAs()`.

---

## 3. Variable & Function Naming

### Variables & Parameters
Gunakan **camelCase**.
```typescript
const userId = req.user.id;
const accessToken = await this.authService.login(user);
```

### Boolean Variables
Wajib menggunakan prefix indikatif seperti `is`, `has`, `can`, atau `should`.
```typescript
const isActive = user.isActive;
const hasPermission = await this.can(user, resource);
const shouldRefresh = token.expiresIn < 300;
```

### Functions / Methods
Gunakan **camelCase**, dan wajib diawali dengan **kata kerja** (*verb*).
```typescript
// ✅ Benar
findById()
findAll()
createUser()
updateStatus()
deleteById()
validateToken()

// ❌ Salah
userFind()
data()
```

### Constants & Enum Values
Nilai yang benar-benar konstan atau anggota dari enumerasi wajib menggunakan **SCREAMING_SNAKE_CASE**.
```typescript
// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_PAGE_SIZE = 10;

// Enums
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
```

---

## 4. DTO & Entity Naming Convention

### DTO (Data Transfer Object)
Pola wajib: **`[Verb][Entity]Dto`** atau fungsional spesifik.

* `CreateUserDto` — untuk payload POST.
* `UpdateUserDto` — untuk payload PATCH (field optional).
* `QueryUserDto` — untuk GET query params (pagination, filter).
* `UserResponseDto` — untuk representasi *outbound/response*.
* `LoginDto` — kasus khusus (auth), *verb* yang sudah *obvious* diperbolehkan.

**Yang DILARANG:**
* ❌ `UserDto` (Ambugu, tidak jelas tujuannya)
* ❌ `UserInputDto` ("Input" bukan verb)
* ❌ `NewUserDto` ("New" bukan verb)
* ❌ `UserData` (Terdengar seperti instansiasi entitas)

### Entity
* **Class:** `PascalCase`, **singular**, TANPA suffix.
  ```typescript
  class OrderItem {} // bukan Orders atau OrderItems
  ```
* **Table Name:** `snake_case`, **plural** (pada `@Entity()`).
  ```typescript
  @Entity('users')
  @Entity('order_items')
  ```
* **Column Name:** `snake_case` (pada `@Column()`).
  ```typescript
  @Column({ name: 'first_name' })
  firstName: string;
  ```

---

## 5. Import Order Convention

Urutan *imports* dari paling atas ke bawah (wajib dipisah dengan *blank line* tiap grupnya):

1. **Node Built-ins** (`path`, `crypto`, dll.)
2. **NestJS & Third-party Libraries** (`@nestjs/*`, `typeorm`, dll.)
3. **Internal Absolute** (`@app/...`, atau dari modul internal lain)
4. **Relative Imports** (`./dto/...`, `../common/...`)

**Contoh:**
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppException } from '../../common/exceptions/base.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';

import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';
```

---

## 6. Struktur Method di Service

Urutan tata letak dalam suatu kelas (`@Injectable()`):
1. `constructor`
2. `public methods` (dengan urutan CRUD: *create, findAll, findById, update, delete*)
3. `private helper methods`

**Contoh:**
```typescript
@Injectable()
export class UserService {
  constructor(...) {}

  async create(dto: CreateUserDto): Promise<User> {}
  async findAll(query: QueryUserDto): Promise<[User[], number]> {}
  async findById(id: string): Promise<User> {}
  async update(id: string, dto: UpdateUserDto): Promise<User> {}
  async delete(id: string): Promise<void> {}

  private async hashPassword(password: string): Promise<string> {}
  private buildWhereClause(query: QueryUserDto): FindOptionsWhere<User> {}
}
```

---

## 7. Aturan Ketat Tambahan (The "Laws")

1. 🚫 **DILARANG pakai `any`** — gunakan `unknown` (dan lakukan type-checking) jika tipe benar-benar tidak diketahui.
2. 🚫 **DILARANG akses TypeORM `EntityManager` / `DataSource` langsung di Service** — wajib dilakukan lewat abstraction `Repository` / Custom Repository.
3. 🚫 **DILARANG me-return raw `TypeORM Entity` ke client** — Entity wajib dimapping ke *Response DTO* class (untuk menghindari kebocoran field sensitif seperti password).
4. 🚫 **DILARANG `.then().catch()` chaining** — Semua asynchronization wajib menggunakan gaya `async / await` demi *readability*.
5. ✅ **WAJIB explicit return type** — Semua *public method* wajib mencantumkan return type secara eksplisit (ex: `: Promise<User>`).
6. ✅ **WAJIB Barrel Export (`index.ts`)** — Setiap module atau utilitas dalam folder `common/` harus diexport menggunakan `index.ts`.

---
<br />

# ⚡ Quick Reference (Cheat Sheet)

| Kategori | Rule / Pattern | Contoh Tepat |
| :--- | :--- | :--- |
| **Files** | `[ketengah].[tipe].ts` | `auth.service.ts` |
| **Folders** | `kebab-case`, **plural** | `modules/products/` |
| **Interface** | Tanpa `I` | `ApiResponse` |
| **Variables** | `camelCase` | `userId`, `accessToken` |
| **Booleans** | Prefix `is/has/should` | `isActive`, `hasPermission` |
| **Constants** | `SCREAMING_SNAKE` | `MAX_LOGIN_ATTEMPTS = 5` |
| **Methods** | `kataKerja()[camelCase]` | `findById()`, `updateStatus()` |
| **Entities** | Singular, no suffix | `class User {}` |
| **Tables** | Plural, snake_case | `@Entity('users')` |
| **Columns** | snake_case | `@Column({ name: 'first_name' })` |
| **Return** | Dilarang raw object | Mapped via `ResponseDto` / Interceptor |
