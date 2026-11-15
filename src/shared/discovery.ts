import {membersFrom, type Member} from "./tasks.ts";

export interface TaskList {
  id: string;
  friendlyName?: string;
  state: string;
  attributes: Record<string, unknown>;
}
export function donetickLists(lists: TaskList[]): TaskList[] {
  return lists.filter(list => typeof list.attributes.config_entry_id === "string" && Array.isArray(list.attributes.tasks));
}
export function autoList(lists: TaskList[]): TaskList | undefined {
  const candidates = donetickLists(lists);
  const unified = candidates.filter(list => list.attributes.donetick_user_id == null && list.attributes.donetick_project_id == null);
  if (unified.length === 1) return unified[0];
  return candidates.length === 1 ? candidates[0] : undefined;
}
export function listMembers(list: TaskList | undefined, lists: TaskList[]): Member[] {
  if (!list) return [];
  const direct = membersFrom(list.attributes.circle_members);
  if (direct.length) return direct;
  const entry = list.attributes.config_entry_id;
  if (typeof entry !== "string") return [];
  // A project list can lack metadata that its All Tasks sibling exposes.
  const members = lists.filter(other => other.attributes.config_entry_id === entry)
    .flatMap(other => membersFrom(other.attributes.circle_members));
  return [...new Map(members.map(member => [member.username.toLowerCase(), member])).values()];
}

export function upgradeConfig(config: Record<string, unknown>, fromVersion: number): Record<string, unknown> {
  const next = {...config};
  if (fromVersion < 4) {
    if (next.tone === "info") next.tone = "neutral";
    if (next.density === "comfortable") next.density = "compact";
    if (next.textSize === "normal") next.textSize = "small";
  }
  for (const key of ["tapUsername", "doubleUsername", "holdUsername"]) {
    if (typeof next[key] !== "string") delete next[key];
  }
  if (typeof next.holdDelay !== "number" || !Number.isFinite(next.holdDelay) || next.holdDelay < 400 || next.holdDelay > 2000) next.holdDelay = 700;
  return next;
}
