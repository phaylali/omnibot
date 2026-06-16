import { guildRead, guildWrite } from "./store.ts";

export interface RoleEntry {
  name: string;
  roleId: string | null;
  channelId: string | null;
}

export interface RoleGroup {
  name: string;
  categoryId: string | null;
  messageId: string | null;
  channelId: string | null;
  roles: RoleEntry[];
}

interface RolesData {
  groups: Record<string, RoleGroup>;
}

const ROLES_FILE = "roles.json";
const EMPTY: RolesData = { groups: {} };

export async function getRolesData(guildId: string): Promise<RolesData> {
  return guildRead(guildId, ROLES_FILE, EMPTY);
}

export async function saveRolesData(guildId: string, data: RolesData): Promise<void> {
  await guildWrite(guildId, ROLES_FILE, data);
}

export function sanitizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
