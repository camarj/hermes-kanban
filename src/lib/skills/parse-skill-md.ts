export interface ParsedSkill {
  name: string
  description: string
  triggers: string[]
  userInvocable: boolean
  body: string
}

export type ParseResult =
  | { ok: true; value: ParsedSkill }
  | { ok: false; error: string }

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export function parseSkillMd(content: string): ParseResult {
  const match = content.match(FRONTMATTER_RE)
  if (!match) {
    return { ok: false, error: "Missing YAML frontmatter (---...---)" }
  }

  const frontmatter = match[1]
  const body = (match[2] ?? "").replace(/^\r?\n+/, "")

  const fields = parseFrontmatterFields(frontmatter)

  const name = fields.get("name")
  if (!name) return { ok: false, error: "Frontmatter missing 'name'" }
  if (!NAME_PATTERN.test(name)) {
    return { ok: false, error: `Invalid 'name' (must be kebab-case lowercase): ${name}` }
  }

  const description = fields.get("description")
  if (!description) return { ok: false, error: "Frontmatter missing 'description'" }

  const triggersRaw = fields.get("triggers") ?? ""
  const triggers = parseTriggers(triggersRaw, frontmatter)

  const userInvocableRaw = fields.get("user-invocable")
  const userInvocable = userInvocableRaw === "false" ? false : true

  return {
    ok: true,
    value: { name, description, triggers, userInvocable, body },
  }
}

function parseFrontmatterFields(frontmatter: string): Map<string, string> {
  const result = new Map<string, string>()
  const lines = frontmatter.split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1)
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1)
    }
    result.set(key, val)
  }
  return result
}

function parseTriggers(inlineValue: string, frontmatter: string): string[] {
  if (inlineValue.startsWith("[") && inlineValue.endsWith("]")) {
    const inner = inlineValue.slice(1, -1).trim()
    if (!inner) return []
    return splitYamlInlineList(inner)
  }

  // block array form (triggers: \n  - foo \n  - bar)
  const blockMatch = frontmatter.match(/^triggers:\s*\r?\n((?:\s+-\s+.*\r?\n?)+)/m)
  if (blockMatch) {
    return blockMatch[1]
      .split(/\r?\n/)
      .map((l) => l.match(/^\s+-\s+(.*)$/)?.[1].trim())
      .filter((s): s is string => Boolean(s))
      .map(stripYamlQuotes)
  }

  return []
}

function splitYamlInlineList(s: string): string[] {
  const items: string[] = []
  let buf = ""
  let inQuote: '"' | "'" | null = null
  for (const ch of s) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        buf += ch
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch
      continue
    }
    if (ch === ",") {
      items.push(buf.trim())
      buf = ""
      continue
    }
    buf += ch
  }
  if (buf.trim()) items.push(buf.trim())
  return items.map(stripYamlQuotes)
}

function stripYamlQuotes(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1)
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1)
  return s
}

export function serializeSkillMd(skill: ParsedSkill): string {
  const lines: string[] = ["---"]
  lines.push(`name: ${skill.name}`)

  const descNeedsQuote =
    skill.description.includes(":") ||
    skill.description.includes("#") ||
    skill.description.includes('"')
  lines.push(
    `description: ${descNeedsQuote ? JSON.stringify(skill.description) : skill.description}`,
  )

  if (skill.triggers.length > 0) {
    lines.push(`triggers: [${skill.triggers.map((t) => JSON.stringify(t)).join(", ")}]`)
  }

  if (skill.userInvocable === false) {
    lines.push("user-invocable: false")
  }

  lines.push("---", "")
  lines.push(skill.body)
  return lines.join("\n")
}
