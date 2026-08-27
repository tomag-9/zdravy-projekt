import { useRef } from "react";
import { CATEGORIES } from "../../config/constants";
import type { MealData, PackTarget } from "../../services/OrderService";

export type { PackTarget };

export type PackSeparatelyItem = {
  category: string;
  kind: "menus" | "diets";
  keyName: string;
  orderedCount: number;
  count: number;
  /** Ktorý z dvoch vzájomne sa vylučujúcich spôsobov balenia táto položka je. */
  target: PackTarget;
  menuVariant?: string;
  linkedDietKey?: string;
  linkedMenuKey?: string;
  linkedRow?: "merged" | "remainder";
};

export type PackSeparatelySection = {
  meal: "breakfast" | "lunch" | "olovrant" | "fullDay";
  mealLabel: string;
  items: PackSeparatelyItem[];
};

export const getPackSeparatelyItemLabel = (item: PackSeparatelyItem) => {
  if (item.kind === "menus") {
    return `Menu ${item.keyName}${item.linkedRow === "merged" ? ` (${item.linkedDietKey})` : ""}`;
  }
  return item.keyName;
};

type PackSeparatelyUpdate = {
  kind: "menus" | "diets";
  key: string;
  count: number;
  target: PackTarget;
};

export const getPackSeparatelyUpdates = (
  currentItems: PackSeparatelyItem[],
  item: PackSeparatelyItem,
  count: number,
): PackSeparatelyUpdate[] => {
  const linkedMenuKey = item.linkedMenuKey || (item.kind === "menus" ? item.keyName : undefined);
  const linkedDietKey = item.linkedDietKey || (item.kind === "diets" ? item.keyName : undefined);
  if (!linkedMenuKey || !linkedDietKey || !item.linkedRow) {
    return [{ kind: item.kind, key: item.keyName, count, target: item.target }];
  }

  const counterpart = currentItems.find((candidate) => {
    const candidateMenuKey = candidate.linkedMenuKey
      || (candidate.kind === "menus" ? candidate.keyName : undefined);
    const candidateDietKey = candidate.linkedDietKey
      || (candidate.kind === "diets" ? candidate.keyName : undefined);
    return candidate.category === item.category
      && candidate.target === item.target
      && candidateMenuKey === linkedMenuKey
      && candidateDietKey === linkedDietKey
      && candidate.linkedRow !== item.linkedRow;
  });
  const counterpartCount = counterpart?.count || 0;

  if (item.linkedRow === "merged") {
    return [
      {
        kind: "menus",
        key: linkedMenuKey,
        count: count + (counterpart?.kind === "menus" ? counterpartCount : 0),
        target: item.target,
      },
      {
        kind: "diets",
        key: linkedDietKey,
        count: count + (counterpart?.kind === "diets" ? counterpartCount : 0),
        target: item.target,
      },
    ];
  }

  return [{ kind: item.kind, key: item.keyName, count: counterpartCount + count, target: item.target }];
};

/**
 * A merged/remainder row pair must read the OTHER row's just-dispatched count to
 * compute its own update (see getPackSeparatelyUpdates above), but the caller's
 * `sections` prop is still last render's value when several updates fire in the
 * same tick — a ref mirrors the latest sections synchronously (updated during
 * render, not via effect) so each update always sees its sibling's fresh count.
 */
export const usePackSeparatelyUpdater = (
  sections: PackSeparatelySection[],
  onUpdatePackSeparately: (
    meal: PackSeparatelySection["meal"],
    category: string,
    kind: "menus" | "diets",
    key: string,
    count: number,
    target: PackTarget,
  ) => void,
) => {
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  return (
    section: PackSeparatelySection,
    item: PackSeparatelyItem,
    count: number,
  ) => {
    const currentItems = sectionsRef.current.find(
      (currentSection) => currentSection.meal === section.meal,
    )?.items || section.items;
    getPackSeparatelyUpdates(currentItems, item, count).forEach((update) => {
      onUpdatePackSeparately(
        section.meal,
        item.category,
        update.kind,
        update.key,
        update.count,
        update.target,
      );
    });
  };
};

const packFieldFor = (target: PackTarget): "packSeparately" | "packSeparatelyGn" =>
  target === "gn" ? "packSeparatelyGn" : "packSeparately";
const otherPackTarget = (target: PackTarget): PackTarget => (target === "gn" ? "zvlast" : "gn");

/**
 * Položky pre JEDEN z dvoch vzájomne sa vylučujúcich cieľov ("zvlášť" / "do GN").
 *
 * Objednaný počet aj počty diét sa pred výpočtom znížia o to, čo už drží ten
 * druhý cieľ - jedna porcia nemôže byť naraz "zvlášť" aj "zvlášť do GN", takže
 * zvyšný priestor pre TENTO cieľ je (objednané - už použité tým druhým). Zvyšok
 * funkcie (delené/zlúčené riadky pri diétach naviazaných na menu) je nezmenený.
 */
