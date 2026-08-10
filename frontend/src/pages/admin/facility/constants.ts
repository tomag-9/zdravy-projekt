import type { LoginForm } from "./LoginFields";
import type { PrevadzkaForm } from "./PrevadzkaFields";

// Kept in their own module (not alongside the components) so
// LoginFields.tsx/PrevadzkaFields.tsx only export components — react-refresh
// warns (and `npm run lint` fails on --max-warnings 0) otherwise.
export const EMPTY_LOGIN: LoginForm = {
  email: "",
  company_name: "",
};

export const EMPTY_PREVADZKA: PrevadzkaForm = {
  nazov: "",
  adresa: "",
  edupage_connection: null,
  edupage_match: "",
  report_alias: "",
  delivery_note: "",
  sort_order: 0,
  is_active: true,
};
