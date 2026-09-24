import { expect, test } from "@playwright/test"

test("authenticated navigation renders core data pages", async ({ page }) => {
  await page.goto("/login")
  await page.waitForLoadState("networkidle")
  const emailInput = page.getByLabel("Company email")
  await emailInput.fill("domenico@agilelab.it")
  await expect(emailInput).toHaveValue("domenico@agilelab.it")
  await page.getByRole("button", { name: "Send code" }).click()
  await expect(page).toHaveURL(/t=\d{13}/)
  await page.getByRole("button", { name: "Enter" }).click()
  for (const path of ["/", "/matches", "/leaderboard", "/players", "/profile"]) {
    await page.goto(path)
    await expect(page.locator("main")).toBeVisible()
  }
})
