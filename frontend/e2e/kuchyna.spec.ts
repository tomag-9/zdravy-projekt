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
   * Seed dáta pokrývajú len časť dní, takže predvolený deň (dnešok) môže byť
   * bez jedálnička. Vrátime sa po dňoch dozadu, kým sa neobjavia stanoviská —
   * inak by test padal podľa toho, ktorý deň v týždni práve beží.
   */
  async function gotoDayWithData(page: Page): Promise<boolean> {
    for (let i = 0; i < 7; i++) {
      if (await page.locator(".zpk-station").count()) return true;
      await page.click('button[aria-label="Predchádzajúci deň"]');
      await page.waitForTimeout(400);
    }
    return (await page.locator(".zpk-station").count()) > 0;
  }

  /**
   * Stav nakladania žije v DB a prežije beh testu, takže sa nesmie
   * predpokladať prázdny štart — inak by klik odškrtol už naloženú položku.
   */
  async function setTick(row: import("@playwright/test").Locator, loaded: boolean) {
    const tick = row.locator(".zpk-tick");
    const isOn = ((await tick.getAttribute("class")) ?? "").includes("is-loaded");
    if (isOn !== loaded) await tick.click();
    await expect(tick).toHaveClass(loaded ? /is-loaded/ : /^((?!is-loaded).)*$/);
  }

  test("stanoviská sa dajú prepínať a prvé je predvolené", async ({ page }) => {
    await loginAsKuchyna(page);
    test.skip(!(await gotoDayWithData(page)), "žiadny deň so seed dátami");
    const stations = page.locator(".zpk-station");
    await expect(stations.first()).toHaveClass(/is-active/);

    if ((await stations.count()) > 1) {
      await stations.nth(1).click();
      await expect(stations.nth(1)).toHaveClass(/is-active/);
      await expect(stations.first()).not.toHaveClass(/is-active/);
    }
  });

  test("odklikávanie je priamo v riadku prevádzky", async ({ page }) => {
    await loginAsKuchyna(page);
    test.skip(!(await gotoDayWithData(page)), "žiadny deň so seed dátami");
    const row = page.locator("tr.client-row").first();
    const tick = row.locator(".zpk-tick");
    await expect(tick).toBeVisible();

    // Bez textu, takže význam nesie prístupný názov.
    await expect(tick).toHaveAttribute("aria-label", /.+/);

    // Aj kompaktné tlačidlo musí ostať trafiteľné prstom.
    const box = await tick.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);

    await setTick(row, false);
    await setTick(row, true);
  });

  test("postup stanoviska sa počíta", async ({ page }) => {
    await loginAsKuchyna(page);
    test.skip(!(await gotoDayWithData(page)), "žiadny deň so seed dátami");
    const progress = page.locator(".zpk-station-progress");
    await expect(progress).toBeVisible();

    const row = page.locator("tr.client-row").first();
    await setTick(row, false);
    const before = await progress.textContent();
    await setTick(row, true);
    await expect(progress).not.toHaveText(before ?? "");
  });

  test("stanovisko mení, ktorá položka sa odklikáva", async ({ page }) => {
    await loginAsKuchyna(page);
    test.skip(!(await gotoDayWithData(page)), "žiadny deň so seed dátami");
    const stations = page.locator(".zpk-station");
    test.skip((await stations.count()) < 2, "deň má jediné stanovisko");

    const row = page.locator("tr.client-row").first();
    await stations.first().click();
    await setTick(row, true);

    // Druhé stanovisko má vlastný stav — nesmie zdediť odklik prvého.
    await stations.nth(1).click();
    await setTick(row, false);
    await expect(row.locator(".zpk-tick")).not.toHaveClass(/is-loaded/);

    await stations.first().click();
    await expect(row.locator(".zpk-tick")).toHaveClass(/is-loaded/);
  });
});
