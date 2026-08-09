import React from "react";
import { Field, Input } from "../ui";

export interface Login {
  user_id: number;
  email: string;
  company_name: string;
  is_edupage: boolean;
  prevadzka_ids: number[];
}

export interface LoginForm {
  email: string;
  company_name: string;
}

export const LoginFields: React.FC<{
  form: LoginForm;
  setForm: React.Dispatch<React.SetStateAction<LoginForm>>;
}> = ({ form, setForm }) => (
  <>
    <Field label="Názov loginu" req>
      <Input required value={form.company_name} onChange={(e) => setForm((current) => ({ ...current, company_name: e.target.value }))} />
    </Field>
    <Field label="Email" req>
      <Input type="email" required value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
    </Field>
  </>
);
