import {test} from "node:test";
import assert from "node:assert/strict";
import {createTaskPress} from "../src/shared/press.ts";
import {createCompletionGestures} from "../src/shared/gestures.ts";

const point = (extra = {}) => ({pointerId: 1, pointerType: "touch", button: 0, isPrimary: true, clientX: 50, clientY: 50, ...extra});
function fixture(double = false) {
  const fired = [];
  let time = 0;
  let pressed = false;
  const timers = new Set();
  const actions = createCompletionGestures({doubleEnabled: () => double, complete: who => fired.push(who), schedule: action => {timers.add(action); return () => timers.delete(action);}});
  const press = createTaskPress({tap: () => {actions.tap(); actions.endPress();}, hold: actions.hold, cancel: actions.cancel,
    pressed: value => {pressed = value;}, holdDelay: () => 700, now: () => time});
  return {press, fired, pressed: () => pressed, at: next => {time = next;},
    down: p => {if (press.down(p ?? point())) actions.beginPress();},
    flush: () => {const pending = [...timers]; timers.clear(); pending.forEach(action => action());}};
}
test("Touch tap completes on native click, not on pointer up; duplicate click is ignored", () => {
  const f = fixture(); f.down(); f.at(100); f.press.up(point());
  assert.deepEqual(f.fired, []);
  assert.equal(f.press.click(1), true);
  assert.equal(f.press.click(1), false);
  assert.deepEqual(f.fired, ["tap"]);
});
test("Real DOM-style PointerEvent getters are preserved when starting a press", () => {
  const proto = Object.fromEntries(Object.entries(point()).map(([key, value]) => [key, {get: () => value}]));
  const event = Object.create(Object.defineProperties({}, proto));
  const f = fixture(); f.down(event); f.at(100);
  assert.equal(f.press.up(event), true);
  assert.equal(f.press.click(1), true);
  assert.deepEqual(f.fired, ["tap"]);
});
test("Finger jitter does not cancel a stationary touch hold", () => {
  const f = fixture(); f.down();
  assert.equal(f.press.move(point({clientX: 62, clientY: 56})), false);
  f.at(700); f.press.hold(); f.press.up(point({clientX: 62, clientY: 56})); f.press.click(1);
  assert.deepEqual(f.fired, ["hold"]);
  assert.equal(f.pressed(), false);
});
test("A dragged row cannot complete, even if a trailing click arrives", () => {
  const f = fixture(); f.down();
  assert.equal(f.press.move(point({clientY: 80})), true);
  f.at(800); f.press.hold(); f.press.up(point()); f.press.click(1);
  assert.deepEqual(f.fired, []);
});
test("Browser scroll cancellation and scroll-container cancellation both block completion", () => {
  for (const cancel of [f => f.press.cancelPointer(point()), f => f.press.cancel()]) {
    const f = fixture(); f.down(); cancel(f); f.at(1000); f.press.hold(); f.press.up(point()); f.press.click(1);
    assert.deepEqual(f.fired, []);
  }
});
test("Capture loss after normal release does not discard a deferred double-tap decision", () => {
  const f = fixture(true); f.down(); f.at(100); f.press.up(point());
  assert.equal(f.press.cancelPointer(point()), false);
  f.press.click(1); f.flush();
  assert.deepEqual(f.fired, ["tap"]);
});
test("Long hold is delivered once, suppressing its native compatibility click", () => {
  const f = fixture(); f.down(); f.at(700); f.press.hold(); f.press.hold(); f.press.up(point());
  assert.equal(f.press.click(1), false);
  assert.deepEqual(f.fired, ["hold"]);
});
test("Delayed Safari hold timer is recovered on release at the hold boundary", () => {
  const f = fixture(); f.down(); f.at(700); f.press.up(point()); f.press.hold(); f.press.click(1);
  assert.deepEqual(f.fired, ["hold"]);
});
test("Moving before release cancels even if no pointermove event was delivered", () => {
  const f = fixture(); f.down(); f.at(900); f.press.up(point({clientY: 90})); f.press.click(1);
  assert.deepEqual(f.fired, []);
});
test("Multi-touch and non-primary presses cannot complete a task", () => {
  const f = fixture(); f.down(); f.down(point({pointerId: 2, isPrimary: false}));
  f.at(900); f.press.hold(); f.press.up(point()); f.press.click(1);
  assert.deepEqual(f.fired, []);
  assert.equal(f.press.down(point({pointerType: "mouse", button: 2})), false);
});
test("Unrelated pointer release does not activate the row", () => {
  const f = fixture(); f.down(); f.at(100);
  assert.equal(f.press.up(point({pointerId: 2})), false);
  assert.equal(f.press.click(1), false);
  assert.deepEqual(f.fired, []);
});
test("Native two-tap activation produces only the double-tap performer", () => {
  const f = fixture(true); f.down(); f.at(100); f.press.up(point()); f.press.click(1);
  f.at(200); f.down(); f.at(300); f.press.up(point()); f.press.click(1); f.flush();
  assert.deepEqual(f.fired, ["double"]);
});
test("A tap followed by a long hold cannot complete as both people", () => {
  const f = fixture(true); f.down(); f.at(100); f.press.up(point()); f.press.click(1);
  f.at(200); f.down(); f.flush(); f.at(900); f.press.hold(); f.press.up(point()); f.press.click(1); f.flush();
  assert.deepEqual(f.fired, ["hold"]);
});
test("Keyboard and assistive clicks work and can recover after a canceled touch", () => {
  const f = fixture(); assert.equal(f.press.click(0), true);
  f.down(); f.press.cancel(); f.press.keyboard(); assert.equal(f.press.click(0), true);
  assert.deepEqual(f.fired, ["tap", "tap"]);
});
test("Assistive activation does not require a preceding keyboard event", () => {
  const f = fixture(); f.down(); f.press.cancel();
  assert.equal(f.press.click(1), false);
  assert.equal(f.press.click(0), true);
  assert.deepEqual(f.fired, ["tap"]);
});
