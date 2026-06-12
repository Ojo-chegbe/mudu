import { db, nowIso } from "../db";

export type DeviceIdentity = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export function getOrCreateDeviceIdentity(): DeviceIdentity {
  const existing = db
    .query("SELECT id, created_at AS createdAt, updated_at AS updatedAt FROM device_identity ORDER BY created_at ASC LIMIT 1")
    .get() as DeviceIdentity | null;

  if (existing) {
    return existing;
  }

  const now = nowIso();
  const id = `device_${crypto.randomUUID()}`;
  db.query("INSERT INTO device_identity (id, created_at, updated_at) VALUES (?, ?, ?)").run(id, now, now);

  return { id, createdAt: now, updatedAt: now };
}
