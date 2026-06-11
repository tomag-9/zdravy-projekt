import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import OrderSummaryModal from './OrderSummaryModal';
import OrderService from '../../services/OrderService';

const deleteOrder = vi.fn();
const setSelectedDate = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    deleteOrder,
    setSelectedDate,
  }),
}));

vi.mock('../../services/OrderService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/OrderService')>();

  return {
    ...actual,
    default: {
      ...actual.default,
      checkDeadline: vi.fn(),
    },
  };
});

describe('OrderSummaryModal', () => {
  it('hides edit, zero and delete actions after all deadlines pass', () => {
    vi.mocked(OrderService.checkDeadline).mockReturnValue(false);

    render(
      <MemoryRouter>
        <OrderSummaryModal
          isOpen
          onClose={vi.fn()}
          orderDate="2026-06-10"
          globalDeadlines={{
            breakfast: '10:00',
            lunch: '10:00',
            olovrant: '10:00',
          }}
          orderData={{
            status: 'submitted',
            breakfast: {},
            lunch: {
              'Škôlka': {
                menuCounts: { A: 1 },
                diets: {},
              },
            },
            olovrant: {},
          }}
          onZero={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /upraviť/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vynulovať/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vymazať/i })).not.toBeInTheDocument();
  });

  it('lets the nested confirmation dialog own Escape before closing the parent dialog', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    vi.mocked(OrderService.checkDeadline).mockReturnValue(true);

    render(
      <MemoryRouter>
        <OrderSummaryModal
          isOpen
          onClose={onClose}
          orderDate="2026-06-10"
          globalDeadlines={{
            breakfast: '10:00',
            lunch: '10:00',
            olovrant: '10:00',
          }}
          orderData={{
            status: 'submitted',
            breakfast: {},
            lunch: {
              'Škôlka': {
                menuCounts: { A: 1 },
                diets: {},
              },
            },
            olovrant: {},
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog', { name: 'Detail objednávky' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /vymazať/i }));
    expect(screen.getByRole('dialog', { name: 'Vymazať objednávku' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Vymazať objednávku' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('dialog', { name: 'Detail objednávky' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
