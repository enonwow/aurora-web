# NUI Player UI

## Source Status

- `docs-verified`: NWN Lexicon NUI functions, `NuiCreate`, `NuiSetBind`, `NuiSetBindWatch`, and `OnNuiEvent`.
- `docs-verified`: nwn.wiki NUI page for non-scripting asset and layout notes.
- `runtime-tested`: required before claiming a panel works in a specific module/server.

## What This Domain Controls

Player and DM panels, JSON layout, `nw_inc_nui.nss` helper usage, bind data, event flow, refresh behavior, lifecycle, permissions, server-side handlers, and failure behavior when the player closes or reopens UI.

## Source-Backed Facts To Preserve

- NUI is an NWN:EE system for custom UI windows; the Lexicon groups the related functions and notes that the system is also referenced as Nuklear User Interface.
- `NuiCreate` creates an inline NUI window for one player, takes a JSON window definition, may use a short alphanumeric window id, and returns a token on success.
- A per-client window id should be treated as unique: recreating the same id closes the old window.
- `OnNuiEvent` is the module/window event surface for player interaction with widgets that have `NuiId`.
- Missing `NuiId` on an interactive widget is a common reason events do not fire.
- `NuiSetBind` syncs JSON bind values to the client; client-side changes return to the server and can be read with `NuiGetBind`.
- Bind types must be compatible with the widget; no automatic conversion should be assumed.
- Watched binds can invoke the event handler immediately, so do not update watched binds recursively from their own watch handler.
- nwn.wiki notes that hardcoded NUI look-and-feel assets must exist client-side before module load and are not suitable for NWSync or HAK delivery when overriding core NUI skin files.
- nwn.wiki lists additional image/video formats NUI can load from HAK/NWSync content, but image priority and format behavior should still be runtime-tested in the target client.

## Design Questions

- What exact player action does the panel support?
- Is the panel opened from item use, conversation, feat, DM command, heartbeat, or another server event?
- What is the window id and how do you avoid duplicate-window collisions?
- Which data is static, dynamic, player-specific, party-specific, or server-global?
- Which values are binds, which binds are watched, and which watched binds may trigger mutation?
- Which widgets need stable `NuiId` values?
- Which event types mutate game state and which are display-only?
- What permissions are checked before opening the panel and again before mutation?
- How does the UI refresh after mutation, inventory change, gold change, crafting result, level-up, relog, or area transition?
- What happens on close, repeated open, relog, death, party change, invalid target, missing recipe, insufficient resources, or stale token?
- Are visual assets normal content images or hardcoded NUI skin overrides?

## Recommended Output Shape

For a NUI task, produce:

1. User flow: entry point, success path, cancel/close path, and failure states.
2. Window contract: window id, token ownership, open/close rules, and duplicate-window behavior.
3. Data contract: bind names, bind types, source of truth, watched bind list, and refresh triggers.
4. Event routing: `OnNuiEvent` setup, event script override choice, window id dispatch, widget id dispatch, and default unhandled-event logging.
5. Mutation rules: permission checks, server-side validation, transaction/rollback behavior, and concurrency assumptions.
6. Runtime QA: open/close, repeated open, invalid input, watched bind recursion, stale token, relog, multiplayer concurrency, and asset packaging.
7. Evidence label: normally `design-only` until compiled and runtime-tested.

## Runtime Verification

Test at least:

- panel opens for the intended player and not for unauthorized players;
- duplicate open behavior is acceptable;
- every interactive widget has a `NuiId` and fires the expected event;
- watched binds do not recurse or spam the event handler;
- data mutation refreshes the correct binds/list rows;
- close/reopen/relog/death/area-transition behavior does not leave stale state;
- two players using the panel at once do not share player-local state accidentally;
- invalid input is rejected server-side even if the UI control appears disabled;
- visual assets are present through the intended distribution path;
- final behavior is checked in the NWN client or module runtime, not only by reading scripts.

## Guardrails

- Do not treat a NUI layout as complete until event handlers and refresh behavior are verified in runtime.
- Do not trust client-side disabled/hidden UI as a permission boundary.
- Do not call NUI feature work release-ready without testing event setup, duplicate-window behavior, watched bind behavior, and client asset delivery.
- Do not globalize NUI skin override advice: hardcoded skin files and ordinary panel images have different delivery constraints.

## Sources

- NWN Lexicon NUI functions: https://nwnlexicon.com/Category%3ANUI_Functions
- NWN Lexicon `NuiCreate`: https://nwnlexicon.com/NuiCreate
- NWN Lexicon `NuiSetBind`: https://nwnlexicon.com/NuiSetBind
- NWN Lexicon `NuiSetBindWatch`: https://nwnlexicon.com/NuiSetBindWatch
- NWN Lexicon `OnNuiEvent`: https://nwnlexicon.com/OnNuiEvent
- nwn.wiki NUI: https://nwn.wiki/spaces/NWN1/pages/48988184/NUI
