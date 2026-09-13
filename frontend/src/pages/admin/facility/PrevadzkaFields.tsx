import React from "react";
import { Field, Input, Select, Textarea, Toggle } from "../ui";

export interface Prevadzka {
  id: number;
  celok: number;
  celok_nazov: string;
  nazov: string;
  adresa: string;
  edupage_connection: number | null;
  edupage_connection_name: string | null;
  edupage_match: string;
  report_alias: string;
  delivery_note: string;
  sort_order: number;
  is_active: boolean;
  billing_portion_coefficients: Record<string, string>;
  orders_count: number | null;
  client_user_id: number | null;
}

export interface PrevadzkaForm {
  nazov: string;
  adresa: string;
  edupage_connection: number | null;
  edupage_match: string;
  report_alias: string;
  delivery_note: string;
  sort_order: number;
  is_active: boolean;
}

export interface EdupageConnectionOption {
  id: number;
  name: string;
  is_active: boolean;
}

export const PrevadzkaFields: React.FC<{
  form: PrevadzkaForm;
  setForm: React.Dispatch<React.SetStateAction<PrevadzkaForm>>;
  /** Detail prevádzky ukladá polia priebežne; formulár pri zakladaní nie. */
  onFieldChange?: (patch: Partial<PrevadzkaForm>, mode: "immediate" | "debounced") => void;
  connections: EdupageConnectionOption[];
  showEdupage: boolean;
}> = ({ form, setForm, onFieldChange, connections, showEdupage }) => {
  const change = (patch: Partial<PrevadzkaForm>, mode: "immediate" | "debounced") => {
    setForm((current) => ({ ...current, ...patch }));
    onFieldChange?.(patch, mode);
  };

  return (
  <>
    <Field label="Názov prevádzky" req>
      <Input required value={form.nazov} onChange={(e) => change({ nazov: e.target.value }, "debounced")} />
    </Field>
    <Field label="Adresa výdaja">
      <Input value={form.adresa} onChange={(e) => change({ adresa: e.target.value }, "debounced")} />
    </Field>
    {showEdupage && (
      <Field label="EduPage spojenie">
        <Select
          value={form.edupage_connection ?? ""}
          onChange={(e) => change({ edupage_connection: e.target.value ? Number(e.target.value) : null }, "immediate")}
        >
          <option value="">Bez spojenia</option>
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.name}{connection.is_active ? "" : " (neaktívne)"}
            </option>
          ))}
        </Select>
      </Field>
    )}
    <Field label="Edupage match" hint="(prefix; ; oddeľuje viac)">
      <Input placeholder="napr. Les alebo mšHey; mšMal,Hey" value={form.edupage_match} onChange={(e) => change({ edupage_match: e.target.value }, "debounced")} />
    </Field>
    <Field label="Report alias" hint="(názov vo výkazoch)">
      <Input value={form.report_alias} onChange={(e) => change({ report_alias: e.target.value }, "debounced")} />
    </Field>
    <Field label="Poznámka k rozvozu">
      <Textarea rows={2} value={form.delivery_note} onChange={(e) => change({ delivery_note: e.target.value }, "debounced")} />
    </Field>
    <div className="zpa-grid-2">
      <Field label="Poradie">
        <Input type="number" value={form.sort_order} onChange={(e) => change({ sort_order: Number(e.target.value) || 0 }, "debounced")} />
      </Field>
      <Field label="Aktívna">
        <Toggle on={form.is_active} onChange={(value) => change({ is_active: value }, "immediate")} ariaLabel="Aktívna prevádzka" />
      </Field>
    </div>
  </>
  );
};
