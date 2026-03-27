Buat Auth Module untuk NestJS dengan ketentuan berikut:

=== FITUR ===
- Register (email, password, name)
- Login → return { accessToken, refreshToken }
- Refresh Token → return { accessToken }
- Logout (invalidate refresh token di Redis)
- Get current user profile (/me)
- Password hashing dengan bcrypt (rounds: 12)

=== TECHNICAL SPEC ===
- AccessToken: JWT, expires 15 menit, payload: { sub: userId, email, role }
- RefreshToken: JWT, expires 7 hari, stored di Redis dengan key: refresh:[userId]
- Guards: JwtAuthGuard (global default), LocalAuthGuard (untuk login)
- Decorator: @CurrentUser() untuk inject user dari request
- Decorator: @Public() untuk bypass JwtAuthGuard

=== FILES YANG HARUS DIBUAT ===
src/modules/auth/
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── token-response.dto.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── local-auth.guard.ts
├── decorators/
│   ├── current-user.decorator.ts
│   └── public.decorator.ts
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts

src/modules/users/
├── dto/
│   ├── create-user.dto.ts
│   └── user-response.dto.ts
├── entities/
│   └── user.entity.ts
├── users.service.ts
├── users.repository.ts
└── users.module.ts

=== USER ENTITY FIELDS ===
- id: UUID (primary key, generated)
- email: string (unique, lowercase)
- password: string (select: false)
- name: string
- role: enum (USER, ADMIN) default USER
- isActive: boolean default true
- createdAt, updatedAt: Date

Sertakan Swagger @ApiProperty() di semua DTO.
Sertakan unit test stubs untuk AuthService dan UsersService.