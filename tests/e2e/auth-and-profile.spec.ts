import { expect, test } from "@playwright/test"

const login = async (page: import("@playwright/test").Page, email = "domenico@agilelab.it") => {
  await page.goto("/login")
  await page.getByLabel("Company email").fill(email)
  await page.getByRole("button", { name: "Send code" }).click()
  await page.getByRole("button", { name: "Enter" }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

test("rejects non-company addresses", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Company email").fill("outsider@example.com")
  await page.getByRole("button", { name: "Send code" }).click()
  await expect(page.getByText("Use an @agilelab.it email.")).toBeVisible()
})

test("supports mock login, profile editing, and logout", async ({ page }) => {
  await login(page)
  await page.goto("/profile")
  await page.getByLabel("Nickname").fill("Dome E2E")
  await page.getByRole("button", { name: /save/i }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto("/profile")
  await page.getByRole("button", { name: /logout/i }).click()
  await expect(page).toHaveURL(/\/login/)
})

test("rejects a nickname already used by another player", async ({ page }) => {
  await login(page, "marco@agilelab.it")
  await page.goto("/profile")
  await page.getByLabel("Nickname").fill("Reserved Nickname")
  await page.getByRole("button", { name: /save/i }).click()
  await page.goto("/profile")
  await page.getByRole("button", { name: /logout/i }).click()

  await login(page, "luca@agilelab.it")
  await page.goto("/profile")
  await page.getByLabel("Nickname").fill(" reserved nickname ")
  await page.getByRole("button", { name: /save/i }).click()
  await expect(page).toHaveURL(/\/profile\?error=nickname-taken/)
  await expect(page.getByText("That nickname is already taken.")).toBeVisible()
  await expect(page.getByLabel("Nickname")).toHaveValue("Luk")
})

test("first login requires onboarding and returning login bypasses it", async ({ page }) => {
  const email = `e2e.${Date.now()}@agilelab.it`
  await login(page, email)
  await expect(page).toHaveURL(/\/onboarding/)
  await page.getByLabel("Nickname").fill(`E2E ${Date.now()}`)
  await page.getByLabel("Usual office").fill("Remote")
  await page.getByRole("button", { name: /save|continue/i }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto("/profile")
  await page.getByRole("button", { name: /logout/i }).click()
  await login(page, email)
  await expect(page).not.toHaveURL(/\/onboarding/)
})
