# OpenCode Session Switch

Adds a session list to the OpenCode V2 sidebar. OpenCode V1 is not supported;
use the upstream [Dylan-Liew/opencode-session-switch](https://github.com/Dylan-Liew/opencode-session-switch) for V1.

## Install

```bash
opencode plugin add github:c0dn/opencode-session-switch
```

or add `"github:c0dn/opencode-session-switch"` to `plugins` in
`~/.config/opencode/opencode.json`, then restart OpenCode.

## Use it

Expand `Sessions` in the sidebar and click a session to switch to it. The list
shows sessions from the current session's directory only: open tabs first,
then the 8 most recently used. A spinner marks running sessions; the others
show `open` or how long ago they were used. Use `/sessions` for the full
history.

## Development

The TUI entry is `src/cli.tsx`. OpenCode compiles Solid JSX only outside
`node_modules`, so installed copies load the compiled `dist/cli.js`. Rebuild
and commit it after every change:

```bash
bun install
bun run bundle
bun run test
```

## License

MIT
