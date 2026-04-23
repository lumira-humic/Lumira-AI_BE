import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_BASE_URL: Joi.string().uri().optional(),
  APP_NAME: Joi.string().default('Lumira AI API'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:5173'),
  SWAGGER_ENABLED: Joi.boolean().default(false),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_SYNC: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TTL: Joi.number().default(3600),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  // Mail (optional for now, can be required later)
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().optional(),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASSWORD: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),

  // Cloudinary (optional globally, required when upload feature is used)
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: Joi.string().optional(),
  CLOUDINARY_UPLOAD_PREFIX: Joi.string().uri().optional(),
  CLOUDINARY_UPLOAD_TIMEOUT_MS: Joi.number().integer().positive().optional(),
  OBJECT_STORAGE_MODE: Joi.string().valid('auto', 'cloudinary', 'local').optional(),
  OBJECT_STORAGE_LOCAL_UPLOAD_DIR: Joi.string().optional(),
  OBJECT_STORAGE_LOCAL_BASE_URL: Joi.string().optional(),
});
