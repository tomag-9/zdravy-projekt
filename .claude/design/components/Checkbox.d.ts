import * as React from "react";

export interface CheckboxProps {
  /** Checked state. */
  on?: boolean;
  /** Called with the next boolean when toggled. */
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Label content shown next to the box. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Labelled brand checkbox (controlled). */
export function Checkbox(props: CheckboxProps): JSX.Element;
