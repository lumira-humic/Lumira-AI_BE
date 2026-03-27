Implementasikan event-driven architecture menggunakan @nestjs/event-emitter:

=== SETUP ===
1. Install @nestjs/event-emitter
2. Register EventEmitterModule di AppModule (wildcard: true)

=== EVENTS TO IMPLEMENT ===
[LIST EVENT YANG DIPERLUKAN, CONTOH:]
- user.registered
- user.password_reset_requested
- [entity].created
- [entity].updated
- [entity].deleted

=== UNTUK SETIAP EVENT ===
Buat:
src/common/events/
├── [event-name].event.ts    # Event payload class (typed)

src/modules/[feature]/listeners/
├── [feature].listener.ts    # @OnEvent handlers

=== REQUIREMENTS ===
- Event payload harus class (bukan interface), untuk type safety
- Setiap listener harus handle error sendiri (jangan propagate ke emitter)
- Gunakan async listeners
- Log setiap event yang di-emit di event emitter interceptor