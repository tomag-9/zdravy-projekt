import { Page, expect } from "@playwright/test";

/** Demo login zo `init_roles` — celok so **viacerými** prevádzkami. */
export const MULTI_PREVADZKA_LOGIN = {
  email: "prevadzka@example.com",
  password: "prevadzka",
};

/** Demo admin zo `init_roles` — jediný login, ktorý vidí `/admin`. */
export const ADMIN_LOGIN = {
  email: "admin@example.com",
  password: "admin",
};

/**
 * Na mobilnom viewporte sa po prihlásení otvorí modál „Nainštalovať aplikáciu“
 * (`PWAInstallBanner`) a prekryje celé UI. Je to správne správanie appky, len
 * pre testy nezaujímavé — odklikneme ho rovnakým localStorage kľúčom, aký
 * používa tlačidlo „Teraz nie“, ešte pred prvým renderom.
 */
export async function dismissMobilePrompts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      "zdravy-install-banner-dismissed-until-v2",
      String(weekFromNow),
    );
    localStorage.setItem("zdravy-background-notice-dismissed-v1", "1");
  });
}

export async function login(
  page: Page,
  credentials = MULTI_PREVADZKA_LOGIN,
): Promise<void> {
  await dismissMobilePrompts(page);
  await page.goto("/login");
  await page.fill('input[inputmode="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home/);
}

/**
 * Prihlási admina a počká na admin shell.
 *
 * Nejde cez `login()`: ten čaká na `/home`, kam sa staff nikdy nedostane —
 * `ProtectedRoute` ho hneď presmeruje na `/admin`.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await dismissMobilePrompts(page);
  await page.goto("/login");
  await page.fill('input[inputmode="email"]', ADMIN_LOGIN.email);
  await page.fill('input[type="password"]', ADMIN_LOGIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

/**
 * Vráti onboarding do východzieho stavu, aby sa tour znova sama spustila.
 * Musí bežať po prihlásení — ide cez rovnaké API ako "Spustiť sprievodcu".
 */
export async function resetOnboarding(page: Page): Promise<void> {
  const ok = await page.evaluate(async () => {
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    const res = await fetch("/api/user/profile/", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ onboarding_completed: false }),
    });
    return res.ok;
  });
  expect(ok, "reset onboarding_completed zlyhal").toBe(true);
}

/** Text, ktorým sa ohlási obrazovka výberu prevádzky. */
export const CHOOSER_PROMPT = "Za ktorú prevádzku nahlasujete objednávku?";

/**
 * Otvorí objednávkovú obrazovku a vyberie prevádzku.
 *
 * Čakanie na chooser je nutné, nie kozmetické: kým sa prevádzky načítajú,
 * OrderPage zámerne renderuje plný formulár (aby jednoprevádzkový celok
 * nevidel prázdnu obrazovku) a až potom ho vymení za chooser. Podmienený klik
 * „ak tam chooser je“ by v tomto okne nespravil nič a test by ďalej kontroloval
 * formulár, ktorý o chvíľu zmizne.
 */
/** Najbližší pracovný deň v `YYYY-MM-DD` — na dnešok býva uzávierka po termíne. */
export function firstNextWorkday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export async function openOrderPage(page: Page, date?: string): Promise<void> {
  await page.goto(date ? `/order?date=${date}` : "/order");
  await expect(page.getByText(CHOOSER_PROMPT)).toBeVisible();
  await page.locator(".zp-card button.zp-btn--secondary").first().click();
  await expect(page.getByText(CHOOSER_PROMPT)).toBeHidden();
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Počká, kým sa prvok prestane hýbať, a vráti jeho ustálený rámec.
 *
 * `TourOverlay` pozicuje tooltip dvojfázovo — najprv podľa odhadovanej výšky,
 * po prvom vykreslení znova podľa skutočnej. Meranie hneď po prepnutí kroku by
 * teda čítalo medzipolohu, nie tú, ktorú používateľ nakoniec vidí.
 */
export async function stableBoundingBox(
  locator: import("@playwright/test").Locator,
  { timeout = 5000, settleMs = 120 } = {},
): Promise<Box> {
  const deadline = Date.now() + timeout;
  let previous = await locator.boundingBox();

  while (Date.now() < deadline) {
    await locator.page().waitForTimeout(settleMs);
    const current = await locator.boundingBox();
    if (
      previous &&
      current &&
      previous.x === current.x &&
      previous.y === current.y &&
      previous.height === current.height
    ) {
      return current;
    }
    previous = current;
  }

  expect(previous, "prvok sa neustálil na žiadnej pozícii").not.toBeNull();
  return previous!;
}

/** Plocha prieniku dvoch obdĺžnikov v px². */
export function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}
