import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Lumira Breast Cancer AI API')
    .setDescription(
      'REST API untuk sistem diagnosis kanker payudara berbasis AI.\n\n' +
        'Dua actor: User (admin/doctor) via web, Patient via mobile app.\n' +
        'Auth menggunakan JWT Bearer Token via response body.',
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.lumira.ai', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Masukkan JWT access token. Berlaku untuk actor User (admin/doctor) dan Patient.',
      },
      'BearerAuth',
    )
    .addTag('Auth', 'Login, logout, dan refresh token untuk User dan Patient')
    .addTag('Users', 'Manajemen akun dokter dan admin — hanya dapat diakses ADMIN')
    .addTag('Patients', 'Manajemen data pasien oleh dokter')
    .addTag('Medical Records', 'Upload citra USG, hasil analisis AI, dan validasi dokter')
    .addTag('Chat', 'Komunikasi antara dokter dan pasien')
    .addTag('Statistics', 'Dashboard dan statistik KPI')
    .addTag('MedGemma', 'AI chatbot untuk konsultasi medis')
    .addTag('AI Service', 'Endpoint prediksi AI native')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customCssUrl: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });
}
