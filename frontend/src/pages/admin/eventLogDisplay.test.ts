import { describe, expect, it } from 'vitest';

import {
    EVENT_TONES,
    actorDisplay,
    eventTone,
    isOrderEvent,
    orderActionLabel,
    summarizeOrderMeals,
    targetDisplay,
} from './eventLogDisplay';

describe('eventTone', () => {
    it('dáva všetkým cron behom jednu farbu, nech robia čokoľvek', () => {
        expect(eventTone('cron_run')).toBe(eventTone('auto_order_run'));
    });

    it('odlišuje kategórie úkonov, aby sa tabuľka dala skenovať očami', () => {
        const cron = eventTone('cron_run');
        expect(eventTone('order_admin_create')).not.toBe(cron);
        expect(eventTone('settings_change')).not.toBe(cron);
        expect(eventTone('push_broadcast')).not.toBe(cron);
        expect(eventTone('deploy_version')).not.toBe(cron);
    });

    it('kričí červenou na zlyhaní aj na mazaní', () => {
        expect(eventTone('cron_failed')).toBe('coral');
        expect(eventTone('order_admin_delete')).toBe('coral');
    });

    it('neznámy typ nezhodí odznak, len ho stlmí', () => {
        expect(eventTone('nieco_uplne_nove')).toBe('gray');
    });

    it('pokrýva každý typ, ktorý backend vie zapísať', () => {
        // Zoznam kopíruje EventLog.EventType — nový typ bez farby by v tabuľke
        // ticho splynul so „sivé = nič sa nedeje".
        const backendTypes = [
            'order_admin_create',
            'order_admin_update',
            'order_admin_delete',
            'auto_order_run',
            'push_broadcast',
            'settings_change',
            'cron_run',
            'cron_skipped',
            'cron_failed',
            'deploy_version',
        ];
        expect(Object.keys(EVENT_TONES).sort()).toEqual(backendTypes.sort());
    });
});

describe('actorDisplay', () => {
    const base = { actor: 7, actor_label: 'admin@example.com' };

    it('uprednostní meno pred e-mailom', () => {
        expect(actorDisplay({ ...base, actor_name: 'Jana Sláviková', actor_email: 'jana@example.com' }))
            .toBe('Jana Sláviková');
    });

    it('padá späť na e-mail, keď meno nie je vyplnené', () => {
        expect(actorDisplay({ ...base, actor_email: 'jana@example.com' })).toBe('jana@example.com');
    });

    it('systémovému aktorovi nechá jeho značku', () => {
        expect(actorDisplay({ actor: null, actor_label: 'cron' })).toBe('cron');
    });

    it('bez akéhokoľvek údaja povie „systém", nie prázdno', () => {
        expect(actorDisplay({ actor: null, actor_label: '' })).toBe('systém');
    });
});

describe('targetDisplay', () => {
    it('uprednostní meno pred e-mailom', () => {
        expect(targetDisplay({
            target_user: 3,
            target_user_name: 'MŠ Krásnanko',
            target_user_email: 'krasnanko@example.com',
        })).toBe('MŠ Krásnanko');
    });

    it('bez cieľa dá pomlčku', () => {
        expect(targetDisplay({ target_user: null })).toBe('—');
    });

    it('cieľ bez mena aj e-mailu ostane aspoň ako ID', () => {
        expect(targetDisplay({ target_user: 42 })).toBe('#42');
    });
});

describe('isOrderEvent', () => {
    it('rozpozná create/update/delete objednávky', () => {
        expect(isOrderEvent('order_admin_create')).toBe(true);
        expect(isOrderEvent('order_admin_update')).toBe(true);
        expect(isOrderEvent('order_admin_delete')).toBe(true);
    });

    it('nezamieňa si to s inými typmi udalostí', () => {
        expect(isOrderEvent('settings_change')).toBe(false);
        expect(isOrderEvent('cron_run')).toBe(false);
    });
});

describe('orderActionLabel', () => {
    it('má slovenský label pre každý typ objednávkovej udalosti', () => {
        expect(orderActionLabel('order_admin_create')).toBe('Vytvorená');
        expect(orderActionLabel('order_admin_update')).toBe('Upravená');
        expect(orderActionLabel('order_admin_delete')).toBe('Vymazaná');
    });
});

describe('summarizeOrderMeals', () => {
    it('spočíta objednané kusy pre zmenené jedlá po vytvorení', () => {
        const payload = {
            changed_meals: ['breakfast'],
            meals: { breakfast: { Dospelý: { menuCounts: { A: 2 }, diets: {} } } },
            changes: { 'breakfast.Dospelý.menuCounts.A': { from: null, to: 2 } },
        };
        expect(summarizeOrderMeals(payload)).toBe('raňajky ×2');
    });

    it('pri zmazaní vezme počet z "from", lebo "meals" po zmene je prázdne', () => {
        const payload = {
            changed_meals: ['breakfast'],
            meals: { breakfast: {} },
            changes: { 'breakfast.Dospelý.menuCounts.A': { from: 3, to: null } },
        };
        expect(summarizeOrderMeals(payload)).toBe('raňajky ×3');
    });

    it('spojí viac zmenených jedál bodkou', () => {
        const payload = {
            changed_meals: ['breakfast', 'lunch'],
            meals: {
                breakfast: { Dospelý: { menuCounts: { A: 1 }, diets: {} } },
                lunch: { Dospelý: { menuCounts: { B: 4 }, diets: {} } },
            },
            changes: {},
        };
        expect(summarizeOrderMeals(payload)).toBe('raňajky ×1 · obed ×4');
    });

    it('bez zmenených jedál vráti pomlčku', () => {
        expect(summarizeOrderMeals({ changed_meals: [] })).toBe('—');
    });
});
