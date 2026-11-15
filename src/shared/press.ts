export interface PressPoint {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  button?: number;
  isPrimary?: boolean;
}

/** Filters a native button's clicks; the SDK still supplies its hold timer.
 * No preventDefault on touch down: Safari must remain free to scroll the list.
 */
export function createTaskPress(options: {
  tap: () => void;
  hold: () => void;
  cancel: () => void;
  pressed: (pressed: boolean) => void;
  holdDelay: () => number;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  let active: (PressPoint & {started: number}) | undefined;
  let clickReady = false;
  let blocked = false;
  let held = false;
  const slop = (point: PressPoint) => point.pointerType === "mouse" ? 10 : 18;
  const moved = (point: PressPoint) => !!active && Math.hypot(point.clientX - active.clientX, point.clientY - active.clientY) > slop(active);

  function cancel() {
    active = undefined;
    clickReady = false;
    blocked = true;
    options.pressed(false);
    options.cancel();
  }
  function hold() {
    if (!active || blocked || held) return;
    held = true;
    clickReady = false;
    options.pressed(false);
    options.hold();
  }
  return {
    cancel, hold,
    down(point: PressPoint) {
      if (point.isPrimary === false || (active && active.pointerId !== point.pointerId)) {cancel(); return false;}
      if (point.button != null && point.button !== 0) return false;
      // DOM PointerEvent fields are prototype getters, not enumerable keys.
      active = {pointerId: point.pointerId, pointerType: point.pointerType,
        clientX: point.clientX, clientY: point.clientY, started: now()};
      clickReady = false;
      blocked = false;
      held = false;
      options.pressed(true);
      return true;
    },
    move(point: PressPoint) {
      if (!active || point.pointerId !== active.pointerId) return false;
      if (moved(point)) {cancel(); return true;}
      return false;
    },
    up(point: PressPoint) {
      if (!active || point.pointerId !== active.pointerId) return false;
      if (moved(point)) {cancel(); return true;}
      // If Safari delayed the SDK's timer, a sufficiently long stationary
      // press still means hold when released. Never reinterpret it as a tap.
      if (!held && now() - active.started >= options.holdDelay()) hold();
      clickReady = !held && !blocked;
      active = undefined;
      options.pressed(false);
      return true;
    },
    cancelPointer(point: Pick<PressPoint, "pointerId">) {
      if (active?.pointerId !== point.pointerId) return false;
      cancel();
      return true;
    },
    keyboard() {
      active = undefined;
      held = false;
      blocked = false;
      clickReady = true;
      options.pressed(false);
    },
    click(detail: number) {
      // Keyboard/assistive activation has no pointer sequence or click count.
      // Native pointer compatibility clicks have a positive click count.
      if (detail === 0 && !active) {
        options.tap();
        return true;
      }
      if (active || held || blocked || (!clickReady && detail !== 0)) return false;
      clickReady = false;
      options.tap();
      return true;
    },
  };
}
