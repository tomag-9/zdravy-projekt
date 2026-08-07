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

export const dietReorderPayload = (diets: ReorderableDiet[]) => ({
  diets: diets.map((diet, index) => ({ id: diet.id, sort_order: index + 1 })),
});
