import * as React from "react";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Description under / beside the number. */
  label?: React.ReactNode;
  /** The metric itself. */
  value: React.ReactNode;
  /** Optional leading slot — an icon, badge or level chip. */
  lead?: React.ReactNode;
}

/** Compact metric surface: a big number with a label and optional lead slot. */
export function StatCard(props: StatCardProps): JSX.Element;
