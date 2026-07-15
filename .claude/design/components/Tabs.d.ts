import * as React from "react";

export interface TabItem {
  id: string;
  label: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Id of the active tab. */
  active?: string;
  /** Called with the id of the clicked tab. */
  onChange?: (id: string) => void;
  /** Equal-width tabs (default true); false sizes to content. */
  fit?: boolean;
  style?: React.CSSProperties;
}

/** Underline tab bar (controlled). */
export function Tabs(props: TabsProps): JSX.Element;
