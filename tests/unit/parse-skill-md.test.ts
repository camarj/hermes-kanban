import { describe, it, expect } from "vitest"
import { parseSkillMd, serializeSkillMd } from "@/lib/skills/parse-skill-md"

describe("parseSkillMd", () => {
  it("parses minimal SKILL.md with only name + description", () => {
    const md = `---
name: my-skill
description: A useful skill.
---

# Body content
Some instructions here.`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe("my-skill")
      expect(r.value.description).toBe("A useful skill.")
      expect(r.value.triggers).toEqual([])
      expect(r.value.userInvocable).toBe(true)
      expect(r.value.body).toMatch(/^# Body content/)
    }
  })

  it("parses triggers as YAML inline array", () => {
    const md = `---
name: x
description: x
triggers: [foo, "bar baz", quux]
---
body`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.triggers).toEqual(["foo", "bar baz", "quux"])
    }
  })

  it("parses triggers as YAML block array", () => {
    const md = `---
name: x
description: x
triggers:
  - first
  - second
  - third
---
body`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.triggers).toEqual(["first", "second", "third"])
    }
  })

  it("respects user-invocable: false", () => {
    const md = `---
name: x
description: x
user-invocable: false
---
body`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.userInvocable).toBe(false)
    }
  })

  it("respects user-invocable: true (explicit)", () => {
    const md = `---
name: x
description: x
user-invocable: true
---
body`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.userInvocable).toBe(true)
    }
  })

  it("strips quotes around description", () => {
    const md = `---
name: x
description: "A quoted description with: colons"
---
body`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.description).toBe("A quoted description with: colons")
    }
  })

  it("rejects when frontmatter is missing", () => {
    const md = `# Just a body, no frontmatter`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/frontmatter/i)
  })

  it("rejects when name is missing from frontmatter", () => {
    const md = `---
description: x
---
body`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/name/i)
  })

  it("rejects when description is missing from frontmatter", () => {
    const md = `---
name: x
---
body`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/description/i)
  })

  it("rejects malformed name (not kebab-case)", () => {
    const md = `---
name: Has Spaces
description: x
---
body`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/name/i)
  })

  it("preserves multi-line body content verbatim (no trim of internal whitespace)", () => {
    const md = `---
name: x
description: x
---
Line 1

Line 3

# Heading
Line 5`
    const r = parseSkillMd(md)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.body).toContain("Line 1")
      expect(r.value.body).toContain("Line 3")
      expect(r.value.body).toContain("Line 5")
    }
  })
})

describe("serializeSkillMd", () => {
  it("round-trips a minimal skill", () => {
    const md = serializeSkillMd({
      name: "x",
      description: "y",
      triggers: [],
      userInvocable: true,
      body: "Body here.",
    })
    const r = parseSkillMd(md)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe("x")
      expect(r.value.description).toBe("y")
      expect(r.value.body).toMatch(/Body here\./)
    }
  })

  it("emits user-invocable: false only when explicitly false (default is true)", () => {
    const withDefault = serializeSkillMd({
      name: "x",
      description: "y",
      triggers: [],
      userInvocable: true,
      body: "",
    })
    expect(withDefault).not.toMatch(/user-invocable:/)

    const explicit = serializeSkillMd({
      name: "x",
      description: "y",
      triggers: [],
      userInvocable: false,
      body: "",
    })
    expect(explicit).toMatch(/user-invocable: false/)
  })

  it("emits triggers as inline array when present", () => {
    const md = serializeSkillMd({
      name: "x",
      description: "y",
      triggers: ["a", "b"],
      userInvocable: true,
      body: "",
    })
    expect(md).toMatch(/triggers: \["a", "b"\]/)
  })

  it("omits triggers field when empty", () => {
    const md = serializeSkillMd({
      name: "x",
      description: "y",
      triggers: [],
      userInvocable: true,
      body: "",
    })
    expect(md).not.toMatch(/triggers:/)
  })

  it("quotes description if it contains a colon", () => {
    const md = serializeSkillMd({
      name: "x",
      description: "With: colon",
      triggers: [],
      userInvocable: true,
      body: "",
    })
    expect(md).toMatch(/description: "With: colon"/)
  })
})
