# Triage Labels Configuration

## Label Vocabulary

Labels used by the `/triage` skill to categorize issues.

| Label | Description | When Applied |
|-------|-------------|--------------|
| `needs-triage` | Issue needs evaluation by maintainer | Incoming issues, default state |
| `needs-info` | Waiting for more information from reporter | Reporter needs to clarify |
| `ready-for-agent` | Fully specified, AFK-ready | Agent can pick up with no human context |
| `ready-for-human` | Needs human implementation | Requires human judgment or skills agents lack |
| `wontfix` | Will not be actioned | Duplicate, invalid, or out of scope |
| `blocked` | Task blocked waiting for approval | Agent called `kanban_block` |
| `in-progress` | Agent actively working on task | Dispatcher spawned worker |

## Triage State Machine

```
[New Issue]
     ↓
needs-triage
     ↓
     ├─→ needs-info (if unclear)
     │       ↓
     │       └─→ [Reporter responds] → needs-triage
     │
     ├─→ ready-for-agent (if fully specified, AFK)
     │       ↓
     │       └─→ [Agent picks up] → in-progress
     │
     ├─→ ready-for-human (if needs human)
     │
     └─→ wontfix (if invalid/duplicate)
```

## AFK vs HITL

### AFK (Away From Keyboard) - `ready-for-agent`
- Fully specified, no ambiguity
- Agent has all context needed
- No human interaction required during execution
- Examples: "Implement login API", "Fix failing test", "Add input validation"

### HITL (Human In The Loop) - `ready-for-human`
- Requires human judgment or decision
- Agent would need to ask questions
- Examples: "Design new feature", "Choose between architectures", "Review security audit"

## Blocked Workflow

When an agent blocks a task:

1. Agent calls `kanban_block(reason="...")`
2. System applies `blocked` label
3. Notification sent to relevant Board Members
4. Board Member reviews, comments, approves
5. System removes `blocked` label, applies `ready-for-agent`
6. Dispatcher picks up task again

## Creating Labels

```bash
# Create all required labels
gh label create "needs-triage" --color "D4C5F9" --description "Needs evaluation"
gh label create "needs-info" --color "5319E7" --description "Waiting on reporter"
gh label create "ready-for-agent" --color "0E8A16" --description "Ready for agent pickup"
gh label create "ready-for-human" --color "FBCA04" --description "Needs human implementation"
gh label create "wontfix" --color "B60205" --description "Will not be actioned"
gh label create "blocked" --color "E99695" --description "Waiting for approval"
gh label create "in-progress" --color "1D76DB" --description "Agent currently working"
```

## Project-Specific Labels

In addition to triage labels, this project may use:

- `priority:high`, `priority:medium`, `priority:low`
- `type:bug`, `type:feature`, `type:refactor`, `type:docs`
- `area:backend`, `area:frontend`, `area:agents`, `area:infrastructure`
