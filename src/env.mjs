import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_URL: z.string().url(),
    MONGO_USER: z.string().min(1),
    MONGO_PASSWORD: z.string().min(1),
    MONGO_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    NEXTAUTH_URL: z.string().min(1),
    S3_BUCKET_NAME: z.string().min(1),
    S3_ENDPOINT: z.string().min(1),
    J0_URL: z.string().min(1),
    // Add `.min(1) on ID and SECRET if you want to make sure they're not empty
    GITHUB_ID: z.string().min(1),
    GITHUB_SECRET: z.string().min(1),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string(),
    S3_SECRET_ACCESS_KEY: z.string()
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string().min(1),
    NEXT_PUBLIC_WS_PORT: z.string().min(1),
    NEXT_PUBLIC_WS_URL: z.string().min(1)
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_URL: process.env.POSTGRES_URL,
    MONGO_USER: process.env.MONGO_USER,
    MONGO_PASSWORD: process.env.MONGO_PASSWORD,
    MONGO_URL: process.env.MONGO_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXT_AUTH_SECRET,
    NEXT_PUBLIC_WS_PORT: process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_PORT : process.env.NEXT_PUBLIC_WS_PORT,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    J0_URL: process.env.J0_URL,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    NEXT_PUBLIC_WS_URL: process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_WS_URL : `ws://localhost:${process.env.NEXT_PUBLIC_WS_PORT}`,
    S3_REGION: process.env.S3_REGION ?? "us-east-1",
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "S3RVER",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "S3RVER",
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
   * This is especially useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
