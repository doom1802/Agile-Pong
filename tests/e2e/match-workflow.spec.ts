import { expect, test, type Browser, type Locator, type Page } from "@playwright/test"

const login = async (page: Page, email: string) => {
  await page.goto("/login")
  await page.getByLabel("Company email").fill(email)
  await page.getByRole("button", { name: "Send code" }).click()
  await page.getByRole("button", { name: "Enter" }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

const opponentPage = async (browser: Browser, email = "luca@agilelab.it") => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, email)
  return { context, page }
}

const fillStraightSets = async (match: Locator) => {
  const scores = match.getByRole("spinbutton")
  await scores.nth(0).fill("11")
  await scores.nth(1).fill("7")
  await scores.nth(2).fill("11")
  await scores.nth(3).fill("8")
}

test("creates, submits, and confirms a ranked singles match from the opposite side", async ({ browser, page }) => {
  await login(page, "domenico@agilelab.it")
  await page.goto("/matches/new")
  await page.getByLabel("Points").selectOption("11")
  await page.getByPlaceholder("Search nickname, email, first or last name").fill("luca@")
  await page.getByRole("button", { name: /luca@agilelab.it/i }).click()
  await page.getByRole("button", { name: "Create match" }).click()
  await page.getByRole("button", { name: "Close" }).click()
  const match = page.locator("article").first()
  await fillStraightSets(match)
  await match.getByRole("button", { name: "Confirm sets" }).click()

  const opponent = await opponentPage(browser)
  await opponent.page.goto("/matches")
  const submitted = opponent.page.locator("article", { has: opponent.page.getByRole("button", { name: "Confirm result" }) }).first()
  await expect(submitted).toContainText("Dome")
  await submitted.getByRole("button", { name: "Confirm result" }).click()
  await expect(opponent.page.locator("article").first()).toContainText(/Dome.*\+\d+/)
  await opponent.context.close()
})

test("supports participant cancellation of ready and submitted matches without applying rating", async ({ browser, page }) => {
  await login(page, "domenico@agilelab.it")
  await page.goto("/matches/new")
  await page.getByLabel("Points").selectOption("11")
  await page.getByPlaceholder("Search nickname, email, first or last name").fill("giulia@")
  await page.getByRole("button", { name: /giulia@agilelab.it/i }).click()
  await page.getByRole("button", { name: "Create match" }).click()
  await page.getByRole("button", { name: "Close" }).click()
  const cancellable = page.locator("article").first()
  await cancellable.getByRole("button", { name: "Cancel match" }).click()
  await expect(cancellable).toContainText("cancelled")

  await page.goto("/matches/new")
  await page.getByLabel("Points").selectOption("11")
  await page.getByPlaceholder("Search nickname, email, first or last name").fill("luca@")
  await page.getByRole("button", { name: /luca@agilelab.it/i }).click()
  await page.getByRole("button", { name: "Create match" }).click()
  await page.getByRole("button", { name: "Close" }).click()
  const submitted = page.locator("article").first()
  await fillStraightSets(submitted)
  await submitted.getByRole("button", { name: "Confirm sets" }).click()
  const opponent = await opponentPage(browser)
  await opponent.page.goto("/matches")
  const submittedForOpponent = opponent.page.locator("article", { has: opponent.page.getByRole("button", { name: "Cancel match" }) }).first()
  await submittedForOpponent.getByRole("button", { name: "Cancel match" }).click()
  await expect(opponent.page.locator("article").first()).toContainText("cancelled")
  await opponent.context.close()
})

test("creates a doubles match with unique players", async ({ page }) => {
  await login(page, "domenico@agilelab.it")
  await page.goto("/matches/new")
  await page.getByLabel("Doubles").check()
  await expect(page.getByText(/^Selected:/)).toHaveCount(3)
  await page.getByRole("button", { name: "Create match" }).click()
  await expect(page.locator("article").first()).toContainText("doubles")
})
