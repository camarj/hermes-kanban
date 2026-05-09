import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { McpServerSelector } from "@/components/mcp/mcp-server-selector"

const servers = [
  {
    id: "srv-1",
    name: "github-mcp",
    transport: "stdio" as const,
    command: "npx -y @modelcontextprotocol/server-github",
    url: null,
    envVars: { GITHUB_TOKEN: "x" } as Record<string, string>,
    toolsFilter: [] as string[],
  },
  {
    id: "srv-2",
    name: "remote-mcp",
    transport: "http" as const,
    command: null,
    url: "https://example.com/mcp",
    envVars: {} as Record<string, string>,
    toolsFilter: ["read_file"] as string[],
  },
]

describe("McpServerSelector", () => {
  it("renders empty state with link to /mcp-servers when no servers", () => {
    render(
      <McpServerSelector
        servers={[]}
        selectedIds={[]}
        onChange={vi.fn()}
        orgSlug="acme"
      />
    )
    expect(screen.getByText(/no mcp servers/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /configure/i })).toHaveAttribute(
      "href",
      "/acme/mcp-servers"
    )
  })

  it("renders one checkbox per server with name", () => {
    render(
      <McpServerSelector
        servers={servers}
        selectedIds={[]}
        onChange={vi.fn()}
        orgSlug="acme"
      />
    )
    expect(screen.getByLabelText(/github-mcp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/remote-mcp/i)).toBeInTheDocument()
  })

  it("calls onChange with toggled selection", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <McpServerSelector
        servers={servers}
        selectedIds={[]}
        onChange={onChange}
        orgSlug="acme"
      />
    )

    await user.click(screen.getByLabelText(/github-mcp/i))
    expect(onChange).toHaveBeenCalledWith(["srv-1"])
  })

  it("removes id from selection when checkbox is toggled off", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <McpServerSelector
        servers={servers}
        selectedIds={["srv-1", "srv-2"]}
        onChange={onChange}
        orgSlug="acme"
      />
    )

    await user.click(screen.getByLabelText(/github-mcp/i))
    expect(onChange).toHaveBeenCalledWith(["srv-2"])
  })

  it("marks pre-selected servers as checked", () => {
    render(
      <McpServerSelector
        servers={servers}
        selectedIds={["srv-2"]}
        onChange={vi.fn()}
        orgSlug="acme"
      />
    )
    expect(screen.getByLabelText(/github-mcp/i)).not.toBeChecked()
    expect(screen.getByLabelText(/remote-mcp/i)).toBeChecked()
  })
})
