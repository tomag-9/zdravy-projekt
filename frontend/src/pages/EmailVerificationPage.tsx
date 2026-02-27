import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Neplatný verifikačný odkaz.");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/verify-email/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.detail || "Email bol úspešne overený!");
          setEmail(data.email || "");
        } else {
          setStatus("error");
          setMessage(data.detail || "Overenie emailu zlyhalo.");
        }
      } catch (err) {
        setStatus("error");
        setMessage(
          "Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie na internet."
        );
      }
    };

    verifyEmail();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-indigo-50">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">⏳</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Overujem email...
            </h1>
            <p className="text-slate-500">Prosím čakajte</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-green-100">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              Email overený!
            </h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-slate-700 mb-3">{message}</p>
              {email && (
                <p className="text-sm text-slate-600 mb-3">Email: {email}</p>
              )}
              <p className="text-sm text-slate-600">
                <strong>Ďalší krok:</strong> Váš účet bude teraz odoslaný na
                schválenie administrátorovi. Po schválení vám príde
                notifikačný email a budete sa môcť prihlásiť do systému.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg"
            >
              Prejsť na prihlásenie
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-red-100">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Overenie zlyhalo
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-slate-700">{message}</p>
          </div>
          <div className="space-y-3">
            <Link
              to="/resend-verification"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Požiadať o nový verifikačný email
            </Link>
            <Link
              to="/login"
              className="block text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Späť na prihlásenie
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
