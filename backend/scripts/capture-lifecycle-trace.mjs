import fs from "node:fs";
import path from "node:path";

export function createCaptureLifecycleTrace(tracePath, { now = () => new Date().toISOString() } = {}) {
  const resolvedTracePath =
    typeof tracePath === "string" && tracePath.trim().length > 0 ? path.resolve(tracePath) : null;

  return {
    path: resolvedTracePath,
    record(event, details = {}) {
      if (!resolvedTracePath) {
        return false;
      }
      try {
        fs.mkdirSync(path.dirname(resolvedTracePath), { recursive: true });
        fs.appendFileSync(
          resolvedTracePath,
          `${JSON.stringify({ event, at: now(), ...details })}\n`
        );
        return true;
      } catch {
        // Diagnostics must never change the capture's pass/fail outcome.
        return false;
      }
    }
  };
}
