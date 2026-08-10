/**
 * Supported internal target pages for manually-sent notifications (#443).
 * Mirrors backend/api/notification_targets.py — keep both in sync.
 */

export const DEFAULT_NOTIFICATION_TARGET = "/inbox";

export const NOTIFICATION_TARGETS: [value: string, label: string][] = [
  ["/inbox", "Inbox"],
  ["/home", "Domov"],
  ["/order", "Objednávka"],
  ["/menu", "Jedálny lístok"],
  ["/profile", "Profil"],
  ["/settings", "Nastavenia"],
  ["/about", "O aplikácii"],
];
