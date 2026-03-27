Lengkapi Swagger/OpenAPI documentation untuk seluruh API:

=== SWAGGER SETUP DI main.ts ===
DocumentBuilder dengan:
- Title, description, version dari package.json
- Servers: local (http://localhost:3000), staging, production
- Bearer Auth (JWT) scheme
- Tags untuk setiap module
- Contact info dan license

=== DTO ANNOTATIONS ===
Setiap DTO harus punya:
@ApiProperty({
  description: 'Deskripsi field ini',
  example: 'nilai contoh',
  required: true/false,
  type: TypeClass,
  enum: EnumName (jika enum)
})

=== CONTROLLER ANNOTATIONS ===
Setiap endpoint harus punya:
@ApiOperation({ summary: '...', description: '...' })
@ApiResponse({ status: 200, type: ResponseDto, description: '...' })
@ApiResponse({ status: 400, description: 'Validation error' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Not found' })
@ApiBearerAuth() // jika butuh auth

=== README.md ===
Buat README.md lengkap yang mencakup:
1. Project overview dan tech stack
2. Prerequisites (Node version, tools)
3. Setup local development (step by step)
4. Environment variables documentation (deskripsi setiap var)
5. Available npm scripts dan kegunaannya
6. Database migrations guide
7. API documentation link
8. Folder structure explanation
9. Module architecture diagram (ASCII)
10. Deployment guide ringkas
11. Contributing guide
12. Troubleshooting umum

Output README.md yang lengkap dan README yang bisa langsung dipakai.