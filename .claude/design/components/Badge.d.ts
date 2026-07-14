import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Accent tone. Default `green`. */
  tone?: "green" | "peach" | "teal" | "honey" | "coral" | "orange" | "gray";
  /** Optional leading icon element. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Small status / category pill using the brand accent palette. */
export function Badge(props: BadgeProps): JSX.Element;
