export type CompletionGesture = "tap" | "double" | "hold";
export const gestureLabels: Record<CompletionGesture, string> = {
  tap: "Single tap", double: "Double tap", hold: "Long hold",
};

// The SDK supplies pointer/scroll/hold recognition. This layer only distinguishes
// one SDK tap from two, deferring the single action when double tap is assigned.
export function createCompletionGestures(options: {
  doubleEnabled: () => boolean;
  complete: (gesture: CompletionGesture) => void;
  schedule?: (action: () => void, delay: number) => () => void;
}) {
  const schedule = options.schedule ?? ((action, delay) => {
    const timer = setTimeout(action, delay);
    return () => clearTimeout(timer);
  });
  let cancelPending: (() => void) | undefined;
  let awaitingSecond = false;
  let secondPress = false;
  function cancel() {
    cancelPending?.();
    cancelPending = undefined;
    awaitingSecond = false;
    secondPress = false;
  }
  return {
    cancel,
    beginPress() {
      // A second press may become a hold: suspend the single-tap deadline.
      if (awaitingSecond) {
        cancelPending?.();
        cancelPending = undefined;
        secondPress = true;
      }
    },
    endPress() {
      // If the SDK emitted no action (e.g. scrolling), discard the pair.
      if (secondPress) cancel();
    },
    tap() {
      if (!options.doubleEnabled()) {
        cancel();
        options.complete("tap");
      } else if (awaitingSecond) {
        cancel();
        options.complete("double");
      } else {
        awaitingSecond = true;
        cancelPending = schedule(() => {
          cancelPending = undefined;
          awaitingSecond = false;
          options.complete("tap");
        }, 350);
      }
    },
    hold() { cancel(); options.complete("hold"); },
    double() { cancel(); options.complete("double"); },
  };
}
