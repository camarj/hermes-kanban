import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TemplatePicker } from "@/components/agents/template-picker"
import type { TemplateOption } from "@/lib/agents/list-templates"

const ceoOption: TemplateOption = {
  id: "code:ceo:default",
  source: "code",
  name: "CEO Agent",
  displayName: "Chief Executive Officer",
  description: "Strategic leader",
  roleType: "ceo",
  defaultSkills: ["strategy"],
  defaultTools: ["analytics"],
  defaultToolsets: [],
  isPublic: true,
  orgId: null,
}

const ctoOption: TemplateOption = {
  id: "code:c-level:cto",
  source: "code",
  name: "CTO Agent",
  displayName: "Chief Technology Officer",
  description: "Tech department lead",
  roleType: "c-level",
  cLevelRole: "cto",
  defaultSkills: ["kanban-orchestrator"],
  defaultTools: [],
  defaultToolsets: [],
  isPublic: true,
  orgId: null,
}

const backendOption: TemplateOption = {
  id: "code:worker:backend-engineer",
  source: "code",
  name: "Backend Engineer",
  displayName: "Backend Engineer",
  description: "Implements APIs",
  roleType: "worker",
  specialization: "backend-engineer",
  defaultSkills: ["backend-development"],
  defaultTools: ["git"],
  defaultToolsets: [],
  isPublic: true,
  orgId: null,
}

const frontendOption: TemplateOption = {
  id: "code:worker:frontend-engineer",
  source: "code",
  name: "Frontend Engineer",
  displayName: "Frontend Engineer",
  description: "Builds UIs",
  roleType: "worker",
  specialization: "frontend-engineer",
  defaultSkills: ["frontend-development"],
  defaultTools: ["git"],
  defaultToolsets: [],
  isPublic: true,
  orgId: null,
}

describe("TemplatePicker", () => {
  it("renders templates filtered by roleType", () => {
    render(
      <TemplatePicker
        templates={[ceoOption, ctoOption, backendOption]}
        roleType="worker"
        selectedId={null}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByText("Backend Engineer")).toBeInTheDocument()
    expect(screen.queryByText("CEO Agent")).not.toBeInTheDocument()
    expect(screen.queryByText("CTO Agent")).not.toBeInTheDocument()
  })

  it("calls onSelect with the templateId on click", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(
      <TemplatePicker
        templates={[backendOption, frontendOption]}
        roleType="worker"
        selectedId={null}
        onSelect={onSelect}
      />
    )

    await user.click(screen.getByRole("button", { name: /Backend Engineer/i }))
    expect(onSelect).toHaveBeenCalledWith(backendOption)
  })

  it("marks selected template with aria-pressed", () => {
    render(
      <TemplatePicker
        templates={[backendOption, frontendOption]}
        roleType="worker"
        selectedId={backendOption.id}
        onSelect={vi.fn()}
      />
    )

    const backendBtn = screen.getByRole("button", { name: /Backend Engineer/i })
    const frontendBtn = screen.getByRole("button", { name: /Frontend Engineer/i })
    expect(backendBtn).toHaveAttribute("aria-pressed", "true")
    expect(frontendBtn).toHaveAttribute("aria-pressed", "false")
  })

  it("renders default skills as visible badges on each card", () => {
    render(
      <TemplatePicker
        templates={[backendOption]}
        roleType="worker"
        selectedId={null}
        onSelect={vi.fn()}
      />
    )

    const card = screen.getByRole("button", { name: /Backend Engineer/i })
    expect(within(card).getByText("backend-development")).toBeInTheDocument()
  })

  it("groups workers by department when grouped prop is set", () => {
    render(
      <TemplatePicker
        templates={[backendOption, frontendOption]}
        roleType="worker"
        selectedId={null}
        onSelect={vi.fn()}
        grouped
      />
    )

    expect(screen.getByText(/Technology/i)).toBeInTheDocument()
  })
})
