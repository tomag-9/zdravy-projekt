import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    visibleMenus: ['A', 'B'],
    visibleMeals: ['breakfast', 'lunch', 'olovrant'],
    visibleDiets: [1],
    allDiets: ALL_DIETS,
    existingOrder: null,
    onClose: vi.fn(),
    onSaved: vi.fn(),
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

    it('POSTs to /orders/?user_id=42 when creating a new order', async () => {
        mockApiFetch.mockResolvedValueOnce(makeMockResponse({ id: 10, date: '2099-05-01', data: {} }, true));

        render(<AdminOrderEditorModal {...BASE_PROPS} />);

        fireEvent.click(screen.getByRole('button', { name: /uložiť/i }));

        await waitFor(() => {
            expect(mockApiFetch).toHaveBeenCalledWith(
                expect.stringContaining('/orders/?user_id=42'),
                expect.objectContaining({ method: 'POST' }),
            );
        });

        expect(mockToastSuccess).toHaveBeenCalledWith('Objednávka bola vytvorená.');
        expect(BASE_PROPS.onSaved).toHaveBeenCalledTimes(1);
    });

    it('PATCHes to /orders/7/?user_id=42 when editing an existing order', async () => {
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
                expect.stringContaining('/orders/7/?user_id=42'),
                expect.objectContaining({ method: 'PATCH' }),
            );
        });

        expect(mockToastSuccess).toHaveBeenCalledWith('Objednávka bola uložená.');
        expect(BASE_PROPS.onSaved).toHaveBeenCalledTimes(1);
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
});
