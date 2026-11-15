import {test} from "node:test";
import assert from "node:assert/strict";
import {dueLabel, groupTasks, orderTasks} from "../src/shared/presentation.ts";
const task = (id, name, due, points = null) => ({id, name, due, points, frequency: "daily"});
const now = new Date("2026-11-15T12:00:00Z");
const tz = "Europe/London";
test("Due dates are friendly and use the Home Assistant timezone", () => {
  assert.equal(dueLabel("2026-11-15", now, tz), "Today");
  assert.equal(dueLabel("2026-11-16", now, tz), "Tomorrow");
  assert.equal(dueLabel("2026-11-14", now, tz), "Overdue · Sat 14 Nov");
  assert.equal(dueLabel(null, now, tz), "");
  assert.equal(dueLabel("bad", now, tz), "");
});
test("Points ordering keeps zero above missing points and does not mutate source", () => {
  const tasks = [task(1, "A", null), task(2, "B", null, 0), task(3, "C", null, 10)];
  assert.deepEqual(orderTasks(tasks, "points", tz).map(t => t.id), [3, 2, 1]);
  assert.deepEqual(tasks.map(t => t.id), [1, 2, 3]);
});
test("Grouping keeps overdue first and scheduled days chronological", () => {
  const tasks = [task(1, "Z", "2026-11-17"), task(2, "B", "2026-11-14"),
    task(3, "A", "2026-11-15"), task(4, "C", "2026-11-13")];
  const groups = groupTasks(orderTasks(tasks, "name", tz), "today", true, now, tz);
  assert.deepEqual(groups.map(g => g.label), ["Overdue", "Today", "Tue 17 Nov"]);
  assert.deepEqual(groups[0].tasks.map(t => t.name), ["B", "C"]);
});
test("Grouping can be disabled and always-available tasks stay together", () => {
  const tasks = [task(1, "A", null), task(2, "B", null)];
  assert.equal(groupTasks(tasks, "always", true, now, tz).length, 1);
  assert.equal(groupTasks(tasks, "today", false, now, tz)[0].label, "");
});
