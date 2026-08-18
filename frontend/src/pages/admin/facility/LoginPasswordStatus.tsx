import React from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { Login } from "./LoginFields";

/** Ikona vedľa loginu: zelená fajka (heslo nastavené), oranžová blikajúca hodinka
 * (pozvánka čaká, link ešte platí) alebo červený krížik (link vypršal). */
export const LoginPasswordStatusBadge: React.FC<{ status: Login["password_status"] }> = ({ status }) => {
  if (!status) return null;
  if (status === "success") {
    return (
      <span className="zpa-login-status zpa-login-status--success" title="Heslo je nastavené">
        <CheckCircle2 />
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="zpa-login-status zpa-login-status--pending" title="Čaká sa na nastavenie hesla (link ešte platí)">
        <Clock />
      </span>
    );
  }
  return (
    <span className="zpa-login-status zpa-login-status--failed" title="Link na nastavenie hesla vypršal">
      <XCircle />
    </span>
  );
};
