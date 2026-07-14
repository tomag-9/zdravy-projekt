import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name — initials are derived from the first two words. */
  name?: string;
  /** Brand gradient tone. Default `green`. */
  tone?: "green" | "peach" | "teal";
  /** Named size or an explicit pixel diameter. Default `md`. */
  size?: "sm" | "md" | "lg" | number;
}

/** Round initials badge with a brand gradient. */
export function Avatar(props: AvatarProps): JSX.Element;
