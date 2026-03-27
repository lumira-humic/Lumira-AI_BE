Buat CRUD module lengkap untuk entity: [NAMA_ENTITY]

=== ENTITY FIELDS ===
[LIST FIELD DISINI, CONTOH:]
- id: UUID
- name: string (required, max 100 chars)
- description: string (optional)
- price: number (positive decimal)
- status: enum (ACTIVE, INACTIVE, DRAFT) default ACTIVE
- userId: UUID (foreign key to users)
- createdAt, updatedAt: Date

=== ENDPOINTS ===
POST   /[nama-entity]          → Create (auth required)
GET    /[nama-entity]          → List all (pagination + filter + sort)
GET    /[nama-entity]/:id      → Get by ID
PATCH  /[nama-entity]/:id      → Update (owner only or admin)
DELETE /[nama-entity]/:id      → Soft delete (owner only or admin)

=== QUERY PARAMS UNTUK LIST ===
- page: number (default 1)
- limit: number (default 10, max 100)
- search: string (search di name dan description)
- status: enum filter
- sortBy: field name
- sortOrder: ASC | DESC

=== TECHNICAL REQUIREMENTS ===
1. Service harus menggunakan Repository pattern (pisah dari TypeORM EntityManager)
2. Response selalu dibungkus ResponseWrapper<T>:
   {
     success: boolean,
     data: T | T[],
     meta?: { page, limit, total, totalPages } // untuk list
     message?: string
   }
3. Soft delete (paranoid), entity harus extend BaseEntity dengan deletedAt
4. Cache list response di Redis, TTL 60 detik, invalidate on write
5. Semua error throw custom HttpException dengan error code
6. Log setiap operasi create/update/delete dengan structured logging

=== FILES YANG HARUS DIBUAT ===
src/modules/[entity]/
├── dto/
│   ├── create-[entity].dto.ts
│   ├── update-[entity].dto.ts
│   ├── query-[entity].dto.ts
│   └── [entity]-response.dto.ts
├── entities/
│   └── [entity].entity.ts
├── [entity].controller.ts   (dengan full Swagger docs)
├── [entity].service.ts      (dengan JSDoc)
├── [entity].repository.ts   (TypeORM custom repository)
├── [entity].module.ts
└── [entity].service.spec.ts (unit test stubs)

Output semua file lengkap.