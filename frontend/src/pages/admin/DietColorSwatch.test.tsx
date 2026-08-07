import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DietColorSwatch } from "./DietColorSwatch";

afterEach(cleanup);

describe("DietColorSwatch", () => {
  it("renders the diet fallback color when there are no base colors", () => {
    render(<DietColorSwatch color="#2563EB" />);

    expect(screen.getByTestId("diet-color-swatch")).toHaveStyle({ background: "#2563EB" });
  });

  it("renders equal conic-gradient segments for base diet colors", () => {
    render(<DietColorSwatch color="#000000" baseColors={["#2563EB", "#F59E0B"]} />);

    expect(screen.getByTestId("diet-color-swatch").getAttribute("style")).toContain(
      "conic-gradient(#2563EB 0% 50%, #F59E0B 50% 100%)",
    );
  });
});
