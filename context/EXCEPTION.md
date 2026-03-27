Setup production-grade exception handling dan logging:

=== EXCEPTION HIERARCHY ===
Buat custom exceptions:
src/common/exceptions/
├── base.exception.ts           # Base class dengan errorCode
├── not-found.exception.ts      # 404 + kode error spesifik
├── forbidden.exception.ts      # 403 + kode error spesifik
├── conflict.exception.ts       # 409 + kode error spesifik
├── validation.exception.ts     # 422 dengan field errors
└── error-codes.enum.ts         # Semua error codes sebagai enum

=== ERROR RESPONSE FORMAT ===
{
  success: false,
  error: {
    code: "USER_NOT_FOUND",    // dari enum
    message: "User not found",
    details?: any,              // field errors, dll
    requestId: string,          // dari request header X-Request-ID
    timestamp: ISO string,
    path: string
  }
}

=== GLOBAL EXCEPTION FILTER ===
- Tangkap semua HttpException → format ke error response di atas
- Tangkap non-HTTP errors → log stack trace, return 500
- Sertakan requestId di setiap response

=== LOGGING SETUP ===
- Gunakan nestjs-pino (structured JSON logging)
- Log level: error, warn, info, debug, verbose
- Di setiap log sertakan: { requestId, userId?, service, method, duration? }
- Request/Response logging interceptor:
  - Log incoming: method, path, body summary (no passwords), headers whitelist
  - Log outgoing: statusCode, duration ms
  - Mask sensitive fields: password, token, secret, authorization

Output semua file lengkap dengan contoh penggunaan.