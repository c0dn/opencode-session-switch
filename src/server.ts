import { Plugin } from "@opencode/plugin";

// The sidebar lives in the TUI entry (dist/cli.js); the server side has nothing to do.
export default Plugin.define({
  id: "opencode-session-switch",
  setup() {},
});
