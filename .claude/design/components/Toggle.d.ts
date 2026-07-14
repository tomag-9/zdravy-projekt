import * as React from "react";

export interface ToggleProps {
  /** Current on/off state (controlled). */
  on?: boolean;
  /** Called with the next boolean when toggled. */
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/** Brand switch control. */
export function Toggle(props: ToggleProps): JSX.Element;
