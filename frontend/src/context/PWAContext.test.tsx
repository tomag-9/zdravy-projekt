import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PWAProvider } from './PWAContext';
import * as registerSW from '../lib/registerSW';

vi.mock('../lib/registerSW', () => ({
  registerServiceWorker: vi.fn(),
  applyUpdate: vi.fn(),
  setUpdateCallback: vi.fn(),
}));

const mockRegisterServiceWorker = vi.mocked(registerSW.registerServiceWorker);
const mockApplyUpdate = vi.mocked(registerSW.applyUpdate);
const mockSetUpdateCallback = vi.mocked(registerSW.setUpdateCallback);

describe('PWAProvider — vynútené obnovenie na novú verziu (Emjoy, 17.9.2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('automaticky aplikuje čakajúci SW update bez kliknutia užívateľa, hneď ako je registrácia dostupná', async () => {
    const fakeRegistration = { waiting: {} } as ServiceWorkerRegistration;
    mockRegisterServiceWorker.mockResolvedValue(fakeRegistration);

    render(
      <PWAProvider>
        <div />
      </PWAProvider>,
    );

    // Počkaj, kým sa registerServiceWorker() vyrieši a swRegistration sa uloží do stavu.
    await vi.waitFor(() => {
      expect(mockRegisterServiceWorker).toHaveBeenCalled();
    });

    // Simuluj, že SW oznámi novú čakajúcu verziu — presne scenár z incidentu,
    // keď mala Emjoy otvorenú starú kartu s bugom vo verzii spred deployu.
    const notifyUpdateWaiting = mockSetUpdateCallback.mock.calls[0][0];
    notifyUpdateWaiting();

    await vi.waitFor(() => {
      expect(mockApplyUpdate).toHaveBeenCalledWith(fakeRegistration);
    });
  });

  it('aplikuje update aj keď je waiting SW nájdený už pri načítaní stránky (callback príde skôr než sa registrácia uloží do stavu)', async () => {
    const fakeRegistration = { waiting: {} } as ServiceWorkerRegistration;
    // Callback sa zavolá SYNCHRÓNNE počas registerServiceWorker, teda predtým,
    // než promise vráti registráciu a než sa uloží do Reactového stavu.
    mockRegisterServiceWorker.mockImplementation(async () => {
      mockSetUpdateCallback.mock.calls[0][0]();
      return fakeRegistration;
    });

    render(
      <PWAProvider>
        <div />
      </PWAProvider>,
    );

    await vi.waitFor(() => {
      expect(mockApplyUpdate).toHaveBeenCalledWith(fakeRegistration);
    });
  });
});
