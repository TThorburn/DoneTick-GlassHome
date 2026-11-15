import {test} from "node:test";
import assert from "node:assert/strict";
import {createCompletionGestures} from "../src/shared/gestures.ts";

function fixture(doubleEnabled = true) {
  const fired = [];
  const timers = new Set();
  const actions = createCompletionGestures({
    doubleEnabled: () => doubleEnabled,
    complete: who => fired.push(who),
    schedule: (action, delay) => {
      assert.equal(delay, 350);
      timers.add(action);
      return () => timers.delete(action);
    },
  });
  return {actions, fired, flush: () => {
    const pending = [...timers]; timers.clear(); pending.forEach(action => action());
  }};
}
test("Single tap is immediate when double tap is disabled", () => {
  const {actions, fired} = fixture(false);
  actions.beginPress(); actions.tap(); actions.endPress();
  assert.deepEqual(fired, ["tap"]);
});
test("Single tap waits for the double-tap window", () => {
  const {actions, fired, flush} = fixture();
  actions.beginPress(); actions.tap(); actions.endPress();
  assert.deepEqual(fired, []);
  flush(); assert.deepEqual(fired, ["tap"]);
});
test("Two taps credit only the double-tap user", () => {
  const {actions, fired, flush} = fixture();
  actions.beginPress(); actions.tap(); actions.endPress();
  actions.beginPress(); actions.tap(); actions.endPress();
  flush(); assert.deepEqual(fired, ["double"]);
});
test("A second press becoming a hold cannot also credit the first-tap user", () => {
  const {actions, fired, flush} = fixture();
  actions.beginPress(); actions.tap(); actions.endPress();
  actions.beginPress(); flush();
  assert.deepEqual(fired, []);
  actions.hold(); actions.endPress(); flush();
  assert.deepEqual(fired, ["hold"]);
});
test("Cancelled presses and unmount discard pending completion", () => {
  const {actions, fired, flush} = fixture();
  actions.tap(); actions.cancel(); flush();
  assert.deepEqual(fired, []);
  actions.tap(); actions.beginPress(); actions.endPress(); flush();
  assert.deepEqual(fired, []);
});
test("Keyboard double shortcut cancels a pending single tap", () => {
  const {actions, fired, flush} = fixture();
  actions.tap(); actions.double(); flush();
  assert.deepEqual(fired, ["double"]);
});
