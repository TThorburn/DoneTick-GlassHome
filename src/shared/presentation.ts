import {addDays, dayKey, type Task, type View} from "./tasks.ts";

export type TaskOrder = "due" | "name" | "points";

export function orderTasks(tasks: Task[], order: TaskOrder, timezone: string): Task[] {
  return [...tasks].sort((a, b) => {
    const names = () => a.name.localeCompare(b.name) || a.id - b.id;
    if (order === "name") return names();
    if (order === "points") return (b.points ?? -1) - (a.points ?? -1) || names();
    return (dayKey(a.due ?? "", timezone) ?? "9999").localeCompare(
      dayKey(b.due ?? "", timezone) ?? "9999") || names();
  });
}

export function dueLabel(due: string | null, now: Date, timezone: string): string {
  if (!due) return "";
  const day = dayKey(due, timezone);
  if (!day) return "";
  const today = dayKey(now, timezone)!;
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short",
  }).format(new Date(`${day}T12:00:00Z`));
  return day < today ? `Overdue · ${label}` : label;
}

export function groupTasks(tasks: Task[], view: View, grouped: boolean, now: Date, timezone: string) {
  if (!grouped || view === "always") return [{key: "all", label: "", tasks}];
  const today = dayKey(now, timezone)!;
  const groups = new Map<string, {key: string; label: string; tasks: Task[]}>();
  for (const task of tasks) {
    const day = dayKey(task.due ?? "", timezone);
    const key = day && day < today ? "overdue" : day ?? "undated";
    const label = key === "overdue" ? "Overdue" : dueLabel(task.due, now, timezone);
    if (!groups.has(key)) groups.set(key, {key, label, tasks: []});
    groups.get(key)!.tasks.push(task);
  }
  // Overdue first, then calendar order; the selected order applies within groups.
  return [...groups.values()].sort((a, b) => a.key === "overdue" ? -1 : b.key === "overdue" ? 1 : a.key.localeCompare(b.key));
}
