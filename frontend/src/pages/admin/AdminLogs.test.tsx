import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EventPayloadDetails, EventTime } from './AdminLogs';

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

describe('EventTime', () => {
    it('rozdelí dátum a čas na dva riadky bez sekúnd', () => {
        // Očakávané hodnoty sa počítajú rovnakým Intl-om (vrátane pevnej SK
        // zóny) ako komponent, aby test neprepadol len preto, že CI beží
        // v inej zóne než vývojársky stroj.
        const value = '2026-08-14T07:30:03+02:00';
        const date = new Date(value);
        const day = new Intl.DateTimeFormat('sk-SK', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Bratislava' }).format(date);
        const hm = new Intl.DateTimeFormat('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }).format(date);

        const { container } = render(<EventTime value={value} />);

        expect(screen.getByText(day)).toBeInTheDocument();
        expect(screen.getByText(hm)).toBeInTheDocument();
        // Sekundy v riadku nie sú — ostávajú len v tooltipe.
        expect(container.textContent).not.toMatch(/:\d{2}:\d{2}/);
        expect(container.querySelector('.zpa-time')?.getAttribute('title')).toMatch(/:\d{2}:\d{2}/);
    });

    it('nespadne na nezmyselnej hodnote a vypíše ju tak, ako prišla', () => {
        render(<EventTime value="neplatný dátum" />);

        expect(screen.getByText('neplatný dátum')).toBeInTheDocument();
    });
});
