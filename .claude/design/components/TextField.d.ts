import * as React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface TextFieldProps {
  /** Uppercase field label. */
  label?: React.ReactNode;
  /** Muted inline hint appended to the label. */
  hint?: React.ReactNode;
  /** Show the required asterisk. */
  required?: boolean;
  /** Render a <textarea> instead of an input. */
  multiline?: boolean;
  /** When provided, renders a <select> with these options. */
  options?: Array<string | SelectOption> | null;
  value?: string | number;
  placeholder?: string;
  type?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  style?: React.CSSProperties;
}

/** Labelled form control (input / textarea / select) with the brand focus ring. */
export function TextField(props: TextFieldProps): JSX.Element;
