import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EventPayloadDetails } from './AdminLogs';

describe('EventPayloadDetails', () => {
    it('renders field changes as readable before and after lines', () => {
        render(
            <EventPayloadDetails
                payload={{
                    changes: {
                        'lunch.Dospelý.menuCounts.A': { from: null, to: 2 },
                        billing_name: { from: 'Pôvodný názov', to: 'Nový názov' },
                    },
                }}
            />,
        );

        expect(screen.getByText(/lunch\.Dospelý\.menuCounts\.A: \(prázdne\) -> 2/)).toBeInTheDocument();
        expect(screen.getByText(/billing_name: Pôvodný názov -> Nový názov/)).toBeInTheDocument();
    });

    it('falls back to formatted JSON when the payload has no changes', () => {
        render(<EventPayloadDetails payload={{ sent: 3, title: 'Oznam' }} />);

        const detail = screen.getByText(/"sent": 3/);
        expect(detail).toHaveTextContent('"title": "Oznam"');
    });
});
