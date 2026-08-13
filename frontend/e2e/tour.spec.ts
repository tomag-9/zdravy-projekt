import { expect, test } from "@playwright/test";
import {
  login,
  overlapArea,
  resetOnboarding,
  stableBoundingBox,
} from "./helpers";

/**
 * Onboarding tour — prejde všetky kroky na mobile aj desktope (#476, #477).
 *
 * Tri triedy chýb, ktoré tieto testy chytajú a ktoré unit testy nevedia:
 *  1. krok mieri na `targetId`, ktorý v danej vetve UI (mobil/PC) neexistuje,
 *  2. tooltip vypadne mimo viewport,
 *  3. tooltip pristane *na* prvku, ktorý má ukazovať — všetky tri sa reálne
 *     stali (mobilné koliesko nastavení, PC krok bez cieľa, zaseknutie na
 *     výbere prevádzky).
 */

/** Nad týmto podielom zakrytia cieľa už tooltip prekáža namiesto vysvetľovania. */
const MAX_TARGET_COVERAGE = 0.35;

test.describe("onboarding tour", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await resetOnboarding(page);
    await page.goto("/home");
  });

  test("prejde všetky kroky a tooltip nikdy nezakryje svoj cieľ", async ({
    page,
  }, testInfo) => {
    const tooltip = page.locator(".zp-tour-tooltip");
    await expect(tooltip, "tour sa nespustila na /home").toBeVisible();

    const counter = await page.locator(".zp-tour-step-counter").innerText();
    const total = Number(counter.match(/z (\d+)/)![1]);
    expect(total).toBeGreaterThan(0);

    const viewport = page.viewportSize()!;
    const titles: string[] = [];

    for (let step = 1; step <= total; step++) {
      await expect(
        tooltip,
        `krok ${step}/${total}: tooltip sa nezobrazil`,
      ).toBeVisible();
      await expect(page.locator(".zp-tour-step-counter")).toHaveText(
        `Krok ${step} z ${total}`,
      );

      const title = await page.locator(".zp-tour-title").innerText();
      titles.push(title);
      const where = `krok ${step}/${total} („${title}“)`;

      // Cieľ musí existovať a byť zvýraznený. Čaká sa naň *pred* meraním:
      // text tooltipu sa prepne hneď, ale prepočet pozície beží až po tom, čo
      // overlay nájde a nascrolluje cieľ — a zvýraznenie pribudne v tej istej
      // chvíli ako nová pozícia. Merať skôr by čítalo polohu z minulého kroku.
      const target = page.locator(".tour-highlight").first();
      await expect(
        target,
        `${where}: krok nemá zvýraznený cieľový prvok`,
      ).toBeVisible();

      const box = await stableBoundingBox(tooltip);

      // 1) Celý tooltip musí byť vidieť.
      expect(box.x, `${where}: tooltip preteká vľavo`).toBeGreaterThanOrEqual(0);
      expect(box.y, `${where}: tooltip preteká hore`).toBeGreaterThanOrEqual(0);
      expect(
        box.x + box.width,
        `${where}: tooltip preteká vpravo`,
      ).toBeLessThanOrEqual(viewport.width + 1);
      expect(
        box.y + box.height,
        `${where}: tooltip preteká dole`,
      ).toBeLessThanOrEqual(viewport.height + 1);

      // 2) Tooltip nesmie sedieť na tom, čo ukazuje.
      const targetBox = (await target.boundingBox())!;
      const coverage =
        overlapArea(box, targetBox) / (targetBox.width * targetBox.height);
      expect(
        coverage,
        `${where}: tooltip zakrýva ${(coverage * 100).toFixed(0)} % cieľa`,
      ).toBeLessThanOrEqual(MAX_TARGET_COVERAGE);

      await testInfo.attach(`${testInfo.project.name}-${step}-${title}`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });

      await page
        .locator(".zp-tour-nav button")
        .filter({ hasText: /Ďalej|Dokončiť/ })
        .last()
        .click();
    }

    // Po poslednom kroku sa tour ukončí.
    await expect(tooltip).toBeHidden();

    // Bez zoznamu titulkov by zlyhanie nepovedalo, ktorý krok chýba.
    expect(titles).toHaveLength(total);
  });

  test("viac-prevádzkový login dostane krok o prepínači prevádzky", async ({
    page,
  }) => {
    // Demo login patrí celku s viacerými prevádzkami, takže krok tam byť musí
    // — jednoprevádzkové logíny ho v tour vôbec nemajú (#476).
    const total = Number(
      (await page.locator(".zp-tour-step-counter").innerText()).match(
        /z (\d+)/,
      )![1],
    );

    const titles: string[] = [];
    for (let step = 1; step <= total; step++) {
      titles.push(await page.locator(".zp-tour-title").innerText());
      await page
        .locator(".zp-tour-nav button")
        .filter({ hasText: /Ďalej|Dokončiť/ })
        .last()
        .click();
      if (step < total) {
        await expect(page.locator(".zp-tour-tooltip")).toBeVisible();
      }
    }

    expect(titles).toContain("Za ktorú prevádzku objednávate");
  });

  test("krok o diétach opisuje diéty ako samostatnú položku", async ({
    page,
  }) => {
    // Od #468 sú diéty samostatný riadok pod Menu A, ktorý sa k jeho počtu
    // pripočítava; starý text tvrdil, že sa z neho uberajú (#477).
    const tooltip = page.locator(".zp-tour-tooltip");
    const total = Number(
      (await page.locator(".zp-tour-step-counter").innerText()).match(
        /z (\d+)/,
      )![1],
    );

    let body: string | null = null;
    for (let step = 1; step <= total; step++) {
      if ((await page.locator(".zp-tour-title").innerText()) === "Počet porcií a diéty") {
        body = await page.locator(".zp-tour-body").innerText();
        break;
      }
      await page
        .locator(".zp-tour-nav button")
        .filter({ hasText: /Ďalej|Dokončiť/ })
        .last()
        .click();
      await expect(tooltip).toBeVisible();
    }

    expect(body, "krok o porciách a diétach sa v tour nenašiel").not.toBeNull();
    expect(body).toContain("samostatná položka");
    expect(body).not.toContain("len v rámci porcií Menu A");
  });
});
