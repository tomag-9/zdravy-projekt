import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SystemSettings from './SystemSettings';

// Mock the auth context
const mockApiFetch = vi.fn();
vi.mock('../../context/auth', () => ({
    useAuth: () => ({
        apiFetch: mockApiFetch,
    }),
}));

// Mock the toast context
const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock('../../context/ToastContext', () => ({
    useToast: () => ({
        success: mockSuccess,
        error: mockError,
    }),
}));

describe('SystemSettings - Report Recipients Auto-Save', () => {
    const mockSettings = {
        deadline_breakfast: '10:00',
        deadline_lunch: '10:00',
        deadline_olovrant: '10:00',
        report_email_recipients: ['existing@example.com'],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock initial fetch
        mockApiFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockSettings,
        });
    });

    it('auto-saves when adding a new recipient', async () => {
        const user = userEvent.setup();
        render(<SystemSettings />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('existing@example.com')).toBeInTheDocument();
        });

        // Find the email input and add button
        const emailInput = screen.getByPlaceholderText('email@priklad.sk');
        const addButton = screen.getByText('Pridať');

        // Type new email
        await user.type(emailInput, 'newrecipient@example.com');
        
        // Mock the save response
        mockApiFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                ...mockSettings,
                report_email_recipients: ['existing@example.com', 'newrecipient@example.com'],
            }),
        });

        // Click add button
        await user.click(addButton);

        // Verify auto-save was called
        await waitFor(() => {
            expect(mockApiFetch).toHaveBeenCalledTimes(2); // Initial fetch + save
            const saveCall = mockApiFetch.mock.calls[1];
            expect(saveCall[0]).toContain('/admin/global-settings/');
            expect(saveCall[1].method).toBe('POST');
            const body = JSON.parse(saveCall[1].body);
            expect(body.report_email_recipients).toContain('newrecipient@example.com');
        });

        // Verify success message
        expect(mockSuccess).toHaveBeenCalledWith('Príjemca bol úspešne pridaný');
    });

    it('auto-saves when removing a recipient', async () => {
        const user = userEvent.setup();
        render(<SystemSettings />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('existing@example.com')).toBeInTheDocument();
        });

        // Mock the save response
        mockApiFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                ...mockSettings,
                report_email_recipients: [],
            }),
        });

        // Click remove button
        const removeButton = screen.getByText('Odstrániť');
        await user.click(removeButton);

        // Verify auto-save was called
        await waitFor(() => {
            expect(mockApiFetch).toHaveBeenCalledTimes(2); // Initial fetch + save
            const saveCall = mockApiFetch.mock.calls[1];
            expect(saveCall[0]).toContain('/admin/global-settings/');
            expect(saveCall[1].method).toBe('POST');
            const body = JSON.parse(saveCall[1].body);
            expect(body.report_email_recipients).toEqual([]);
        });

        // Verify success message
        expect(mockSuccess).toHaveBeenCalledWith('Príjemca bol úspešne odstránený');
    });

    it('reverts state on save error when adding recipient', async () => {
        const user = userEvent.setup();
        render(<SystemSettings />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('existing@example.com')).toBeInTheDocument();
        });

        const emailInput = screen.getByPlaceholderText('email@priklad.sk');
        const addButton = screen.getByText('Pridať');

        await user.type(emailInput, 'newrecipient@example.com');
        
        // Mock save error
        mockApiFetch.mockResolvedValueOnce({
            ok: false,
        });

        await user.click(addButton);

        // Verify error message
        await waitFor(() => {
            expect(mockError).toHaveBeenCalledWith('Chyba pri pridávaní príjemcu');
        });

        // Verify only the original recipient is shown
        expect(screen.getByText('existing@example.com')).toBeInTheDocument();
        expect(screen.queryByText('newrecipient@example.com')).not.toBeInTheDocument();
    });

    it('validates email format before adding', async () => {
        const user = userEvent.setup();
        render(<SystemSettings />);

        await waitFor(() => {
            expect(screen.getByText('existing@example.com')).toBeInTheDocument();
        });

        const emailInput = screen.getByPlaceholderText('email@priklad.sk');
        const addButton = screen.getByText('Pridať');

        // Try to add invalid email
        await user.type(emailInput, 'invalid-email');
        await user.click(addButton);

        // Verify error message and no save call
        expect(mockError).toHaveBeenCalledWith('Neplatná e-mailová adresa');
        expect(mockApiFetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });

    it('prevents adding duplicate recipients', async () => {
        const user = userEvent.setup();
        render(<SystemSettings />);

        await waitFor(() => {
            expect(screen.getByText('existing@example.com')).toBeInTheDocument();
        });

        const emailInput = screen.getByPlaceholderText('email@priklad.sk');
        const addButton = screen.getByText('Pridať');

        // Try to add existing email
        await user.type(emailInput, 'existing@example.com');
        await user.click(addButton);

        // Verify error message and no save call
        expect(mockError).toHaveBeenCalledWith('Táto adresa je už v zozname');
        expect(mockApiFetch).toHaveBeenCalledTimes(1); // Only initial fetch
    });
});
