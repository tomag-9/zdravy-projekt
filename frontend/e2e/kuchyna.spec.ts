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

test.describe("Nakladanie (#487)", () => {
  /**
   * Stav nakladania žije v DB a prežije beh testu, takže sa nesmie
   * predpokladať prázdny štart — kliklo by sa na už naložené položky a
   * odškrtlo by ich to. Preto sa dopĺňa len to, čo chýba.
   */
  async function ensureAllLoaded(card: import("@playwright/test").Locator) {
    const items = card.locator(".zpk-item");
    for (let i = 0; i < (await items.count()); i++) {
      const item = items.nth(i);
      if (!((await item.getAttribute("class")) ?? "").includes("is-loaded")) {
        await item.click();
        await expect(item).toHaveClass(/is-loaded/);
      }
    }
  }

  async function openLoading(page: Page) {
    await loginAsKuchyna(page);
    await page.getByRole("tab", { name: "Nakladanie" }).click();
    const card = page.locator(".zpk-card").first();
    await expect(card).toBeVisible();
    return card;
  }

  test("prevádzku nejde potvrdiť, kým niečo chýba", async ({ page }) => {
    const card = await openLoading(page);

    // Zhoď jednu položku, nech je stav deterministický bez ohľadu na DB.
    const first = card.locator(".zpk-item").first();
    if (((await first.getAttribute("class")) ?? "").includes("is-loaded")) {
      await first.click();
    }
    await expect(first).not.toHaveClass(/is-loaded/);

    await expect(card.getByRole("button", { name: /^Ešte / })).toBeDisabled();
    await expect(card.locator(".zpk-done")).toHaveCount(0);
  });

  test("po odklikaní všetkého prejde kontrolný krok a potvrdenie", async ({ page }) => {
    const card = await openLoading(page);
    await ensureAllLoaded(card);

    const confirmBtn = card.getByRole("button", { name: "Skontrolovať a potvrdiť" });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    await page.getByRole("button", { name: "Potvrdiť naloženie" }).click();
    await expect(card.locator(".zpk-done")).toBeVisible();
  });

  test("odškrtnutie položky zruší potvrdenie", async ({ page }) => {
    const card = await openLoading(page);
    await ensureAllLoaded(card);

    // Test si potvrdený stav zariadi sám, nespolieha sa na predchádzajúci test.
    if (!(await card.locator(".zpk-done").count())) {
      await card.getByRole("button", { name: "Skontrolovať a potvrdiť" }).click();
      await page.getByRole("button", { name: "Potvrdiť naloženie" }).click();
    }
    await expect(card.locator(".zpk-done")).toBeVisible();

    await card.locator(".zpk-item").first().click();
    await expect(card.locator(".zpk-done")).toHaveCount(0);
  });
});
