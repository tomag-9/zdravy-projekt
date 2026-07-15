import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Header title. Renders the header row when provided. */
  title?: React.ReactNode;
  /** Header subtitle under the title. */
  subtitle?: React.ReactNode;
  /** Right-aligned header actions slot (e.g. a Button). */
  actions?: React.ReactNode;
  /** Pad the body. Default true. Set false for full-bleed content (tables). */
  pad?: boolean;
  /** Extra style for the inner body wrapper. */
  bodyStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Cream surface container with optional header and padded body. */
export function Card(props: CardProps): JSX.Element;
