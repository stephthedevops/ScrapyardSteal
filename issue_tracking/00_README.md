# Issue Tracking System

How we track work on Scrapyard Steal.

## Files

| File | Purpose | What goes here |
|------|---------|---------------|
| `core-priorities.md` | Must-do before jam submission | Ship blockers, deployment, submission requirements |
| `known-bugs.md` | Confirmed bugs | Anything broken, crashing, or behaving wrong |
| `nice-to-haves.md` | Polish items | Would improve the game but not blocking |
| `backlog.md` | Post-jam / future | V2 features, long-term ideas |
| `completed.md` | Done | Implemented and verified items |
| `rejected.md` | Decided against | Items we considered but won't do |

## Adding an Item

Add a checkbox line to the appropriate file:

```
- [ ] Short description of the task
```

If you're not sure which file, add it to `backlog.md` and tag it for triage.

## Assigning Work

Add `@yourname` at the end of an item to claim it:

```
- [ ] Balance pass on tile claim cost @steph
- [ ] Deploy to Wavedash @nathan
```

Multiple people can be assigned:
```
- [ ] Playtest with 4+ players @steph @nathan
```

To unassign, just remove the `@name`.

## Tags

You can tag items to move them during triage. Add the tag in brackets after the checkbox:

| Tag | Moves to |
|-----|----------|
| `[cpt]` | completed.md |
| `[cpr]` | core-priorities.md |
| `[bl]` | backlog.md |
| `[nth]` | nice-to-haves.md |
| `[bug]` | known-bugs.md |
| `[rej]` | rejected.md |

Example:
```
- [cpr] This should be a core priority
- [bl] Move this to backlog
```

Items marked `[x]` are automatically moved to completed during triage.

## Triage (Kiro AI)

Say **"sync"**, **"resync"**, or **"prime"** in the Kiro chat to trigger automatic triage:

1. Reads all issue tracking files
2. Moves tagged items to the correct file (removes the tag after moving)
3. Moves `[x]` items to completed
4. Removes duplicates across files
5. Reports what was moved

## Rules

- Each item lives in **one file only** — no duplicates
- Use tags to request moves, or just edit the files directly
- Mark items `[x]` when done — triage will move them to completed
- Keep descriptions short and clear
- Group items under section headers (## Gameplay, ## UI, etc.)
