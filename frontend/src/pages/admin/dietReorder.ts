export interface ReorderableDiet {
  id: number;
  sort_order: number;
}

export const moveDietBefore = <T extends ReorderableDiet>(
  diets: T[],
  draggedId: number,
  targetId: number,
): T[] => {
  if (draggedId === targetId) return diets;
  const moved = diets.find((diet) => diet.id === draggedId);
  if (!moved || !diets.some((diet) => diet.id === targetId)) return diets;

  const withoutMoved = diets.filter((diet) => diet.id !== draggedId);
  const targetIndex = withoutMoved.findIndex((diet) => diet.id === targetId);
  withoutMoved.splice(targetIndex, 0, moved);
  return withoutMoved.map((diet, index) => ({ ...diet, sort_order: index + 1 }));
};

/**
 * Posunie diétu o `delta` pozícií (−1 vyššie, +1 nižšie).
 *
 * Existuje popri `moveDietBefore`, ktoré obsluhuje ťahanie myšou: HTML5 drag &
 * drop sa na dotykovom displeji nespustí, takže na mobile je toto jediný spôsob,
 * ako poradie diét zmeniť. Mimo rozsah zoznamu vracia pôvodné pole (identita sa
 * zachová, takže volajúci vie preskočiť zbytočný zápis).
 */
export const moveDietBy = <T extends ReorderableDiet>(
  diets: T[],
  dietId: number,
  delta: number,
): T[] => {
  const index = diets.findIndex((diet) => diet.id === dietId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= diets.length) return diets;

  const next = [...diets];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((diet, position) => ({ ...diet, sort_order: position + 1 }));
};

export const dietReorderPayload = (diets: ReorderableDiet[]) => ({
  diets: diets.map((diet, index) => ({ id: diet.id, sort_order: index + 1 })),
});
