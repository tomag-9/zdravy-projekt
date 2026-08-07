import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrevadzkaOverview from './PrevadzkaOverview';

const mockApiFetch = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('../../context/auth', () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ error: mockToastError, success: mockToastSuccess }),
}));

const jsonResponse = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(payload),
  blob: () => Promise.resolve(new Blob(['report'])),
});

const overviewResponse = jsonResponse({ date: '2026-08-07', edupage: [], app: [] });

describe('PrevadzkaOverview closed day controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:report') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  it('shows Uzamknúť for an open date and closes it after confirmation', async () => {
    let closed = false;
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/admin/summary/prevadzka-overview/')) return Promise.resolve(overviewResponse);
      if (url.includes('/admin/closed-days/') && options?.method === 'POST') {
        closed = true;
        return Promise.resolve(jsonResponse({ date: '2026-08-07', is_closed: true }, true, 201));
      }
      if (url.includes('/admin/closed-days/')) {
        return Promise.resolve(jsonResponse({ date: '2026-08-07', is_closed: closed }));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(<PrevadzkaOverview />);

    const lockButton = await screen.findByRole('button', { name: /uzamknúť/i });
    fireEvent.click(lockButton);
    const dialog = screen.getByRole('dialog', { name: /uzamknúť objednávky/i });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Uzamknúť' }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/closed-days/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"date"'),
        }),
      );
      expect(screen.getByRole('status')).toHaveTextContent('Deň je uzavretý');
    });
    expect(screen.getByRole('button', { name: 'PDF objednávok' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'XLSX objednávok' })).toBeInTheDocument();
  });

  it('loads a persisted closed state and uses the report-task flow for export', async () => {
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/admin/summary/prevadzka-overview/')) return Promise.resolve(overviewResponse);
      if (url.includes('/admin/closed-days/')) {
        return Promise.resolve(jsonResponse({ date: '2026-08-07', is_closed: true }));
      }
      if (url.endsWith('/admin/report-tasks/') && options?.method === 'POST') {
        return Promise.resolve(jsonResponse({ task_id: 'pdf-task', status: 'pending' }, true, 202));
      }
      if (url.endsWith('/admin/report-tasks/pdf-task/')) {
        return Promise.resolve(jsonResponse({ task_id: 'pdf-task', status: 'complete' }));
      }
      if (url.endsWith('/admin/report-tasks/pdf-task/download/')) {
        return Promise.resolve(jsonResponse({}));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(<PrevadzkaOverview />);

    expect(await screen.findByText('Deň je uzavretý')).toBeInTheDocument();
    const pdfButton = screen.getByRole('button', { name: 'PDF objednávok' });
    expect(screen.getByRole('button', { name: 'XLSX objednávok' })).toBeInTheDocument();
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/report-tasks/'),
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('"format":"pdf"') }),
      );
      expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/pdf-task/download/'));
    });
  });

  it('unlocks a closed date after explicit confirmation and returns to the open state', async () => {
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/admin/summary/prevadzka-overview/')) return Promise.resolve(overviewResponse);
      if (url.includes('/admin/closed-days/unlock/') && options?.method === 'DELETE') {
        return Promise.resolve(jsonResponse({ date: '2026-08-07', is_closed: false }));
      }
      if (url.includes('/admin/closed-days/')) {
        return Promise.resolve(jsonResponse({ date: '2026-08-07', is_closed: true }));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(<PrevadzkaOverview />);

    const unlockButton = await screen.findByRole('button', { name: /odomknúť/i });
    fireEvent.click(unlockButton);
    const dialog = screen.getByRole('dialog', { name: /odomknúť objednávky/i });
    expect(within(dialog).getByText(/znova otvorí na úpravy objednávok, diét/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Odomknúť' }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/closed-days/unlock/'),
        expect.objectContaining({
          method: 'DELETE',
          body: expect.stringContaining('"date"'),
        }),
      );
      expect(screen.getByRole('button', { name: /uzamknúť/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PDF objednávok' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'XLSX objednávok' })).not.toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith('Deň bol odomknutý.');
  });
});
