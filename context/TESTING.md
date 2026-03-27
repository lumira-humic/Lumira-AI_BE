Setup testing yang komprehensif untuk module: [NAMA_MODULE]

=== TEST TYPES ===
1. Unit Tests (*.spec.ts) — test service & controller dalam isolation
2. Integration Tests (*.integration.spec.ts) — test dengan real DB (testcontainers)
3. E2E Tests (*.e2e-spec.ts) — test full HTTP endpoint

=== UNTUK UNIT TEST SERVICE ===
- Mock semua dependencies (repository, cache, event emitter, logger)
- Test happy path dan semua error cases
- Coverage target: 80% minimum
- Gunakan jest.fn() dan mockResolvedValue / mockRejectedValue

=== UNTUK UNIT TEST CONTROLLER ===
- Mock service layer
- Test bahwa DTO validation bekerja
- Test response format

=== UNTUK E2E TEST ===
- Gunakan @nestjs/testing TestingModule
- Supertest untuk HTTP assertions
- Seed data sebelum test, cleanup setelah
- Test: create → get → update → delete flow
- Test auth: tanpa token (401), token expired (401), forbidden role (403)

Buat juga:
- jest.config.ts dengan coverage thresholds
- test/setup.ts untuk global test setup
- test/utils/create-test-app.ts helper
- test/factories/[entity].factory.ts untuk membuat test data

Output setup dan contoh test yang lengkap.