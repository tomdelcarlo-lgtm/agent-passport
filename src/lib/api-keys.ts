import { randomBytes } from "crypto";
import bcryptjs from "bcryptjs";

const PREFIX = "ap_";

export function generateApiKey(): string {
  const raw = randomBytes(32).toString("base64url");
  return `${PREFIX}${raw}`;
}

export function getKeyPrefix(key: string): string {
  return key.substring(0, PREFIX.length + 8);
}

export async function hashApiKey(key: string): Promise<string> {
  return bcryptjs.hash(key, 10);
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(key, hash);
}
