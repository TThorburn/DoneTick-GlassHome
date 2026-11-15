import {test} from "node:test";
import assert from "node:assert/strict";
import {addDays, dayKey, membersFrom, resolveMember, selectTasks, tasksFrom} from "../src/shared/tasks.ts";

const task = (id, due, frequency = "daily") => ({id, name: `Task ${id}`, due, frequency, points: null});
const ids = tasks => tasks.map(task => task.id);
const now = new Date("2026-11-15T13:00:00Z");
const list = [task(1, "2026-11-14"), task(2, "2026-11-15"), task(3, "2026-11-16"),
  task(4, "2026-11-22"), task(5, "2026-11-23"), task(6, null, "always"),
  task(7, "2026-11-15", "always"), task(8, null, "once")];

test("Today optionally includes overdue tasks and excludes always-available tasks", () => {
  assert.deepEqual(ids(selectTasks(list, "today", now, "Europe/London", true)), [1, 2]);
  assert.deepEqual(ids(selectTasks(list, "today", now, "Europe/London", false)), [2]);
});
test("Next seven days starts tomorrow and includes the entire seventh day", () => {
  const tasks = [...list, task(9, "2026-11-22T23:59:59Z")];
  assert.deepEqual(ids(selectTasks(tasks, "week", now, "Europe/London", true)), [3, 4, 9]);
});
test("Always includes only the explicit always frequency, including dated always tasks", () => {
  assert.deepEqual(ids(selectTasks(list, "always", now, "Europe/London", true)), [6, 7]);
});
test("Local midnight and daylight saving use the Home Assistant timezone", () => {
  assert.equal(dayKey("2026-07-01T23:30:00Z", "Europe/London"), "2026-07-02");
  assert.equal(dayKey("2026-11-15T00:30:00Z", "America/New_York"), "2026-11-14");
  assert.equal(addDays("2026-03-28", 7), "2026-04-04");
  assert.deepEqual(ids(selectTasks([task(1, "2026-03-29T22:59:59Z"), task(2, "2026-03-29T23:00:00Z")],
    "today", new Date("2026-03-29T12:00:00Z"), "Europe/London", false)), [1]);
  assert.equal(dayKey("not-a-date", "Europe/London"), undefined);
});
test("Malformed tasks are ignored, IDs deduplicated, and zero points retained", () => {
  const rows = tasksFrom([null, {task_id: -1, name: "bad"}, {task_id: 1, name: "old"},
    {task_id: 1, name: "new", points: 0, next_due_date: "2026-11-15", frequency_type: "daily"}]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "new");
  assert.equal(rows[0].points, 0);
});
test("Performer lookup requires one active matching username, never a display-name fallback", () => {
  const members = membersFrom([{username: "Noa", display_name: "Noa N", is_active: true},
    {username: "thomas", display_name: "Thomas"}, {username: "inactive", is_active: false}]);
  assert.equal(resolveMember(" noa ", members)?.username, "Noa");
  assert.equal(resolveMember("thomas", members)?.username, "thomas");
  assert.equal(resolveMember("Noa N", members), undefined);
  assert.equal(resolveMember("inactive", members), undefined);
  assert.equal(resolveMember("", members), undefined);
  assert.equal(resolveMember("noa", [...members, {username: "NOA", name: "Duplicate"}]), undefined);
});
