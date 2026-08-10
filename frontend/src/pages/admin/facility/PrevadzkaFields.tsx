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
  connections: EdupageConnectionOption[];
  showEdupage: boolean;
}> = ({ form, setForm, connections, showEdupage }) => (
  <>
    <Field label="Názov prevádzky" req>
      <Input required value={form.nazov} onChange={(e) => setForm((current) => ({ ...current, nazov: e.target.value }))} />
    </Field>
    <Field label="Adresa výdaja">
      <Input value={form.adresa} onChange={(e) => setForm((current) => ({ ...current, adresa: e.target.value }))} />
    </Field>
    {showEdupage && (
      <Field label="EduPage spojenie">
        <Select
          value={form.edupage_connection ?? ""}
          onChange={(e) => setForm((current) => ({ ...current, edupage_connection: e.target.value ? Number(e.target.value) : null }))}
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
      <Input placeholder="napr. Les alebo mšHey; mšMal,Hey" value={form.edupage_match} onChange={(e) => setForm((current) => ({ ...current, edupage_match: e.target.value }))} />
    </Field>
    <Field label="Report alias" hint="(názov vo výkazoch)">
      <Input value={form.report_alias} onChange={(e) => setForm((current) => ({ ...current, report_alias: e.target.value }))} />
    </Field>
    <Field label="Poznámka k rozvozu">
      <Textarea rows={2} value={form.delivery_note} onChange={(e) => setForm((current) => ({ ...current, delivery_note: e.target.value }))} />
    </Field>
    <div className="zpa-grid-2">
      <Field label="Poradie">
        <Input type="number" value={form.sort_order} onChange={(e) => setForm((current) => ({ ...current, sort_order: Number(e.target.value) || 0 }))} />
      </Field>
      <Field label="Aktívna">
        <Toggle on={form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} ariaLabel="Aktívna prevádzka" />
      </Field>
    </div>
  </>
);
