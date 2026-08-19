import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditAccessProvider } from './editAccess';
import { Button, Input, Select, Textarea } from '../pages/admin/ui';

const renderWith = (canEdit: boolean, ui: React.ReactNode) =>
  render(<EditAccessProvider canEdit={canEdit}>{ui}</EditAccessProvider>);

describe('režim len na čítanie', () => {
  it('zamkne prvky, ktoré menia dáta', () => {
    renderWith(false, (
      <>
        <Button>Uložiť</Button>
        <Input aria-label="pole" />
        <Select aria-label="výber" />
        <Textarea aria-label="text" />
      </>
    ));
    expect(screen.getByRole('button', { name: 'Uložiť' })).toBeDisabled();
    expect(screen.getByLabelText('pole')).toBeDisabled();
    expect(screen.getByLabelText('výber')).toBeDisabled();
    expect(screen.getByLabelText('text')).toBeDisabled();
  });

  it('pri plnom prístupe nechá všetko funkčné', () => {
    renderWith(true, <Button>Uložiť</Button>);
    expect(screen.getByRole('button', { name: 'Uložiť' })).toBeEnabled();
  });

  // Výnimka je vedomá: export a filtre nič nemenia.
  it('allowReadOnly ponechá prvok funkčný', () => {
    renderWith(false, <Button allowReadOnly>Export</Button>);
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('vlastné disabled sa rešpektuje aj pri plnom prístupe', () => {
    renderWith(true, <Button disabled>Uložiť</Button>);
    expect(screen.getByRole('button', { name: 'Uložiť' })).toBeDisabled();
  });

  it('mimo providera sa nič nezamyká', () => {
    render(<Button>Uložiť</Button>);
    expect(screen.getByRole('button', { name: 'Uložiť' })).toBeEnabled();
  });
});
