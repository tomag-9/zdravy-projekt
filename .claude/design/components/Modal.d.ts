import * as React from "react";

export interface ModalProps {
  /** Header title. */
  title?: React.ReactNode;
  /** Called when the scrim or close button is clicked. Omit to hide the close button. */
  onClose?: () => void;
  /** Footer actions slot (typically Buttons). */
  footer?: React.ReactNode;
  /** Wider dialog (620px vs 480px). */
  wide?: boolean;
  /** Optional icon badge shown above the body. */
  icon?: React.ReactNode;
  /** Icon badge tone. Default `danger`. */
  iconTone?: "danger" | "green";
  children?: React.ReactNode;
}

/** Centered dialog on a blurred scrim, with optional title, icon and footer. */
export function Modal(props: ModalProps): JSX.Element;
