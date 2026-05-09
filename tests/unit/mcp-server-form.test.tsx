import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { McpServerForm } from "@/components/mcp/mcp-server-form"

describe("McpServerForm", () => {
  it("defaults to stdio with command field visible", () => {
    render(<McpServerForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText(/command/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^url/i)).not.toBeInTheDocument()
  })

  it("shows url input when http transport is selected", async () => {
    const user = userEvent.setup()
    render(<McpServerForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    const select = screen.getByLabelText(/transport/i) as HTMLSelectElement
    await user.selectOptions(select, "http")

    expect(screen.getByLabelText(/^url/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/command/i)).not.toBeInTheDocument()
  })

  it("disables submit until name and command have valid values", async () => {
    const user = userEvent.setup()
    render(<McpServerForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    const submit = screen.getByRole("button", { name: /save|create/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText(/name/i), "github")
    await user.type(screen.getByLabelText(/command/i), "npx server")
    expect(submit).toBeEnabled()
  })

  it("submits stdio payload with trimmed values", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<McpServerForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), "  Github  ")
    await user.type(screen.getByLabelText(/command/i), "  npx server  ")
    await user.click(screen.getByRole("button", { name: /save|create/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Github",
        transport: "stdio",
        command: "npx server",
      })
    )
  })

  it("hydrates initial values for edit mode", () => {
    render(
      <McpServerForm
        initial={{
          name: "Existing",
          transport: "http",
          url: "https://x.example.com/mcp",
          envVars: {},
          toolsFilter: [],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/name/i)).toHaveValue("Existing")
    expect(screen.getByLabelText(/^url/i)).toHaveValue("https://x.example.com/mcp")
  })
})
