/**
 * Rola Kuchyňa (#486) — beží na tablet viewporte, lebo preň je obrazovka
 * navrhnutá. Overuje tri veci, ktoré sa z unit testov overiť nedajú:
 * kam kuchyňu pustí router, že sa tabuľka naozaj vykreslí, a že sa
 * do admin konzoly nedostane ani cez priamu URL.
 */

import { test, expect, Page } from "@playwright/test";
import { dismissMobilePrompts } from "./helpers";

/** Demo kuchyňa login zo `init_roles`. */
const KUCHYNA_LOGIN = { email: "kuchyna@example.com", password: "kuchyna" };

// iPad na šírku — cieľové zariadenie pre výdaj.
test.use({ viewport: { width: 1024, height: 768 } });

async function loginAsKuchyna(page: Page): Promise<void> {
  await dismissMobilePrompts(page);
  await page.goto("/login");
  await page.fill('input[inputmode="email"]', KUCHYNA_LOGIN.email);
  await page.fill('input[type="password"]', KUCHYNA_LOGIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/kuchyna/);
}

test.describe("Kuchyňa", () => {
  test("po prihlásení skončí na svojej obrazovke", async ({ page }) => {
    await loginAsKuchyna(page);
    await expect(page).toHaveURL(/\/kuchyna/);
    await expect(page.locator(".zpk-badge")).toHaveText("Kuchyňa");
  });

  test("vidí prepínač dňa a obsah prehľadu", async ({ page }) => {
    await loginAsKuchyna(page);

    await expect(page.locator(".zpk-day-label")).toBeVisible();

    // Buď tabuľka, alebo zmysluplná prázdna hláška — podľa toho, či je na
    // daný deň zadaný jedálniček. Oboje je korektný stav.
    await expect(
      page.locator(".zpk-gram table.zpa-gram, .zpk-empty"),
    ).toBeVisible();
  });

  test("prepínanie dňa funguje", async ({ page }) => {
    await loginAsKuchyna(page);
    const label = page.locator(".zpk-day-label");
    const before = await label.textContent();

    await page.click('button[aria-label="Predchádzajúci deň"]');
    await expect(label).not.toHaveText(before ?? "");
    await expect(page.locator(".zpk-today")).toBeVisible();
  });

  test("nedostane sa do admin konzoly ani priamou URL", async ({ page }) => {
    await loginAsKuchyna(page);
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/kuchyna/);
  });

  test("klikacie plochy spĺňajú dotykové minimum", async ({ page }) => {
    await loginAsKuchyna(page);
    for (const selector of [
      'button[aria-label="Predchádzajúci deň"]',
      'button[aria-label="Nasledujúci deň"]',
      'button[aria-label="Odhlásiť sa"]',
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      expect(box!.width, selector).toBeGreaterThanOrEqual(48);
      expect(box!.height, selector).toBeGreaterThanOrEqual(48);
    }
  });
});
