import { expect, test, type Locator, type Page } from "@playwright/test"

const login = async (page: Page, email: string) => {
  await page.goto("/login")
  await page.getByLabel("Company email").fill(email)
  await page.getByRole("button", { name: "Send code" }).click()
  await page.getByRole("button", { name: "Enter" }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

const selectPlayer = async (team: Locator, label: string, player: string) => {
  const field = team.locator(".field", { hasText: label }).first()
  await field.getByPlaceholder("Search nickname or name").fill(player)
  await field.getByRole("button", { name: new RegExp(player, "i") }).click()
}

const fillSets = async (page: Page, values: string[]) => {
  const scores = page.getByRole("spinbutton")
  for (const [index, value] of values.entries()) await scores.nth(index).fill(value)
}

test("submits an anonymous ranked singles result from the QR route", async ({ page }) => {
  await page.goto("/quick/quick-demo")
  await expect(page.getByText("No login required")).toBeVisible()

  const teams = page.locator(".quick-team")
  await selectPlayer(teams.nth(0), "Player 1", "Dome")
  await selectPlayer(teams.nth(1), "Player 1", "Luk")
  await fillSets(page, ["11", "7", "11", "8"])
  await page.getByRole("button", { name: "Submit ranked result" }).click()

  await expect(page.getByText("Result submitted")).toBeVisible()

  await login(page, "luca@agilelab.it")
  await page.goto("/matches")
  const quickMatch = page.locator("article", { hasText: "Quick insert" }).first()
  await expect(quickMatch).toContainText("Dome")
  await expect(quickMatch).toContainText("11-7, 11-8")
  await expect(quickMatch.getByRole("button", { name: "Confirm result" })).toBeVisible()
})

test("locks a signed-in user into Side A and supports doubles", async ({ page }) => {
  await login(page, "domenico@agilelab.it")
  await page.goto("/quick/quick-demo")

  await expect(page.locator(".locked-player", { hasText: "signed in" })).toBeVisible()
  await page.getByText("2 vs 2").click()
  const teams = page.locator(".quick-team")
  await selectPlayer(teams.nth(0), "Player 2", "Luk")
  await selectPlayer(teams.nth(1), "Player 1", "Giu")
  await selectPlayer(teams.nth(1), "Player 2", "Marco")
  await fillSets(page, ["11", "7", "8", "11", "11", "9"])
  await page.getByRole("button", { name: "Submit ranked result" }).click()

  await expect(page.getByText("Result submitted")).toBeVisible()
  await page.getByRole("link", { name: "Open matches" }).click()
  const quickMatch = page.locator("article", { hasText: "Quick insert" }).first()
  await expect(quickMatch).toContainText("+ Luk")
  await expect(quickMatch).toContainText("11-7, 8-11, 11-9")
})
