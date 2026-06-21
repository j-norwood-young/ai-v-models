import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { appSettings } from "../db/schema.js";

export const SETTING_API_KEYS_SHOW_ONCE = "apiKeys.showOnce";

export async function getSetting(db: DbClient, key: string): Promise<string | null> {
  const row = await db.db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row?.value ?? null;
}

export async function setSetting(db: DbClient, key: string, value: string): Promise<void> {
  const now = Date.now();
  await db.db
    .insert(appSettings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: now },
    })
    .run();
}

export async function getApiKeysShowOnce(db: DbClient): Promise<boolean> {
  const value = await getSetting(db, SETTING_API_KEYS_SHOW_ONCE);
  return value === "true";
}
