/**
 * Granulárne oprávnenia (#484) — overuje sa proti bežiacemu stacku, lebo
 * podstata je v súhre backend matice a gejtovania menu.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.use({ viewport: { width: 1440, height: 900 } });

test.describe("Matica oprávnení", () => {
  test("superadmin vidí maticu v detaile loginu", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/roles");

    const firstRow = page.locator("table.zpa-table tbody tr").first();
    await expect(firstRow).toBeVisible();
    await firstRow.locator('a[title="Upraviť"]').click();

    await expect(page.locator(".zpa-perm-head")).toBeVisible();
    await expect(page.locator(".zpa-perm-row").first()).toBeVisible();
  });

  test("nastavenie a vrátenie na dedenie z role", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/roles");
    await page.locator("table.zpa-table tbody tr").first()
      .locator('a[title="Upraviť"]').click();

    const row = page.locator(".zpa-perm-row").first();
    await expect(row).toBeVisible();

    await row.getByRole("radio", { name: "Len čítanie" }).click();
    await expect(row.getByRole("radio", { name: "Len čítanie" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // „Podľa role" nie je to isté ako explicitne nastavená rovnaká hodnota:
    // dedená sa posunie so zmenou role.
    await row.getByRole("radio", { name: "Podľa role" }).click();
    await expect(row.getByRole("radio", { name: "Podľa role" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(row.locator("small")).toContainText("dedí z role");
  });
});

test.describe("Režim len na čítanie", () => {
  /**
   * Overuje sa naživo, lebo podstata je v reťazci backend → profil → UI.
   * Superadmin si obmedzí vlastný prístup k Diétam (neškodná sekcia — na
   * `pristupy` by sa zamkol) a po znovunačítaní musia byť polia neaktívne.
   */
  async function setDietsLevel(page: import("@playwright/test").Page, label: string) {
    await page.goto("/admin/roles");
    await page.locator("table.zpa-table tbody tr").first()
      .locator('a[title="Upraviť"]').click();
    const row = page.locator(".zpa-perm-row").filter({ hasText: "Diéty" }).first();
    await expect(row).toBeVisible();
    await row.getByRole("radio", { name: label }).click();
    await expect(row.getByRole("radio", { name: label })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  }

  test("obmedzenie na čítanie zamkne polia a ohlási sa pruhom", async ({ page }) => {
    await loginAsAdmin(page);
    try {
      await setDietsLevel(page, "Len čítanie");

      await page.goto("/admin/diets");
      await page.reload();
      await expect(page.locator(".zpa-readonly-notice")).toBeVisible();

      // Hľadanie nič nemení, takže ostáva funkčné.
      const search = page.locator(".zpa-search input").first();
      if (await search.count()) await expect(search).toBeEnabled();

      const addButton = page.locator("button.zpa-btn--primary").first();
      if (await addButton.count()) await expect(addButton).toBeDisabled();
    } finally {
      await setDietsLevel(page, "Podľa role");
    }
  });

  test("po vrátení na dedenie z role sa obrazovka odomkne", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/diets");
    await page.reload();
    await expect(page.locator(".zpa-readonly-notice")).toHaveCount(0);
  });
});
