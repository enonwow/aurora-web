import type { AuthClockPort } from "../ports/authClockPort";

export function createBrowserAuthClockPort(): AuthClockPort {
  return {
    nowMs() {
      if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
      }
      return Date.now();
    }
  };
}
