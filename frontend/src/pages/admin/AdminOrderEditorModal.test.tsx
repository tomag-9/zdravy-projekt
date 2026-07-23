import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactNode } from 'react';
import AdminOrderEditorModal from './AdminOrderEditorModal';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();

vi.mock('../../context/auth', () => ({
    useAuth: vi.fn(() => ({ apiFetch: mockApiFetch })),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../context/ToastContext', () => ({
    useToast: vi.fn(() => ({
        success: mockToastSuccess,
        error: mockToastError,
        warning: vi.fn(),
        info: vi.fn(),
    })),
    ToastProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Keep real OrderService so data-structure helpers work correctly.
// Only mock DietSelector to avoid its internal portal / focus logic in tests.
vi.mock('../client/components/order/DietSelector', () => ({
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
        isOpen ? (
            <div data-testid="diet-selector">
                <button onClick={onClose}>Hotovo</button>
            </div>
        ) : null,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeMockResponse = (payload: unknown, ok = true) => ({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(JSON.stringify(payload)),
    clone() { return makeMockResponse(payload, ok); },
});

const ALL_DIETS = [
    { id: 1, name: 'Bez lepku' },
    { id: 2, name: 'Vegetariánske' },
];

const BASE_PROPS = {
    clientId: '42',
    prevadzkaId: '99',
    visibleMenus: ['A', 'B'],
    visibleMeals: ['breakfast', 'lunch', 'olovrant'],
    visibleDiets: [1],
    portionTypeNames: ['Jasle', 'Škôlka', 'ZŠ 1.stupeň', 'ZŠ 2.stupeň', 'Dospelý (SŠ)'],
    packSeparatelyEnabled: false,
    allDiets: ALL_DIETS,
    existingOrder: null,
    onClose: vi.fn(),
    onSaved: vi.fn(),
};

const getRequestBody = () => {
    const saveCall = mockApiFetch.mock.calls.find(([, options]) =>
        options?.method === 'PATCH' || options?.method === 'POST',
    );
    expect(saveCall).toBeTruthy();
    return JSON.parse(String(saveCall?.[1]?.body));
};

const getCategoryCard = (label: string) => {
    const title = screen.getByText(label);
    const card = title.closest('.zp-cat');
    expect(card).toBeTruthy();
    return card as HTMLElement;
};

const clickFirstPlus = (label: string) => {
    const card = getCategoryCard(label);
    const buttons = within(card).getAllByRole('button', { name: '+' });
    fireEvent.click(buttons[0]);
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminOrderEditorModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders create mode with date input and save button', () => {
        render(<AdminOrderEditorModal {...BASE_PROPS} />);

        expect(screen.getByText('Nová objednávka')).toBeInTheDocument();
        expect(screen.getByLabelText(/dátum objednávky/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /uložiť/i })).toBeInTheDocument();
    });

    it('renders edit mode without date input', () => {
        render(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                existingOrder={{ id: 7, date: '2099-03-01', data: {} }}
            />,
        );

        expect(screen.getByText('Upraviť objednávku')).toBeInTheDocument();
        expect(screen.getByText('2099-03-01')).toBeInTheDocument();
        expect(screen.queryByLabelText(/dátum objednávky/i)).not.toBeInTheDocument();
    });

    it('calls onClose when Zrušiť is clicked', () => {
        render(<AdminOrderEditorModal {...BASE_PROPS} />);
        fireEvent.click(screen.getByRole('button', { name: /zrušiť/i }));
        expect(BASE_PROPS.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when ✕ icon button is clicked', () => {
        render(<AdminOrderEditorModal {...BASE_PROPS} />);
        // The X button in the header carries the accessible label "Zavrieť".
        const closeBtn = screen.getByRole('button', { name: /zavrieť/i });
        expect(closeBtn).toBeTruthy();
        fireEvent.click(closeBtn);
        expect(BASE_PROPS.onClose).toHaveBeenCalledTimes(1);
    });

    it('POSTs with prevadzka when creating a new order', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 10, date: '2099-05-01', data: {} }, true));

        render(<AdminOrderEditorModal {...BASE_PROPS} />);

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            expect(mockApiFetch).toHaveBeenCalledWith(
                expect.stringContaining('/orders/?user_id=42'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"prevadzka":"99"'),
                }),
            );
        });

        expect(mockToastSuccess).toHaveBeenCalledWith('Objednávka bola vytvorená.');
        expect(BASE_PROPS.onSaved).toHaveBeenCalledTimes(1);
    });

    it('POSTs with prevadzka without user_id when facility has no login', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 11, date: '2099-05-02', data: {} }, true));

        render(<AdminOrderEditorModal {...BASE_PROPS} clientId={null} />);

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            expect(mockApiFetch).toHaveBeenCalledWith(
                expect.stringContaining('/orders/'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"prevadzka":"99"'),
                }),
            );
        });

        expect(mockApiFetch.mock.calls[0][0]).not.toContain('user_id=');
        expect(mockToastSuccess).toHaveBeenCalledWith('Objednávka bola vytvorená.');
        expect(BASE_PROPS.onSaved).toHaveBeenCalledTimes(1);
    });

    it('PATCHes through prevadzka when editing an existing order', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 7 }, true));

        render(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                existingOrder={{ id: 7, date: '2099-03-01', data: {} }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            expect(mockApiFetch).toHaveBeenCalledWith(
                expect.stringContaining('/orders/7/?prevadzka=99'),
                expect.objectContaining({
                    method: 'PATCH',
                    body: expect.stringContaining('"prevadzka":"99"'),
                }),
            );
        });

        expect(mockToastSuccess).toHaveBeenCalledWith('Objednávka bola uložená.');
        expect(BASE_PROPS.onSaved).toHaveBeenCalledTimes(1);
    });

    it('preserves packSeparately data when editing an existing order', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 7 }, true));

        render(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                existingOrder={{
                    id: 7,
                    date: '2099-03-01',
                    data: {
                        lunch: {
                            Škôlka: {
                                menuCounts: { A: 2, B: 0 },
                                diets: { 'Bez lepku': 0 },
                                packSeparately: { menus: { A: 1 }, diets: {} },
                            },
                        },
                    },
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            const patchCall = mockApiFetch.mock.calls.find(([url, options]) =>
                String(url).includes('/orders/7/') && options?.method === 'PATCH',
            );
            expect(patchCall).toBeTruthy();
            const body = JSON.parse(String(patchCall?.[1]?.body));
            expect(body.data.lunch.Škôlka.packSeparately).toEqual({ menus: { A: 1 }, diets: {} });
        });
    });

    it('shows error toast and does not call onSaved when API fails', async () => {
        mockApiFetch.mockRejectedValueOnce(new Error('network error'));

        render(<AdminOrderEditorModal {...BASE_PROPS} />);

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith('Nepodarilo sa uložiť objednávku.');
        });

        expect(BASE_PROPS.onSaved).not.toHaveBeenCalled();
    });

    it('shows API error message when POST returns 400', async () => {
        mockApiFetch.mockResolvedValueOnce(
            makeMockResponse(
                {
                    error: {
                        message: 'Objednávka na tento dátum už existuje.',
                        details: { date: ['Objednávka na tento dátum už existuje.'] },
                    },
                },
                false,
            ),
        );

        render(<AdminOrderEditorModal {...BASE_PROPS} />);

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith('Objednávka na tento dátum už existuje.');
        });

        expect(BASE_PROPS.onSaved).not.toHaveBeenCalled();
    });

    it('renders all three meal cards', () => {
        render(<AdminOrderEditorModal {...BASE_PROPS} />);
        expect(screen.getByText('Raňajky')).toBeInTheDocument();
        expect(screen.getByText('Obed')).toBeInTheDocument();
        expect(screen.getByText('Olovrant')).toBeInTheDocument();
    });

    it('respects visibleMeals prop and hides excluded meals', () => {
        render(<AdminOrderEditorModal {...BASE_PROPS} visibleMeals={['lunch']} />);
        expect(screen.queryByText('Raňajky')).not.toBeInTheDocument();
        expect(screen.getByText('Obed')).toBeInTheDocument();
        expect(screen.queryByText('Olovrant')).not.toBeInTheDocument();
    });

    it('renders a category present in the order but absent from the hardcoded list and preserves it in the PATCH payload', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 7 }, true));

        render(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                existingOrder={{
                    id: 7,
                    date: '2026-07-30',
                    data: {
                        lunch: {
                            Predškolák: {
                                menuCounts: { A: 2 },
                                diets: { 'Bez lepku': 0, 'Špeciálna': 0 },
                            },
                        },
                    },
                }}
            />,
        );

        expect(screen.getByText('Predškolák')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            const body = getRequestBody();
            expect(body.data.lunch.Predškolák.menuCounts.A).toBe(2);
        });
    });

    it('preserves special_diet_note in the PATCH payload when saving without editing it', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 7 }, true));

        render(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                existingOrder={{
                    id: 7,
                    date: '2026-07-30',
                    data: {
                        lunch: {
                            Škôlka: {
                                menuCounts: { A: 1 },
                                diets: { 'Bez lepku': 0, 'Špeciálna': 0 },
                            },
                        },
                        special_diet_note: 'Bez paradajok',
                    },
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            const body = getRequestBody();
            expect(body.data.special_diet_note).toBe('Bez paradajok');
        });
    });

    it('updates special_diet_note in the saved payload when the textarea is edited', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 7 }, true));

        render(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                existingOrder={{ id: 7, date: '2026-07-30', data: {} }}
            />,
        );

        fireEvent.change(screen.getByLabelText(/poznámka k špeciálnej diéte/i), {
            target: { value: 'Bez mlieka a vajec' },
        });
        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            const body = getRequestBody();
            expect(body.data.special_diet_note).toBe('Bez mlieka a vajec');
        });
    });

    it('renders pack-separately UI only when enabled and saves changes under packSeparately', async () => {
        mockApiFetch.mockResolvedValue(makeMockResponse({ id: 7 }, true));

        const existingOrder = {
            id: 7,
            date: '2026-07-30',
            data: {
                lunch: {
                    Škôlka: {
                        menuCounts: { A: 2, B: 0 },
                        diets: { 'Bez lepku': 1, 'Špeciálna': 0 },
                    },
                },
            },
        };

        const { rerender } = render(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                packSeparatelyEnabled={false}
                existingOrder={existingOrder}
            />,
        );

        expect(screen.queryByText('Zabaliť zvlášť')).not.toBeInTheDocument();

        rerender(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                packSeparatelyEnabled={true}
                existingOrder={existingOrder}
            />,
        );

        expect(screen.getByText('Zabaliť zvlášť')).toBeInTheDocument();

        // Karta je zbalená, kým nie je nič označené, takže tlačidlo „Pridať výnimku“
        // ešte neexistuje — selector sa otvára prepínačom v hlavičke karty (rovnako
        // ako na klientskej strane).
        fireEvent.click(screen.getByRole('switch', { name: /Zabaliť zvlášť - prepnúť/i }));

        // „+“ je aj v riadkoch kategórií, tak sa držíme vnútra otvoreného selectora.
        const sheet = screen.getByRole('heading', { name: 'Pridať výnimku' }).closest('.zp-sheet') as HTMLElement;
        const row = within(sheet).getByText(/Škôlka · Menu A/i).closest('.zp-diet-row') as HTMLElement;
        fireEvent.click(within(row).getByLabelText('+'));
        fireEvent.click(within(sheet).getByLabelText('Zavrieť'));
        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            const body = getRequestBody();
            // `cleanupPackSeparately` zahodí celý objekt až keď sú prázdne obe vetvy,
            // takže prázdne `diets` tu zostáva.
            expect(body.data.lunch.Škôlka.packSeparately).toEqual({ menus: { A: 1 }, diets: {} });
        });
    });

    it('replicates the single full-day MealData into every visible meal in the saved payload', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 7 }, true));

        render(
            <AdminOrderEditorModal
                {...BASE_PROPS}
                visibleMeals={['breakfast', 'olovrant']}
                existingOrder={{ id: 7, date: '2026-07-30', data: {} }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /celý deň rovnaký/i }));
        clickFirstPlus('Škôlka');
        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            const body = getRequestBody();
            expect(body.data.breakfast.Škôlka.menuCounts.A).toBe(1);
            expect(body.data.olovrant.Škôlka.menuCounts.A).toBe(1);
            expect(body.data.lunch.Škôlka.menuCounts.A).toBe(0);
        });
    });
});
