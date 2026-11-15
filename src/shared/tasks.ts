export type View = "today" | "week" | "always";

export interface Task {
  id: number;
  name: string;
  due: string | null;
  frequency: string;
  points: number | null;
}

export interface Member {
  username: string;
  name: string;
}

export function tasksFrom(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];
  const tasks = new Map<number, Task>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = Number(row.task_id);
    if (!Number.isSafeInteger(id) || id <= 0 || typeof row.name !== "string") continue;
    tasks.set(id, {
      id, name: row.name,
      due: typeof row.next_due_date === "string" ? row.next_due_date : null,
      frequency: typeof row.frequency_type === "string" ? row.frequency_type : "",
      points: typeof row.points === "number" && Number.isFinite(row.points) && row.points >= 0
        ? row.points : null,
    });
  }
  return [...tasks.values()];
}

export function membersFrom(value: unknown): Member[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    if (row.is_active === false || typeof row.username !== "string" || !row.username.trim()) return [];
    return [{
      username: row.username,
      name: typeof row.display_name === "string" ? row.display_name : row.username,
    }];
  });
}

export function resolveMember(value: string | undefined, members: Member[]): Member | undefined {
  const username = (value ?? "").trim().toLowerCase();
  const matches = members.filter((member) => member.username.toLowerCase() === username);
  return matches.length === 1 ? matches[0] : undefined;
}

export function dayKey(value: string | Date, timezone: string): string | undefined {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function selectTasks(
  tasks: Task[], view: View, now: Date, timezone: string, includeOverdue: boolean,
): Task[] {
  const today = dayKey(now, timezone)!;
  const end = addDays(today, 7);
  return tasks.filter((task) => {
    if (view === "always") return task.frequency === "always";
    if (task.frequency === "always" || !task.due) return false;
    const due = dayKey(task.due, timezone);
    if (!due) return false;
    if (view === "today") return includeOverdue ? due <= today : due === today;
    return due > today && due <= end;
  }).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? "") || a.name.localeCompare(b.name));
}
