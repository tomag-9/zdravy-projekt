import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Admin konzola na mobile.
 *
 * Admin bol navrhnutý na širokú obrazovku a shell je flex **riadok** (rail
 * vľavo, obsah vpravo). Mobilný topbar je ďalší priamy potomok toho istého
 * flexu — kým sa shell na úzkej obrazovke neprepol na stĺpec, sadol si vedľa
 * obsahu ako úzky stĺpec a zvyšok appky vytlačil mimo viewport. Testy nižšie
 * strážia presne to: že sa nič nerozleje do strán a že sa zásuvka dá ovládať.
 */

const ADMIN_PAGES = [
  "/admin/dashboard",
  "/admin/prevadzka-overview",
  "/admin/delivery-layout",
  "/admin/meal-plan",
  "/admin/meal-catalog",
  "/admin/facilities",
  "/admin/diets",
  "/admin/settings",
  "/admin/holidays",
  "/admin/logs",
  "/admin/push-notifications",
  "/admin/roles",
];

test.describe("admin na mobile", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) > 900,
    "mobilný shell sa zapína pod 900px",
  );

  /**
   * Široké tabuľky (gramáž, logy) smú scrollovať vodorovne — ale vo vlastnom
   * `.zpa-table-wrap`, nie celým obsahom stránky. Preto sa meria dokument aj
   * `.zpa-main`, nie jednotlivé prvky.
   */
  const sidewaysOverflow = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const main = document.querySelector(".zpa-main");
      return {
        doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        main: main ? main.scrollWidth - main.clientWidth : 0,
      };
    });

  test("žiadna obrazovka netečie do strán", async ({ page }) => {
    await loginAsAdmin(page);

    for (const path of ADMIN_PAGES) {
      await page.goto(path);
      // Obsah sa dopĺňa asynchrónne; čakáme na hlavičku stránky, nie na timeout.
      await expect(page.locator(".zpa-pagehead h1")).toBeVisible();

      const overflow = await sidewaysOverflow(page);
      expect(overflow.doc, `${path}: dokument tečie do strán`).toBeLessThanOrEqual(1);
      expect(overflow.main, `${path}: obsah tečie do strán`).toBeLessThanOrEqual(1);
    }
  });

  test("detailové obrazovky netečú ani na 320px", async ({ page }) => {
    // Najužší displej, s ktorým sa reálne počíta (iPhone SE 1. gen). Nadpisy
    // sú tu dáta — e-mail admina ani názov celku nemajú kde zalomiť.
    await page.setViewportSize({ width: 320, height: 844 });
    await loginAsAdmin(page);

    await page.goto("/admin/roles");
    await page.locator('a[href^="/admin/roles/"]').first().click();
    await expect(page.getByText("Osobné údaje a rola")).toBeVisible();
    expect((await sidewaysOverflow(page)).main, "detail admina tečie").toBeLessThanOrEqual(1);

    await page.goto("/admin/facilities");
    await page.locator(".zpa-celok-toggle").first().click();
    await page.locator('a[href^="/admin/facilities/"]').first().click();
    await expect(page.locator(".zpa-tabs")).toBeVisible();
    expect((await sidewaysOverflow(page)).main, "detail prevádzky tečie").toBeLessThanOrEqual(1);

    await page.goto("/admin/settings");
    await expect(page.locator(".zpa-pagehead h1")).toBeVisible();
    expect((await sidewaysOverflow(page)).main, "systémové nastavenia tečú").toBeLessThanOrEqual(1);
  });

  test("zásuvka s navigáciou sa otvorí, prekryje topbar a zavrie sa výberom", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/dashboard");

    const sidebar = page.locator(".zpa-sidebar");
    const navLink = page.getByRole("link", { name: "Voľné dni" });

    /**
     * Zásuvka sa zatvára posunom (`translateX(-100%)`), takže z pohľadu DOM
     * ostáva „viditeľná“ — jediný spoľahlivý signál je jej poloha.
     */
    const sidebarRightEdge = async () => {
      const box = await sidebar.boundingBox();
      return (box?.x ?? 0) + (box?.width ?? 0);
    };

    expect(await sidebarRightEdge()).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Otvoriť menu" }).click();
    await expect(navLink).toBeVisible();

    // Hlavička zásuvky nesmie skončiť pod topbarom — kvôli tomu má na mobile
    // vyšší z-index ako topbar.
    const brand = page.locator(".zpa-sidebar .brand-full img");
    await expect(brand).toBeVisible();
    const brandBox = await brand.boundingBox();
    expect(brandBox!.y).toBeGreaterThanOrEqual(0);

    // Rail sa na desktope rozbaľuje hoverom; na dotyku musia byť popisky vidno
    // aj bez neho.
    await expect(navLink).toHaveText(/Voľné dni/);

    await navLink.click();
    await expect(page).toHaveURL(/\/admin\/holidays/);
    await expect.poll(sidebarRightEdge).toBeLessThanOrEqual(1);
  });

  test("poradie prevádzok v trase sa dá meniť bez ťahania", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/delivery-layout");
    await expect(page.locator(".zpa-pagehead h1")).toBeVisible();

    const rows = page.locator(".zpa-table tbody tr.zpa-draggable-row");
    await expect(rows.first()).toBeVisible();

    const nameOf = (index: number) =>
      rows.nth(index).locator("td div").first().innerText();

    const before = [await nameOf(0), await nameOf(1)];

    // Prvý riadok nemôže ísť vyššie — šípka je vypnutá.
    await expect(rows.nth(0).getByRole("button", { name: /vyššie$/i })).toBeDisabled();

    await rows.nth(0).getByRole("button", { name: /nižšie$/i }).click();

    await expect
      .poll(async () => [await nameOf(0), await nameOf(1)])
      .toEqual([before[1], before[0]]);

    // Vrátime späť, aby test nemenil stav pre ďalšie behy.
    await rows.nth(1).getByRole("button", { name: /vyššie$/i }).click();
    await expect.poll(async () => [await nameOf(0), await nameOf(1)]).toEqual(before);
  });
});
