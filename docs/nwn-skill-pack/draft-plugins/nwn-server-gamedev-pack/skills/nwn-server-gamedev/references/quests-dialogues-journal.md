# Quests, Dialogue, Journal

## Source Status

- `docs-verified`: NWN Lexicon conversation, journal, conditional/action/end/abort script, custom token, and conversation control pages.
- `docs-verified`: NWNWiki/Fandom Start a conversation page for basic Toolset script hookup examples.
- `community-example`: NWNWiki/Fandom Add multiple journal entries and Include questing pages for simple quest/journal patterns.
- `runtime-tested`: required before claiming a quest is persistent, multiplayer-safe, non-repeatable, exploit-safe, or clear to players.

## What This Domain Controls

Conversation files, quest state, journal categories and entries, rewards, branching, conditional visibility, failure and abort states, NPC reactivity, party/global journal propagation, persistence, repeatability, and player-facing clarity.

## Source-Backed Facts To Preserve

- NWN conversation behavior is supported by a dedicated conversation-function lane that includes `ActionStartConversation`, `BeginConversation`, `GetPCSpeaker`, `GetScriptParam`, `SetCustomToken`, pause/resume helpers, and journal update functions.
- `ActionStartConversation` queues an NPC action to start a conversation with a target and can use an explicit dialogue resref or the default conversation set on the non-PC object.
- `ActionStartConversation` can start conversations with NPCs, placeables, triggers, and doors; items do not converse directly.
- `BeginConversation` attempts to start a conversation immediately and is normally used at the logical end of an `OnConversation` script.
- `BeginConversation` can use the executing object's default conversation when no resref is supplied.
- The NWNWiki/Fandom Start a conversation page documents simple Toolset hookups for placeables and doors through stock scripts such as `nw_g0_convplac` and `nw_g0_convdoor`.
- Conversation conditional scripts live under Text Appears When and return TRUE/FALSE to decide whether a node or response is shown.
- Conversation action scripts live under Actions Taken and fire when the node is selected or chosen.
- `GetPCSpeaker` retrieves the PC in the current conversation and is only valid inside scripts called as part of a conversation.
- Conversation conditional and action scripts can use `GetScriptParam`; script parameters were added in NWN:EE 1.80.8193.14 and can reduce large families of nearly identical scripts.
- In conversation conditional/action/end/abort scripts, `OBJECT_SELF` is the original object conversing with the player, even when Speaker Tag makes another NPC speak.
- The Lexicon specifically warns that checking a quest item only in a conditional is not enough for rewards, because the player can drop the item between node display and node selection.
- Conversation end scripts fire on normal dialogue end nodes, while abort scripts fire for non-standard exits such as escape, combat, new conversation, moving too far away, familiar possession, or player disconnect.
- Important end-state logic may need to exist in both end and abort paths, or use idempotent state flags, because multiplayer conversations can be interrupted.
- `ActionPauseConversation` pauses the current conversation at a node and requires the caller's action queue to be empty to be reliable.
- `ActionResumeConversation` resumes a paused conversation but cannot resume if the PC moved out of range.
- `SetCustomToken` sets global custom-token values used in conversations and journal entries; custom tokens are not local to a conversation.
- Custom tokens `0-9` are reserved by BioWare and should not be used.
- `AddJournalQuestEntry` adds an entry to the Quests or Completed Quests tab for a PC, party, or all PCs, using journal category tag and entry ID.
- Journal category tags are case-sensitive.
- By default, journal entries must advance to a higher entry ID unless override is explicitly allowed.
- The Completed tab is controlled by the Journal Editor's completed flag, not by a separate script-only destination.
- Preceding entries in the same journal category are automatically removed.
- `RemoveJournalQuestEntry` removes entries from a journal category and also clears the local journal-entry integer used by that category.
- Journal function category includes `GetJournalQuestExperience` for reading experience set on a journal category.

## Design Questions

- What is the quest promise, who gives it, what player action proves progress, and what exact state means complete, failed, abandoned, or repeatable?
- Is the quest per-character, per-account, party-shared, faction-shared, server-global, or seasonal/live-ops state?
- Which state is authoritative: local variables, campaign DB, built-in SQLite, NWNX SQL, inventory tokens, journal entry, or a project quest service?
- Which dialogue object owns the conversation: NPC, placeable, door, trigger, invisible placeable, or scripted controller?
- Which dialogue branches are gated by quest state, inventory, faction, class, skill checks, party membership, time, area, reputation, or previous choices?
- Which scripts are conditions, which are actions, and which need end/abort handling?
- Which rewards are granted: journal stage, XP, gold, items, faction/reputation, access flags, transitions, NUI state, crafting unlocks, or server-side persistence?
- Can a player repeat, spam, disconnect, move away, enter combat, trade/drop an item, or involve party members between seeing a branch and selecting it?
- Does the quest need custom tokens, TLK/StringRef text, localized player-facing text, map pins, VFX/sounds, or NUI panels?
- What evidence proves the quest: fresh PC run, in-progress PC run, completed PC run, relog/restart run, party run, abort run, and exploit run.

