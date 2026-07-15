import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual tone. Default `primary`. */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "honey";
  /** Padding + font-size scale. Default `md`. */
  size?: "sm" | "md" | "lg";
  /** Optional leading icon element (e.g. a Lucide SVG). */
  icon?: React.ReactNode;
  /** Corner style. Default `pill`. */
  shape?: "pill" | "rounded";
  /** Stretch to fill the container width. */
  full?: boolean;
  children?: React.ReactNode;
}

/** Pill-shaped brand button with tone and size variants. */
export function Button(props: ButtonProps): JSX.Element;
