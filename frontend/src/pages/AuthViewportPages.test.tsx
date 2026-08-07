import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import SetPasswordPage from "./SetPasswordPage";

const mockUseStableViewportHeight = vi.fn();

vi.mock("../hooks/useStableViewportHeight", () => ({
  useStableViewportHeight: () => mockUseStableViewportHeight(),
}));

describe("authentication page viewport sizing", () => {
  beforeEach(() => {
    mockUseStableViewportHeight.mockClear();
  });

  it.each([
    ["forgot password", ForgotPasswordPage, "/forgot-password"],
    ["reset password", ResetPasswordPage, "/reset-password?token=test"],
    ["set password", SetPasswordPage, "/set-password?token=test"],
  ])("uses the stable app height on %s", (_name, Page, route) => {
    const view = render(
      <MemoryRouter initialEntries={[route]}>
        <Page />
      </MemoryRouter>,
    );

    expect(mockUseStableViewportHeight).toHaveBeenCalledOnce();
    expect(view.container.firstElementChild).toHaveClass("zp-app--login");
  });
});