## Implementation Path

1. Define the quest contract: giver, objective, completion/failure states, repeatability, party rules, and persistence lane.
2. Assign stable ids: quest id, journal category tag, journal entry IDs, conversation resrefs, NPC/placeable tags, variables, and reward ids.
3. Build a state table before writing dialogue: state, visible dialogue nodes, journal entry, reward eligibility, next state, rollback path, and QA evidence.
4. Separate Text Appears When checks from Actions Taken effects; re-check exploit-sensitive prerequisites in the action script before granting rewards.
5. Prefer parameterized reusable conversation scripts when `GetScriptParam` is available for the target EE version.
6. Keep custom-token ranges owned by the project and set tokens immediately before the conversation or node that uses them.
7. Update journal and persistent quest state together, then record whether the journal is display-only or authoritative.
8. Handle normal conversation end and abort paths for quests that start combat, teleport, lock the player, pause/resume, or mutate persistent state.
9. Verify fresh, in-progress, completed, failed, relogged, restarted, party, and abuse-path flows.

## Recommended Output Shape

For quest/dialogue/journal tasks, produce:

1. Quest contract and state table.
2. Conversation ownership and resref/tag table.
3. Journal category and entry table.
4. Condition/action/end/abort script table.
5. Persistence and party-sharing policy.
6. Reward and anti-repeat controls.
7. Player-facing text clarity checklist.
8. Runtime QA matrix with exact blockers.

## Runtime Verification

Check at least:

- dialogue opens from every intended object and route;
- conditional branches show/hide for fresh, in-progress, completed, failed, and invalid-state PCs;
- action scripts re-check inventory/state before granting rewards;
- journal category tag and entry ID match the Toolset Journal Editor;
- journal updates appear on the intended PC, party, or all players;
- completed entries land on the intended Quests or Completed tab;
- journal and persistent quest state survive relog and server restart if the server promises persistence;
- end and abort scripts behave correctly when the player presses escape, moves away, enters combat, starts another conversation, or disconnects;
- custom tokens display correct text for simultaneous players and do not leak values between conversations;
- reward scripts cannot be repeated, duplicated, or bypassed through party handoff, item drop/trade, or reconnect timing.

## Guardrails

- Do not treat the journal entry as authoritative persistent state unless the project explicitly persists and restores it.
- Do not grant rewards from a conversation action script without re-checking prerequisites that were used in the condition script.
- Do not assume a conversation always ends normally; design abort behavior for multiplayer.
- Do not use shared custom-token numbers without a project-owned range and multiplayer review.
- Do not assume `GetPCSpeaker` works outside conversation-called scripts.
- Do not backtrack journal entry IDs with override unless the state table explicitly allows it.
- Do not mix party-wide, all-player, and single-PC journal updates without a documented policy.
- Do not put irreversible state mutation in a branch that can be reached before all required text/choice context is visible to the player.

## Sources

- NWN Lexicon Conversation Functions: https://nwnlexicon.com/Category%3AConversation_Functions
- NWN Lexicon Journal Functions: https://nwnlexicon.com/Category%3AJournal_Functions
- NWN Lexicon ActionStartConversation: https://www.nwnlexicon.com/ActionStartConversation
- NWN Lexicon BeginConversation: https://nwnlexicon.com/BeginConversation
- NWN Lexicon Conversation Conditional Script: https://nwnlexicon.com/Conversation_Conditional_Script
- NWN Lexicon Conversation Action Script: https://nwnlexicon.com/Conversation_Action_Script
- NWN Lexicon Conversation End Script: https://nwnlexicon.com/Conversation_End_Script
- NWN Lexicon Conversation Abort Script: https://nwnlexicon.com/Conversation_Abort_Script
- NWN Lexicon GetPCSpeaker: https://nwnlexicon.com/GetPCSpeaker
- NWN Lexicon GetScriptParam: https://nwnlexicon.com/GetScriptParam
- NWN Lexicon SetCustomToken: https://www.nwnlexicon.com/SetCustomToken
- NWN Lexicon ActionPauseConversation: https://nwnlexicon.com/ActionPauseConversation
- NWN Lexicon ActionResumeConversation: https://nwnlexicon.com/ActionResumeConversation
- NWN Lexicon AddJournalQuestEntry: https://nwnlexicon.com/AddJournalQuestEntry
- NWN Lexicon RemoveJournalQuestEntry: https://nwnlexicon.com/RemoveJournalQuestEntry
- NWNWiki/Fandom Start a conversation: https://nwn.fandom.com/wiki/Start_a_conversation
- NWNWiki/Fandom Add multiple journal entries: https://nwn.fandom.com/wiki/Add_multiple_journal_entries_upon_the_player_entering_the_module
- NWNWiki/Fandom Include questing: https://nwn.fandom.com/wiki/Include_questing
