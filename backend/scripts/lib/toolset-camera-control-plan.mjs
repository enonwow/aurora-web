export const TOOLSET_CAMERA_COMMANDS = Object.freeze({
  // One-shot clicks were measured as inert in enon_bakery. Treat the movement
  // arrows as continuous controls and certify the actual image movement after
  // release; a failed visual proof remains a failed command.
  "move-left": { buttonIndex: 0, interaction: "hold" },
  "move-right": { buttonIndex: 1, interaction: "hold" },
  "move-forward": { buttonIndex: 2, interaction: "hold" },
  "move-back": { buttonIndex: 3, interaction: "hold" },
  "rotate-clockwise": { buttonIndex: 4, interaction: "hold" },
  "rotate-counterclockwise": { buttonIndex: 5, interaction: "hold" },
  "pitch-up": { buttonIndex: 6, interaction: "hold" },
  "pitch-down": { buttonIndex: 7, interaction: "hold" },
  "zoom-in": { buttonIndex: 8, interaction: "hold" },
  "zoom-out": { buttonIndex: 9, interaction: "hold" },
});

export const TOOLSET_OBJECT_ROTATION_BUTTON_INDICES = Object.freeze([10, 11, 12]);

export function buildToolsetCameraControlPlan({ command, steps = 1, holdMs = 800 }) {
  const mapping = TOOLSET_CAMERA_COMMANDS[command];
  if (!mapping) {
    const error = new Error(
      `Unsupported Toolset camera command ${JSON.stringify(command)}. Supported: ${Object.keys(TOOLSET_CAMERA_COMMANDS).join(", ")}.`,
    );
    error.code = "unsupported_toolset_camera_command";
    throw error;
  }
  if (!Number.isInteger(steps) || steps < 1 || steps > 20) {
    throw new Error(`steps must be an integer from 1 to 20, received ${steps}.`);
  }
  if (!Number.isInteger(holdMs) || holdMs < 1 || holdMs > 5000) {
    throw new Error(`holdMs must be an integer from 1 to 5000, received ${holdMs}.`);
  }
  if (TOOLSET_OBJECT_ROTATION_BUTTON_INDICES.includes(mapping.buttonIndex)) {
    const error = new Error("Object rotation controls are forbidden in the camera command lane.");
    error.code = "toolset_object_rotation_control_forbidden";
    throw error;
  }
  return {
    command,
    buttonIndex: mapping.buttonIndex,
    interaction: mapping.interaction,
    steps,
    holdMs,
  };
}