export const buildPackSeparatelyItems = (
  mealData: MealData | undefined,
  enabledCategories: string[],
  dietMenuVariantMap: Record<string, string>,
  target: PackTarget = "zvlast",
): PackSeparatelyItem[] =>
  CATEGORIES.filter(category => enabledCategories.includes(category)).flatMap((category) => {
    const categoryData = mealData?.[category];
    if (!categoryData) return [];

    const menuPackCounts = categoryData[packFieldFor(target)]?.menus || {};
    const dietPackCounts = categoryData[packFieldFor(target)]?.diets || {};
    const otherMenuPackCounts = categoryData[packFieldFor(otherPackTarget(target))]?.menus || {};
    const otherDietPackCounts = categoryData[packFieldFor(otherPackTarget(target))]?.diets || {};
    const effectiveMenuCounts = Object.fromEntries(
      Object.entries(categoryData.menuCounts || {}).map(
        ([key, count]) => [key, Math.max(0, count - (otherMenuPackCounts[key] || 0))],
      ),
    );
    const effectiveDiets = Object.fromEntries(
      Object.entries(categoryData.diets || {}).map(
        ([key, count]) => [key, Math.max(0, count - (otherDietPackCounts[key] || 0))],
      ),
    );
    const orderedDiets = Object.entries(effectiveDiets).filter(([, count]) => count > 0);
    const matchedDietKeys = new Set<string>();
    const dietRemainders: PackSeparatelyItem[] = [];

    const menuItems = Object.entries(effectiveMenuCounts)
      .filter(([, orderedCount]) => orderedCount > 0)
      .flatMap(([menuKey, menuOrderedCount]) => {
        const linkedDiet = orderedDiets.find(
          ([dietKey]) => !matchedDietKeys.has(dietKey) && dietMenuVariantMap[dietKey] === menuKey,
        );

        if (!linkedDiet) {
          return [{
            category,
            kind: "menus" as const,
            keyName: menuKey,
            orderedCount: menuOrderedCount,
            count: menuPackCounts[menuKey] || 0,
            target,
          }];
        }

        const [dietKey, dietOrderedCount] = linkedDiet;
        matchedDietKeys.add(dietKey);
        const mergedOrderedCount = Math.min(menuOrderedCount, dietOrderedCount);
        const menuRemainderCount = menuOrderedCount - mergedOrderedCount;
        const dietRemainderCount = dietOrderedCount - mergedOrderedCount;
        const mergedStoredCount = dietRemainderCount > 0
          ? menuPackCounts[menuKey] || 0
          : dietPackCounts[dietKey] || 0;
        const mergedCount = Math.min(mergedStoredCount, mergedOrderedCount);
        const items: PackSeparatelyItem[] = [{
          category,
          kind: "menus",
          keyName: menuKey,
          linkedDietKey: dietKey,
          linkedRow: "merged",
          orderedCount: mergedOrderedCount,
          count: mergedCount,
          target,
        }];

        if (menuRemainderCount > 0) {
          const remainderCount = Math.min(
            Math.max((menuPackCounts[menuKey] || 0) - mergedCount, 0),
            menuRemainderCount,
          );
          items.push({
            category,
            kind: "menus",
            keyName: menuKey,
            linkedDietKey: dietKey,
            linkedRow: "remainder",
            orderedCount: menuRemainderCount,
            count: remainderCount,
            target,
          });
        }

        if (dietRemainderCount > 0) {
          const remainderCount = Math.min(
            Math.max((dietPackCounts[dietKey] || 0) - mergedCount, 0),
            dietRemainderCount,
          );
          dietRemainders.push({
            category,
            kind: "diets",
            keyName: dietKey,
            linkedMenuKey: menuKey,
            linkedDietKey: dietKey,
            linkedRow: "remainder",
            orderedCount: dietRemainderCount,
            count: remainderCount,
            menuVariant: dietMenuVariantMap[dietKey],
            target,
          });
        }

        return items;
      });

    const unlinkedDietItems = orderedDiets
      .filter(([dietKey]) => !matchedDietKeys.has(dietKey))
      .map(([dietKey, orderedCount]) => ({
        category,
        kind: "diets" as const,
        keyName: dietKey,
        orderedCount,
        count: dietPackCounts[dietKey] || 0,
        // Keyed by current diet name; a renamed diet's hint silently disappears on older orders — acceptable, cosmetic only.
        menuVariant: dietMenuVariantMap[dietKey],
        target,
      }));

    return [...menuItems, ...dietRemainders, ...unlinkedDietItems];
  });

/** Položky pre OBIDVA ciele naraz - zdroj pravdy pre zoznamy, ktoré prepínajú tab. */
export const buildAllPackSeparatelyItems = (
  mealData: MealData | undefined,
  enabledCategories: string[],
  dietMenuVariantMap: Record<string, string>,
): PackSeparatelyItem[] => [
  ...buildPackSeparatelyItems(mealData, enabledCategories, dietMenuVariantMap, "zvlast"),
  ...buildPackSeparatelyItems(mealData, enabledCategories, dietMenuVariantMap, "gn"),
];
