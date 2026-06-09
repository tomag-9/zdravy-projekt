import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmationModal from './ConfirmationModal';

describe('ConfirmationModal', () => {
    it('renders as a labelled dialog and focuses the cancel action', async () => {
        render(
            <ConfirmationModal
                isOpen
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                title="Vymazať objednávku"
                description="Naozaj chcete vymazať celú objednávku?"
                confirmText="Vymazať"
            />
        );

        const dialog = screen.getByRole('dialog', { name: 'Vymazať objednávku' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByText('Naozaj chcete vymazať celú objednávku?')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole('button', { name: 'Zrušiť' })).toHaveFocus());
    });

    it('closes on Escape and keeps keyboard focus inside the dialog', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(
            <ConfirmationModal
                isOpen
                onClose={onClose}
                onConfirm={vi.fn()}
                title="Potvrdenie"
                description="Pokračovať?"
            />
        );

        await user.tab({ shift: true });
        expect(screen.getByRole('button', { name: 'Potvrdiť' })).toHaveFocus();

        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
