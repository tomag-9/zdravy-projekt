import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminDateNav, Dropdown, Input } from "./ui";

describe("AdminDateNav", () => {
  it("uses muted states for history, locked and upcoming dates", () => {
    // `is-history`/`is-upcoming` sú relatívne k reálnemu dnešku
    // (`useTodayKey` číta `new Date()`) — bez zafixovania hodín test
    // časom prestane platiť (padlo to 16.9.2026, keď "dnešok" prešiel
    // cez hardcoded "15. septembra").
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T12:00:00"));

    const onChange = vi.fn();
    render(
      <AdminDateNav
        date="2026-09-11"
        maxDate="2026-09-15"
        onChange={onChange}
        dataDates={new Set(["2026-09-09"])}
        closedDates={new Set(["2026-09-10"])}
        unavailableDates={new Set(["2026-09-14"])}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vybrať dátum" }));

    expect(screen.getByRole("dialog", { name: "Výber dátumu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "11. septembra 2026" })).toHaveClass("is-selected");
    expect(screen.getByRole("button", { name: "9. septembra 2026" })).toHaveClass("is-history");
    expect(screen.getByRole("button", { name: "10. septembra 2026" })).toHaveClass("is-locked");
    expect(screen.getByRole("button", { name: "14. septembra 2026" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "13. septembra 2026" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15. septembra 2026" })).toHaveClass("is-upcoming");

    fireEvent.click(screen.getByRole("button", { name: "15. septembra 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-09-15");

    vi.useRealTimers();
  });

  it("closes when the user clicks outside it or presses Escape", () => {
    render(<AdminDateNav date="2026-09-11" maxDate="2026-09-15" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Vybrať dátum" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Výber dátumu" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Vybrať dátum" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Výber dátumu" })).not.toBeInTheDocument();
  });
});

describe("Dropdown", () => {
  it("opens a styled option list and returns the selected value", () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        aria-label="Typ jedla"
        value="lunch"
        onChange={onChange}
        options={[
          { value: "breakfast", label: "Raňajky" },
          { value: "lunch", label: "Obed" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Typ jedla" }));
    expect(screen.getByRole("listbox", { name: "Typ jedla" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Raňajky" }));
    expect(onChange).toHaveBeenCalledWith("breakfast");
  });

  it("closes when the user clicks outside it or presses Escape", () => {
    render(<Dropdown aria-label="Typ jedla" value="lunch" onChange={vi.fn()} options={[{ value: "lunch", label: "Obed" }]} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Typ jedla" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox", { name: "Typ jedla" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Typ jedla" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Typ jedla" })).not.toBeInTheDocument();
  });
});

describe("Input type=date", () => {
  it("uses the shared calendar instead of the browser date popup", () => {
    const onChange = vi.fn();
    render(<Input type="date" aria-label="Dátum voľna" value="2026-09-11" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Dátum voľna" }));
    expect(screen.getByRole("dialog", { name: "Výber dátumu" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "15. septembra 2026" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: "2026-09-15" } }));
  });
});
