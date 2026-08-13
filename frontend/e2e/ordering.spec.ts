import { expect, test } from "@playwright/test";
import {
  CHOOSER_PROMPT,
  firstNextWorkday,
  login,
  openOrderPage,
} from "./helpers";

/**
 * Kritická cesta klienta: prihlásenie → výber prevádzky → objednávková
 * obrazovka. Doménovo najcitlivejšia časť je práve výber prevádzky — objednávky
 * sa vedú per prevádzka, takže zlý (alebo zaseknutý) výber zapíše počty inde.
 */
test.describe("objednávanie za viac prevádzok", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Tour by prekryla UI modálnym overlayom.
    await page.evaluate(async () => {
      const token =
        localStorage.getItem("access_token") || localStorage.getItem("token");
      await fetch("/api/user/profile/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ onboarding_completed: true }),
      });
    });
  });

  test("po výbere prevádzky sa dá prepnúť na inú", async ({ page }) => {
    await page.goto("/order");

    // Chooser: celok má viac prevádzok, takže sa musí spýtať.
    const chooser = page.getByText(CHOOSER_PROMPT);
    await expect(chooser).toBeVisible();

    const options = page.locator(".zp-card button.zp-btn--secondary");
    const count = await options.count();
    expect(count, "demo celok má mať viac prevádzok").toBeGreaterThan(1);

    const firstName = (await options.first().innerText()).split("\n")[0].trim();
    await options.first().click();

    // Pás musí ukazovať, za koho sa objednáva.
    const strip = page.locator('[data-tour-id="tour-prevadzka-switch"]');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(firstName);

    // A výber sa musí dať zmeniť — nie zaseknúť na prvej voľbe.
    await strip.getByRole("button", { name: "Zmeniť" }).click();
    await expect(chooser).toBeVisible();

    const secondName = (await options.nth(1).innerText()).split("\n")[0].trim();
    await options.nth(1).click();
    await expect(strip).toContainText(secondName);
    expect(secondName).not.toBe(firstName);
  });

  test("objednávková obrazovka ponúkne jedlá a súhrn", async ({ page }) => {
    // Na dnešok býva uzávierka po termíne a všetky karty sú zamknuté; testujeme
    // najbližší pracovný deň, kde sa dá reálne objednávať.
    await openOrderPage(page, firstNextWorkday());

    await expect(
      page.locator('[data-tour-id="tour-day-selector"]').first(),
    ).toBeVisible();
    await expect(page.locator('[data-tour-id="tour-order-summary"]')).toBeVisible();

    await expect(
      page.locator(".zp-meal-title", { hasText: "Celodenná objednávka" }),
    ).toBeVisible();
    for (const meal of ["Raňajky", "Obed", "Olovrant"]) {
      await expect(
        page.locator(".zp-meal-title", { hasText: meal }),
        `karta jedla „${meal}“ chýba`,
      ).toBeVisible();
    }
  });

  test("zapnutie jedla odomkne zadávanie porcií", async ({ page }) => {
    await openOrderPage(page, firstNextWorkday());

    const breakfast = page
      .locator(".zp-meal")
      .filter({ has: page.locator(".zp-meal-title", { hasText: "Raňajky" }) });
    await breakfast.getByRole("switch", { name: "Raňajky - prepnúť" }).click();

    // Po zapnutí sa musia objaviť riadky s vekovými skupinami a Menu A.
    await expect(breakfast.locator(".zp-cat").first()).toBeVisible();
    await expect(
      breakfast.locator(".zp-menurow .name", { hasText: "Menu A" }).first(),
    ).toBeVisible();
  });
});
