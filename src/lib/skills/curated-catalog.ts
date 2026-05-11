import { prisma } from "@/lib/db/prisma"

export interface CuratedSkillFile {
  path: string
  content: string
}

export interface CuratedSkill {
  name: string
  description: string
  triggers: string[]
  userInvocable: boolean
  version: string
  files: CuratedSkillFile[]
}

function skillMd(opts: {
  name: string
  description: string
  triggers: string[]
  userInvocable?: boolean
  body: string
}): CuratedSkillFile {
  const triggersYaml = opts.triggers.length
    ? `triggers: [${opts.triggers.map((t) => JSON.stringify(t)).join(", ")}]\n`
    : ""
  const invocable = opts.userInvocable === false ? "user-invocable: false\n" : ""
  const frontmatter = `---\nname: ${opts.name}\ndescription: ${JSON.stringify(opts.description)}\n${triggersYaml}${invocable}---\n\n`
  return { path: "SKILL.md", content: frontmatter + opts.body.trimEnd() + "\n" }
}

export const CURATED_SKILLS: CuratedSkill[] = [
  {
    name: "kanban-worker",
    description: "Core worker behavior: claim a task, execute, report progress, complete via kanban tools.",
    triggers: ["task", "kanban", "ticket"],
    userInvocable: false,
    version: "1.0.0",
    files: [
      skillMd({
        name: "kanban-worker",
        description: "Core worker behavior for kanban-driven task execution.",
        triggers: ["task", "kanban", "ticket"],
        userInvocable: false,
        body: `# Kanban Worker

You are a worker agent. Your behavior loop:

1. Receive a task assignment via your Hermes profile.
2. Read the task body, acceptance criteria, and any linked context.
3. Execute the work using the toolsets available to you.
4. Use \`kanban_complete\` with a summary of what shipped when done.
5. If blocked, use \`kanban_block\` with a clear reason and what would unblock you.

## Reporting

- Be concise. The CEO and C-level read your summaries to decide next steps.
- Never claim work as done that you did not verify.
- Surface risks early; do not hide failures.`,
      }),
    ],
  },
  {
    name: "kanban-orchestrator",
    description: "Delegation behavior for CEO and C-Level agents: break work down, assign to reports, track progress.",
    triggers: ["delegate", "assign", "orchestrate"],
    userInvocable: false,
    version: "1.0.0",
    files: [
      skillMd({
        name: "kanban-orchestrator",
        description: "Delegation behavior for orchestrator-tier agents.",
        triggers: ["delegate", "assign", "orchestrate"],
        userInvocable: false,
        body: `# Kanban Orchestrator

You are an orchestrator (CEO or C-Level). You do not execute tasks directly — you delegate.

## Delegation loop

1. Receive an objective from a user (CEO) or supervisor (C-Level).
2. Decompose it into vertical-slice tasks.
3. Use \`kanban_create\` to create each task with an assignee (a profile name).
4. Monitor progress via \`kanban_list\` and \`agents_list\`.
5. Report status upward only when material progress or risk emerges.

## Hiring

If no suitable worker exists, use \`agent_request\` to spin up one with the right template.

## Boundaries

- Never execute code, browse the web, or touch files. Those toolsets are blocked for you.
- If a worker reports a blocker that requires a decision you cannot make, escalate.`,
      }),
    ],
  },
  {
    name: "backend-development",
    description: "Backend engineering practices: API design, data modeling, persistence, testing.",
    triggers: ["api", "backend", "database", "endpoint"],
    userInvocable: true,
    version: "1.0.0",
    files: [
      skillMd({
        name: "backend-development",
        description: "Server-side engineering practices for APIs, persistence, and business logic.",
        triggers: ["api", "backend", "database", "endpoint"],
        body: `# Backend Development

You write server-side code: HTTP endpoints, queries, business logic, integrations.

## Defaults

- Validate inputs at the API boundary; trust internal callers.
- Scope every query by tenant (orgId) — multi-tenant safety is non-negotiable.
- Prefer explicit transactions for multi-row mutations.
- Return structured errors with stable codes the client can branch on.

## Testing

- Unit-test pure logic with mocked persistence.
- Integration-test the full request → DB path for critical flows.
- Never ship a new endpoint without at least one happy-path and one auth/scope test.`,
      }),
    ],
  },
  {
    name: "frontend-development",
    description: "Frontend engineering practices: component design, state management, accessibility, performance.",
    triggers: ["ui", "frontend", "component", "react"],
    userInvocable: true,
    version: "1.0.0",
    files: [
      skillMd({
        name: "frontend-development",
        description: "Client-side engineering practices for UI, state, accessibility, and performance.",
        triggers: ["ui", "frontend", "component", "react"],
        body: `# Frontend Development

You build user interfaces. Care about correctness, accessibility, and perceived performance equally.

## Defaults

- Server components by default; client components only where interactivity demands them.
- Keep client bundles small — measure before adding a dependency.
- Every interactive element gets a keyboard and screen-reader path.
- Loading and empty states are part of the design, not afterthoughts.

## Validation

- Type-check passing is a prerequisite, not a goal.
- Smoke-test in a real browser before reporting work complete.`,
      }),
    ],
  },
  {
    name: "github-code-review",
    description: "Reviewing pull requests with focus on correctness, security, maintainability.",
    triggers: ["pr", "review", "pull request", "code review"],
    userInvocable: true,
    version: "1.0.0",
    files: [
      skillMd({
        name: "github-code-review",
        description: "Conducting code reviews on GitHub pull requests.",
        triggers: ["pr", "review", "pull request", "code review"],
        body: `# GitHub Code Review

You review pull requests. You do not approve work that is unsafe, untested, or undocumented.

## Review checklist

1. Does the diff match the PR description?
2. Are there tests for the new behavior? Do they actually exercise it?
3. Inputs from outside the trust boundary validated?
4. Any change to a shared module that could break other callers?
5. Backwards-compatibility for live data?

## Tone

Be direct. Cite the specific line. Suggest the fix, do not just flag the problem.`,
      }),
    ],
  },
  {
    name: "react-patterns",
    description: "Idiomatic React patterns: composition, hooks discipline, suspense boundaries, server vs client.",
    triggers: ["react", "hooks", "component"],
    userInvocable: true,
    version: "1.0.0",
    files: [
      skillMd({
        name: "react-patterns",
        description: "Idiomatic patterns for modern React (Server Components, suspense, hooks).",
        triggers: ["react", "hooks", "component"],
        body: `# React Patterns

Use these patterns by default.

## Composition over configuration

Build small components that compose. A 30-prop component is a smell — split it.

## Server first

In Next.js, default to server components. Move to client components only at the smallest leaf that needs state, effects, or browser APIs.

## Hook discipline

- One concern per custom hook.
- No setState in render or useEffect — if you find yourself doing it, derive instead.
- Cleanup is part of the hook, not an afterthought.

## Suspense + streaming

Wrap async server components in Suspense with a fallback. Stream what is ready first.`,
      }),
    ],
  },
  {
    name: "research-methodology",
    description: "Systematic research: framing the question, gathering primary sources, synthesizing findings.",
    triggers: ["research", "investigation", "analysis"],
    userInvocable: true,
    version: "1.0.0",
    files: [
      skillMd({
        name: "research-methodology",
        description: "Conducting structured research and producing actionable findings.",
        triggers: ["research", "investigation", "analysis"],
        body: `# Research Methodology

You produce findings, not summaries.

## Loop

1. Frame the question precisely. Ambiguous questions produce ambiguous answers.
2. List what you would need to know to answer it. Distinguish primary sources from opinion.
3. Gather. Cite as you go — every claim ties to a source.
4. Synthesize: what is the answer, what is uncertain, what would change the answer?

## Output

End with a one-paragraph executive summary, a bulleted list of the strongest evidence, and an honest list of unknowns. No filler.`,
      }),
    ],
  },
  {
    name: "infrastructure",
    description: "Infrastructure engineering: containerization, deployment, observability, secrets management.",
    triggers: ["infra", "docker", "deploy", "kubernetes"],
    userInvocable: true,
    version: "1.0.0",
    files: [
      skillMd({
        name: "infrastructure",
        description: "Building and operating production infrastructure with discipline.",
        triggers: ["infra", "docker", "deploy", "kubernetes"],
        body: `# Infrastructure

You design and operate production systems.

## Defaults

- Reproducible builds. If the deploy depends on a developer's laptop state, fix that first.
- Secrets stay in a secret store, never in code or images.
- Every service ships with a healthcheck and structured logs.
- Observability before scale: you cannot fix what you cannot see.

## Change management

- Backwards-compatible schema changes first; consumer changes second; cleanup last.
- Document the rollback before you ship the rollout.`,
      }),
    ],
  },
]

export async function seedCuratedSkills(): Promise<void> {
  // Idempotent: wipe curated rows (orgId IS NULL) and reinsert. We do not use
  // upsert because Postgres treats NULL as distinct in UNIQUE(orgId, name), so
  // the @@unique compound cannot match curated rows reliably.
  await prisma.skill.deleteMany({ where: { source: "curated", orgId: null } })
  await prisma.skill.createMany({
    data: CURATED_SKILLS.map((skill) => ({
      orgId: null,
      name: skill.name,
      description: skill.description,
      source: "curated" as const,
      isPublic: true,
      files: skill.files as unknown as object,
      triggers: skill.triggers,
      userInvocable: skill.userInvocable,
      version: skill.version,
    })),
  })
}
