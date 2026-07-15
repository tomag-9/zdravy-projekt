import * as React from "react";

export interface PageHeadProps {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title: React.ReactNode;
  /** Supporting description under the title. */
  desc?: React.ReactNode;
  /** Right-aligned actions (buttons). */
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Screen header with eyebrow, title, description and an actions slot. */
export function PageHead(props: PageHeadProps): JSX.Element;
