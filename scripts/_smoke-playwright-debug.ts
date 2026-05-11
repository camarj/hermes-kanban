import { chromium } from "@playwright/test"
import { readFileSync } from "fs"

async function main() {
  const state = JSON.parse(readFileSync("tests/e2e/.auth/user.json", "utf-8"))
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ storageState: state })
  const page = await ctx.newPage()

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[console.${msg.type()}]`, msg.text())
    }
  })
  page.on("requestfailed", (req) => {
    console.log("[reqfailed]", req.method(), req.url(), req.failure()?.errorText)
  })
  page.on("response", async (res) => {
    const url = res.url()
    if (url.includes("/api/")) {
      console.log(`[api ${res.status()}]`, res.request().method(), url)
      if (res.status() >= 400) {
        try {
          const body = await res.text()
          console.log("    body:", body.slice(0, 500))
        } catch {}
      }
    }
  })

  console.log("\n--- Navigate to /acme-corp/skills ---")
  await page.goto("http://localhost:3000/acme-corp/skills", { waitUntil: "networkidle" })

  console.log("\n--- Click New Skill ---")
  await page.getByRole("button", { name: /new skill/i }).click()
  await page.waitForTimeout(500)

  console.log("\n--- Fill form ---")
  const dialog = page.getByRole("dialog")
  await dialog.locator("#skill-name").fill("debug-skill")
  await dialog.locator("#skill-desc").fill("Debug skill for diagnosis purposes.")
  await dialog.locator("#skill-body").fill("# Debug\nbody")

  console.log("\n--- Click Save ---")
  await dialog.getByRole("button", { name: /save skill/i }).click()
  await page.waitForTimeout(3000)

  console.log("\n--- Dialog visibility after save:", await dialog.isVisible())
  // Check for in-form error
  const errBlock = dialog.locator(".text-destructive").first()
  if (await errBlock.count() > 0 && await errBlock.isVisible()) {
    console.log("    in-form error:", await errBlock.textContent())
  }

  console.log("\n--- Cleanup ---")
  const { PrismaClient } = await import("@prisma/client")
  const p = new PrismaClient()
  await p.skill.deleteMany({ where: { name: "debug-skill" } })
  await p.$disconnect()

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
