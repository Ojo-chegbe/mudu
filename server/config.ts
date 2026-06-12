import { resolve } from "node:path";

function numberFromEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  server: {
    host: Bun.env.MUDU_HOST ?? "0.0.0.0",
    port: numberFromEnv(Bun.env.MUDU_PORT, 3000)
  },
  database: {
    path: resolve(process.cwd(), Bun.env.MUDU_DB_PATH ?? resolve(process.cwd(), "data", "mudu.db"))
  },
  ai: {
    provider: Bun.env.MUDU_AI_PROVIDER ?? "google",
    model: Bun.env.MUDU_AI_MODEL ?? "gemma-4",
    googleApiKey: Bun.env.MUDU_GOOGLE_AI_API_KEY ?? ""
  },
  sync: {
    supabaseUrl: Bun.env.MUDU_SUPABASE_URL ?? "",
    supabaseAnonKey: Bun.env.MUDU_SUPABASE_ANON_KEY ?? "",
    supabaseServiceRoleKey: Bun.env.MUDU_SUPABASE_SERVICE_ROLE_KEY ?? ""
  }
} as const;
