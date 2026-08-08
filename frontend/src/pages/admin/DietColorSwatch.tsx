import React from "react";

interface DietColorSwatchProps {
  color?: string;
  baseColors?: string[];
  size?: number;
}

const dietSwatchBackground = (color?: string, baseColors: string[] = []): string => {
  const colors = baseColors.filter(Boolean);
  if (colors.length === 0) return color || "#FDE68A";
  if (colors.length === 1) return colors[0];

  const segmentSize = 100 / colors.length;
  const segments = colors.map((segmentColor, index) => {
    const start = index * segmentSize;
    const end = (index + 1) * segmentSize;
    return `${segmentColor} ${start}% ${end}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
};

export const DietColorSwatch: React.FC<DietColorSwatchProps> = ({ color, baseColors = [], size = 18 }) => (
  <span
    data-testid="diet-color-swatch"
    aria-hidden="true"
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: 999,
      background: dietSwatchBackground(color, baseColors),
      boxShadow: "inset 0 0 0 1px rgba(39, 52, 34, 0.18)",
      flex: `0 0 ${size}px`,
    }}
  />
);
