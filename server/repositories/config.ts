import { db, nowIso } from "../db";

export const defaultAppConfig = {
  autosaveIntervalSeconds: 5,
  recoveryWindowMinutes: 10,
  aiProvider: "google",
  aiModel: "gemma-4",
  syncEnabled: true,
  defaultExamDurationMinutes: 60,
  defaultPassingScore: 50,
  fullscreenRequired: true,
  tabMonitoringEnabled: true,
  shuffleQuestions: true,
  showScoreToStudent: false
} as const;

type AppConfig = typeof defaultAppConfig;
type AppConfigKey = keyof AppConfig;

function parseConfigValue<K extends AppConfigKey>(key: K, valueJson: string): AppConfig[K] {
  try {
    return JSON.parse(valueJson) as AppConfig[K];
  } catch {
    return defaultAppConfig[key];
  }
}

export function ensureAppConfigDefaults(): void {
  const now = nowIso();
  const insert = db.query("INSERT OR IGNORE INTO app_config (key, value_json, updated_at) VALUES (?, ?, ?)");

  for (const [key, value] of Object.entries(defaultAppConfig)) {
    insert.run(key, JSON.stringify(value), now);
  }
}

export function getAppConfig(): AppConfig {
  ensureAppConfigDefaults();
  const rows = db.query("SELECT key, value_json AS valueJson FROM app_config").all() as Array<{ key: AppConfigKey; valueJson: string }>;
  const appConfig = { ...defaultAppConfig };

  for (const row of rows) {
    if (row.key in defaultAppConfig) {
      appConfig[row.key] = parseConfigValue(row.key, row.valueJson) as never;
    }
  }

  return appConfig;
}

export function updateAppConfig(updates: Partial<AppConfig>): AppConfig {
  ensureAppConfigDefaults();
  const now = nowIso();
  const update = db.query("UPDATE app_config SET value_json = ?, updated_at = ? WHERE key = ?");

  for (const [key, value] of Object.entries(updates)) {
    if (key in defaultAppConfig) {
      update.run(JSON.stringify(value), now, key);
    }
  }

  return getAppConfig();
}
