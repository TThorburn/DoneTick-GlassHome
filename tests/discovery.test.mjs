import {test} from "node:test";
import assert from "node:assert/strict";
import {autoList, donetickLists, listMembers, upgradeConfig} from "../src/shared/discovery.ts";

const list = (id, attributes = {}) => ({id, state: "2", friendlyName: id, attributes: {config_entry_id: "server-a", tasks: [], ...attributes}});
test("Automatically picks the unified Donetick list among project and person lists", () => {
  const all = list("todo.all");
  const project = list("todo.project", {donetick_project_id: 12});
  const person = list("todo.person", {donetick_user_id: 4});
  assert.equal(autoList([person, project, all])?.id, "todo.all");
  assert.equal(autoList([project])?.id, "todo.project");
  assert.equal(autoList([person, project]), undefined);
});
test("Never guesses between two Donetick servers or ordinary to-do lists", () => {
  const ordinary = {id: "todo.shopping", state: "3", attributes: {}};
  assert.equal(autoList([list("todo.a"), list("todo.b", {config_entry_id: "server-b"})]), undefined);
  assert.deepEqual(donetickLists([ordinary]), []);
  assert.equal(autoList([ordinary]), undefined);
});
test("Users are discovered from the list, excluding inactive accounts", () => {
  const all = list("todo.all", {circle_members: [{username: "alice", display_name: "Alice"}, {username: "inactive", is_active: false}]});
  assert.deepEqual(listMembers(all, [all]), [{username: "alice", name: "Alice"}]);
});
test("Missing members can be recovered from siblings on the same server only", () => {
  const project = list("todo.project", {donetick_project_id: 12});
  const all = list("todo.all", {circle_members: [{username: "alice"}]});
  const other = list("todo.other", {config_entry_id: "server-b", circle_members: [{username: "bob"}]});
  assert.deepEqual(listMembers(project, [project, all, all, other]), [{username: "alice", name: "alice"}]);
  assert.deepEqual(listMembers(project, [other]), []);
  assert.deepEqual(listMembers(undefined, [all]), []);
});
test("Upgrade retains people and custom colours while changing the old oversized defaults", () => {
  const prior = {list: ["todo.all"], tapUsername: "alice", holdUsername: "bob", tone: "info", density: "comfortable", textSize: "normal"};
  const next = upgradeConfig(prior, 3);
  assert.equal(next.tapUsername, "alice");
  assert.equal(next.holdUsername, "bob");
  assert.equal(next.tone, "neutral");
  assert.equal(next.density, "compact");
  assert.equal(next.textSize, "small");
  assert.equal(next.holdDelay, 700);
  assert.equal(prior.tone, "info");
  assert.equal(upgradeConfig({tone: "success"}, 3).tone, "success");
  assert.equal(upgradeConfig({tone: "info", holdDelay: 900}, 4).tone, "info");
  assert.equal(upgradeConfig({holdDelay: NaN}, 3).holdDelay, 700);
});
