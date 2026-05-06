# Issue Tracker Configuration

## Tracker Type

**GitHub Issues**

This project uses GitHub Issues for task tracking.

## Repository

- **Remote:** Configured via `git remote -v`
- **Issues URL:** `https://github.com/[org]/[repo]/issues`

## CLI Commands

```bash
# Create issue
gh issue create --title "Title" --body "Description" --label "ready-for-agent"

# List issues
gh issue list --state open

# View issue
gh issue view [number]

# Close issue
gh issue close [number]

# Add label
gh issue edit [number] --add-label "blocked"
```

## Integration with Skills

- `/to-issues` creates GitHub issues with proper formatting
- `/triage` applies labels based on issue state
- `/to-prd` creates PRD as GitHub issue
- Issues reference each other via "Blocked by" section

## Labels Required

Ensure these labels exist in your GitHub repository:

- `needs-triage`
- `needs-info`
- `ready-for-agent`
- `ready-for-human`
- `wontfix`

Create missing labels:

```bash
gh label create "needs-triage" --color "D4C5F9" --description "Needs evaluation"
gh label create "needs-info" --color "5319E7" --description "Waiting on reporter"
gh label create "ready-for-agent" --color "0E8A16" --description "Ready for agent pickup"
gh label create "ready-for-human" --color "FBCA04" --description "Needs human implementation"
gh label create "wontfix" --color "B60205" --description "Will not be actioned"
```

## Workflow

1. **Incoming issues** → labeled `needs-triage` by default
2. **Triage** → `/triage` skill evaluates and applies correct label
3. **Ready for work** → `ready-for-agent` (AFK) or `ready-for-human` (HITL)
4. **Blocked** → Agent adds `blocked` label, Board Member removes after approval
5. **Completed** → Issue closed with reference to PR or commit
