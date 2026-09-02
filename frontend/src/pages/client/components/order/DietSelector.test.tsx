import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DietSelector from "./DietSelector";

describe("DietSelector", () => {
    // Admin/klient prehliada uloženú objednávku, ktorá obsahuje diétu mimo
    // aktuálne povolených (`enabledDiets`) — dôvod je jedno (vypnutá po
    // vytvorení objednávky, kategória ju obmedzuje, alebo ju takto priniesol
    // EduPage scrape). Riadok sa musí aj tak zobraziť, inak sa s ňou nedá v
    // modáli pracovať (nejde vidieť ani vynulovať).
    it("zobrazí diétu s nenulovým počtom aj keď nie je v enabledDiets", () => {
        render(
            <DietSelector
                isOpen={true}
                onClose={() => {}}
                categoryLabel="Škôlka"
                diets={{ Bezlepková: 2, Vypnutá: 3 }}
                enabledDiets={["Bezlepková"]}
                onUpdateDiet={() => {}}
            />,
        );

        expect(screen.getByText("Vypnutá")).toBeInTheDocument();
        expect(screen.getByLabelText("Počet diéty Vypnutá")).toHaveValue("3");
    });

    it("nezobrazí diétu s nulovým počtom, ak nie je v enabledDiets", () => {
        render(
            <DietSelector
                isOpen={true}
                onClose={() => {}}
                categoryLabel="Škôlka"
                diets={{ Bezlepková: 2, Vypnutá: 0 }}
                enabledDiets={["Bezlepková"]}
                onUpdateDiet={() => {}}
            />,
        );

        expect(screen.queryByText("Vypnutá")).not.toBeInTheDocument();
    });

    it("umožní vynulovať dodatočne dopísanú diétu", () => {
        const onUpdateDiet = vi.fn();
        render(
            <DietSelector
                isOpen={true}
                onClose={() => {}}
                categoryLabel="Škôlka"
                diets={{ Vypnutá: 3 }}
                enabledDiets={[]}
                onUpdateDiet={onUpdateDiet}
            />,
        );

        fireEvent.click(screen.getByLabelText("−"));
        expect(onUpdateDiet).toHaveBeenCalledWith("Vypnutá", 2);
    });
});
