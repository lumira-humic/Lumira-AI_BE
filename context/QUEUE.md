Setup Bull Queue untuk background job processing di NestJS:

=== USE CASE ===
[CONTOH: Send email verification, Process image upload, Generate report]

=== SETUP ===
1. Install @nestjs/bull + bull + ioredis
2. Buat BullModule configuration di AppModule (connect ke Redis)
3. Queue names sebagai const enum di shared constants

=== UNTUK SETIAP QUEUE ===
Buat:
src/modules/[feature]/
├── queues/
│   ├── [feature].queue.ts        # Queue producer (inject ke service)
│   └── [feature].processor.ts   # Queue consumer (@Processor decorator)

=== REQUIREMENTS ===
- Processor harus ada @OnQueueFailed handler untuk logging error
- Retry strategy: 3 kali dengan exponential backoff (1000, 5000, 15000ms)
- Job data harus bertipe (interface/class), no "any"
- Log job start, completion, dan failure dengan structured format:
  { jobId, queue, data, duration, error? }
- Tambahkan Bull Board UI di /admin/queues (hanya accessible oleh ADMIN role)