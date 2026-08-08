import { useRef } from "react";
import { CATEGORIES } from "../../config/constants";
import type { MealData } from "../../services/OrderService";

export type PackSeparatelyItem = {
  category: string;
  kind: "menus" | "diets";
  keyName: string;
  orderedCount: number;
  count: number;
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
};

export const getPackSeparatelyUpdates = (
  currentItems: PackSeparatelyItem[],
  item: PackSeparatelyItem,
  count: number,
): PackSeparatelyUpdate[] => {
  const linkedMenuKey = item.linkedMenuKey || (item.kind === "menus" ? item.keyName : undefined);
  const linkedDietKey = item.linkedDietKey || (item.kind === "diets" ? item.keyName : undefined);
  if (!linkedMenuKey || !linkedDietKey || !item.linkedRow) {
    return [{ kind: item.kind, key: item.keyName, count }];
  }

  const counterpart = currentItems.find((candidate) => {
    const candidateMenuKey = candidate.linkedMenuKey
      || (candidate.kind === "menus" ? candidate.keyName : undefined);
    const candidateDietKey = candidate.linkedDietKey
      || (candidate.kind === "diets" ? candidate.keyName : undefined);
    return candidate.category === item.category
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
      },
      {
        kind: "diets",
        key: linkedDietKey,
        count: count + (counterpart?.kind === "diets" ? counterpartCount : 0),
      },
    ];
  }

  return [{ kind: item.kind, key: item.keyName, count: counterpartCount + count }];
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
      );
    });
  };
};

export const buildPackSeparatelyItems = (
  mealData: MealData | undefined,
  enabledCategories: string[],
  dietMenuVariantMap: Record<string, string>,
): PackSeparatelyItem[] =>
  CATEGORIES.filter(category => enabledCategories.includes(category)).flatMap((category) => {
    const categoryData = mealData?.[category];
    if (!categoryData) return [];

    const menuPackCounts = categoryData.packSeparately?.menus || {};
    const dietPackCounts = categoryData.packSeparately?.diets || {};
    const orderedDiets = Object.entries(categoryData.diets || {}).filter(([, count]) => count > 0);
    const matchedDietKeys = new Set<string>();
    const dietRemainders: PackSeparatelyItem[] = [];

    const menuItems = Object.entries(categoryData.menuCounts || {})
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
      }));

    return [...menuItems, ...dietRemainders, ...unlinkedDietItems];
  });
