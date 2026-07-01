import { expect, test } from "@playwright/test"

test("authenticated navigation renders core data pages", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Company email").fill("domenico@agilelab.it")
  await page.getByRole("button", { name: "Send code" }).click()
  await page.getByRole("button", { name: "Enter" }).click()
  for (const path of ["/", "/matches", "/leaderboard", "/players", "/profile"]) {
    await page.goto(path)
    await expect(page.locator("main")).toBeVisible()
  }
})
