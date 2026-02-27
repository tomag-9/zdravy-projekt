import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/auth";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface UserProfile {
  company_name: string;
  ico: string;
  dic: string;
  registration_status: string;
  email_verified: boolean;
  registration_date: string;
}

interface PendingUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  profile: UserProfile;
  date_joined: string;
}

const PendingRegistrations: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [denialReason, setDenialReason] = useState("");
  const [showDenialModal, setShowDenialModal] = useState<number | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<number | null>(null);

  const fetchPendingUsers = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/admin/pending-registrations/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Nepodarilo sa načítať zoznam čakajúcich registrácií");
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba pri načítavaní");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/admin/pending-registrations/${userId}/approve/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Schválenie zlyhalo");
      }

      // Refresh list
      await fetchPendingUsers();
      setShowApprovalModal(null);
      alert("Registrácia bola úspešne schválená!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba pri schvaľovaní");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (userId: number) => {
    setActionLoading(userId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/admin/pending-registrations/${userId}/deny/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: denialReason }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Zamietnutie zlyhalo");
      }

      // Refresh list
      await fetchPendingUsers();
      setShowDenialModal(null);
      setDenialReason("");
      alert("Registrácia bola zamietnutá.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba pri zamietaní");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Čakajúce registrácie
        </h1>
        <p className="text-slate-600 mt-2">
          Schváľte alebo zamietnite nové registrácie používateľov
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-slate-600">
            Žiadne čakajúce registrácie na schválenie.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {user.company_name || user.profile.company_name}
                    </h3>
                    <p className="text-slate-600">{user.email}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {user.profile.ico && (
                      <div>
                        <span className="font-medium text-slate-700">IČO:</span>{" "}
                        <span className="text-slate-600">{user.profile.ico}</span>
                      </div>
                    )}
                    {user.profile.dic && (
                      <div>
                        <span className="font-medium text-slate-700">DIČ:</span>{" "}
                        <span className="text-slate-600">{user.profile.dic}</span>
                      </div>
                    )}
                    {(user.first_name || user.last_name) && (
                      <div>
                        <span className="font-medium text-slate-700">
                          Kontakt:
                        </span>{" "}
                        <span className="text-slate-600">
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-slate-700">
                        Registrovaný:
                      </span>{" "}
                      <span className="text-slate-600">
                        {new Date(user.profile.registration_date).toLocaleDateString(
                          "sk-SK"
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.profile.email_verified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                        ✓ Email overený
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
                        ⏳ Email neoverený
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[160px]">
                  <button
                    onClick={() => setShowApprovalModal(user.id)}
                    disabled={
                      !user.profile.email_verified || actionLoading === user.id
                    }
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    {actionLoading === user.id ? "Spracováva sa..." : "✓ Schváliť"}
                  </button>
                  <button
                    onClick={() => setShowDenialModal(user.id)}
                    disabled={actionLoading === user.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    ✗ Zamietnuť
                  </button>
                </div>
              </div>

              {!user.profile.email_verified && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  ⚠️ Používateľ ešte neoveril svoj email. Schválenie bude možné
                  až po overení.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Denial Modal */}
      {showDenialModal !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDenialModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Zamietnuť registráciu
            </h2>
            <p className="text-slate-600 mb-4">
              Zadajte dôvod zamietnutia (voliteľné):
            </p>
            <textarea
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Dôvod zamietnutia..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDenialModal(null);
                  setDenialReason("");
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={() => handleDeny(showDenialModal)}
                disabled={actionLoading === showDenialModal}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
              >
                {actionLoading === showDenialModal
                  ? "Spracováva sa..."
                  : "Zamietnuť"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowApprovalModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-modal-title"
            aria-describedby="approval-modal-description"
          >
            <h2
              id="approval-modal-title"
              className="text-xl font-bold text-slate-900 mb-4"
            >
              Schváliť registráciu
            </h2>
            <p
              id="approval-modal-description"
              className="text-slate-600 mb-6"
            >
              Naozaj chcete schváliť túto registráciu? Používateľ bude môcť
              prihlásiť sa do systému.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={() => handleApprove(showApprovalModal)}
                disabled={actionLoading === showApprovalModal}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
              >
                {actionLoading === showApprovalModal
                  ? "Spracováva sa..."
                  : "Schváliť"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingRegistrations;
