import * as React from "react";

export interface SearchBoxProps {
  value?: string;
  /** Called with the current text on every keystroke. */
  onChange?: (text: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

/** Search input with a leading magnifier icon and brand focus ring. */
export function SearchBox(props: SearchBoxProps): JSX.Element;
