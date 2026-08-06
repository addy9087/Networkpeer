import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/networkpeer";
const DEFAULT_REDIS_URL = "redis://localhost:6379";
const DEFAULT_JWT_SECRET = "development-only-jwt-secret-please-change";
const DEFAULT_JWT_REFRESH_SECRET = "development-only-refresh-secret-please-change";

function isPlaceholderSecret(secret: string): boolean {
  const normalized = secret.toLowerCase();
  return ["development", "change", "your-", "example", "placeholder"].some((marker) =>
    normalized.includes(marker),
  );
}

function isLoopbackUrl(value: string): boolean {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function databaseUrlUsesTls(value: string): boolean {
  const sslmode = new URL(value).searchParams.get("sslmode");
  return sslmode === "require" || sslmode === "verify-ca" || sslmode === "verify-full";
}

function isValidS3BucketName(value: string): boolean {
  return (
    /^(?=.{3,63}$)(?!\d+\.\d+\.\d+\.\d+$)[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(value) &&
    !value.includes("..") &&
    !value.includes(".-") &&
    !value.includes("-.")
  );
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().default("/api/v1"),

  DATABASE_URL: z.string().url().default(DEFAULT_DATABASE_URL),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  REDIS_URL: z.string().url().default(DEFAULT_REDIS_URL),

  JWT_SECRET: z.string().min(32).default(DEFAULT_JWT_SECRET),
  JWT_REFRESH_SECRET: z.string().min(32).default(DEFAULT_JWT_REFRESH_SECRET),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  JWT_ISSUER: z.string().default("networkpeer-api"),
  JWT_AUDIENCE: z.string().default("networkpeer-mobile"),

  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  OTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  OTP_VERIFY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_ECHO_IN_RESPONSE: z.enum(["true", "false"]).default("true"),
  OTP_SMS_TEMPLATE: z
    .string()
    .default("Your NetworkPeer OTP is {{code}}. It expires in {{minutes}} minutes."),

  SMS_PROVIDER: z.enum(["console", "twilio"]).default("console"),
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_FROM_NUMBER: z.string().default(""),

  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  AWS_SESSION_TOKEN: z.string().default(""),
  AWS_S3_BUCKET: z.string().default("networkpeer-media"),
  AWS_S3_PRESIGNED_URL_EXPIRY_SECONDS: z.coerce.number().int().min(60).max(840).default(600),
  MEDIA_MAX_FILE_SIZE_BYTES: z.coerce.number().int().min(1024).max(100 * 1024 * 1024).default(25 * 1024 * 1024),

  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_CONNECT_CLIENT_ID: z.string().default(""),

  FIREBASE_PROJECT_ID: z.string().default(""),
  FIREBASE_CLIENT_EMAIL: z.string().default(""),
  FIREBASE_PRIVATE_KEY: z.string().default(""),

  SENTRY_DSN: z.string().default(""),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  MAX_REQUEST_BODY_BYTES: z.coerce.number().int().min(1024).max(10 * 1024 * 1024).default(1024 * 1024),
  WORKER_NEARBY_MAX_RADIUS_KM: z.coerce.number().int().min(1).max(500).default(100),

  LOG_LEVEL: z.string().default("info"),
  LOG_PRETTY: z.enum(["true", "false"]).default("true"),
}).superRefine((env, ctx) => {
  if (env.DATABASE_POOL_MIN > env.DATABASE_POOL_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_POOL_MIN"],
      message: "DATABASE_POOL_MIN cannot exceed DATABASE_POOL_MAX",
    });
  }

  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_REFRESH_SECRET"],
      message: "JWT_REFRESH_SECRET must differ from JWT_SECRET",
    });
  }

  if (Boolean(env.AWS_ACCESS_KEY_ID) !== Boolean(env.AWS_SECRET_ACCESS_KEY)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AWS_ACCESS_KEY_ID"],
      message: "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be configured together",
    });
  }
  if (env.AWS_SESSION_TOKEN && !env.AWS_ACCESS_KEY_ID) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AWS_SESSION_TOKEN"],
      message: "AWS_SESSION_TOKEN requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY",
    });
  }

  if (env.NODE_ENV !== "production") return;

  if (env.DATABASE_URL === DEFAULT_DATABASE_URL || isLoopbackUrl(env.DATABASE_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message: "Production DATABASE_URL must be explicitly configured",
    });
  }

  const databaseUrl = new URL(env.DATABASE_URL);
  if (databaseUrl.username.toLowerCase() === "postgres") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message: "Production DATABASE_URL must use a dedicated non-superuser application role",
    });
  }
  if (!databaseUrlUsesTls(env.DATABASE_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message: "Production DATABASE_URL must require TLS using sslmode=require or stronger",
    });
  }

  if (env.REDIS_URL === DEFAULT_REDIS_URL || isLoopbackUrl(env.REDIS_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["REDIS_URL"],
      message: "Production REDIS_URL must be explicitly configured",
    });
  }
  if (new URL(env.REDIS_URL).protocol !== "rediss:") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["REDIS_URL"],
      message: "Production REDIS_URL must use TLS (rediss://)",
    });
  }

  if (env.JWT_SECRET === DEFAULT_JWT_SECRET || isPlaceholderSecret(env.JWT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_SECRET"],
      message: "Production JWT_SECRET must be a real secret, not a default placeholder",
    });
  }

  if (
    env.JWT_REFRESH_SECRET === DEFAULT_JWT_REFRESH_SECRET ||
    isPlaceholderSecret(env.JWT_REFRESH_SECRET)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_REFRESH_SECRET"],
      message: "Production JWT_REFRESH_SECRET must be a real secret, not a default placeholder",
    });
  }

  if (env.SMS_PROVIDER === "console") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SMS_PROVIDER"],
      message: "SMS_PROVIDER=console is not allowed in production because it logs OTPs",
    });
  }

  for (const key of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"] as const) {
    if (!env[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required when SMS_PROVIDER=twilio in production`,
      });
    }
  }

  if (env.OTP_ECHO_IN_RESPONSE === "true") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["OTP_ECHO_IN_RESPONSE"],
      message: "OTP_ECHO_IN_RESPONSE must be disabled in production",
    });
  }

  if (env.LOG_PRETTY === "true") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["LOG_PRETTY"],
      message: "LOG_PRETTY must be disabled in production (pino-pretty is dev-only)",
    });
  }

  if (env.AWS_S3_BUCKET === "networkpeer-media" || !isValidS3BucketName(env.AWS_S3_BUCKET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AWS_S3_BUCKET"],
      message: "Production AWS_S3_BUCKET must be explicitly configured",
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten());
  process.exit(1);
}

export const config = parsed.data;

export type Config = typeof config;
