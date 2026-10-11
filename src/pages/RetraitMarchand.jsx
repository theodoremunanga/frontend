// frontend/src/page/RetraitMarchand.jsx

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = (
  import.meta.env.VITE_API_URL 
).replace(/\/+$/, "");

const API = `${API_BASE}/marchands/funds/approval`;

const SUPPORT_PHONE = "+243973596027";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error || data.message || "La requête a échoué."
    );
  }

  return data;
}

function formatFC(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FC`;
}

export default function RetraitMarchand() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [merchantId, setMerchantId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const alertedIds = useRef(new Set());

  const loadPendingRequests = useCallback(async () => {
    if (!getToken()) return;

    try {
      const data = await apiRequest("/pending");

      const list = Array.isArray(data.requests)
        ? data.requests
        : Array.isArray(data.data)
          ? data.data
          : [];

      setRequests(list);

      // Afficher automatiquement le panneau lorsqu'une
      // nouvelle demande de retrait arrive.
      const hasNewRequest = list.some((request) => {
        const id = String(request.id);
        if (alertedIds.current.has(id)) return false;
        alertedIds.current.add(id);
        return true;
      });

      if (hasNewRequest) {
        setOpen(true);
      }
    } catch (err) {
      // Une erreur de chargement ne doit pas bloquer l'application.
      console.error("Chargement des retraits :", err.message);
    }
  }, []);

  useEffect(() => {
    loadPendingRequests();

    const interval = window.setInterval(
      loadPendingRequests,
      15000
    );

    return () => window.clearInterval(interval);
  }, [loadPendingRequests]);

  const handleDecision = async (request, decision) => {
    if (processingId !== null) return;

    const id = request.id;

    if (decision === "approve") {
      const confirmed = window.confirm(
        `Confirmer le retrait de ${formatFC(request.amount)} ?\n\n` +
        "Ce montant sera débité de votre compte et ne pourra " +
        "pas être récupéré après validation."
      );

      if (!confirmed) return;
    }

    setProcessingId(id);
    setError("");
    setMessage("");

    try {
      await apiRequest(
        `/${encodeURIComponent(id)}/${decision}`,
        { method: "POST" }
      );

      setRequests((current) =>
        current.filter((item) => String(item.id) !== String(id))
      );

      setMessage(
        decision === "approve"
          ? "Retrait autorisé. Consultez votre historique pour confirmer l'opération."
          : "Demande de retrait annulée. Aucun débit ne doit être effectué."
      );

      await loadPendingRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCustomerRequest = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const value = Number(amount);

    if (!merchantId.trim()) {
      setError("Saisissez l'identifiant du marchand.");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      setError("Saisissez un montant valide.");
      return;
    }

    setSubmitting(true);

    try {
      
        await apiRequest("/request", {
            method: "POST",
            body: JSON.stringify({
                ambassadorCustomId: merchantId.trim(),
                amount: value,
            }),
        });
            

      setMessage(
        "Votre demande a été envoyée. Attendez la confirmation du marchand."
      );

      setMerchantId("");
      setAmount("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .rm-launcher {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 9998;
          border: 0;
          border-radius: 999px;
          padding: 13px 18px;
          background: #111827;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 24px #0003;
        }

        .rm-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 21px;
          height: 21px;
          margin-left: 7px;
          border-radius: 50%;
          background: #dc2626;
          color: #fff;
          font-size: 12px;
        }

        .rm-panel {
          position: fixed;
          right: 18px;
          bottom: 78px;
          z-index: 9999;
          width: min(420px, calc(100vw - 24px));
          max-height: min(78vh, 680px);
          overflow-y: auto;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #fff;
          color: #111827;
          box-shadow: 0 12px 42px #0002;
          font-family: Arial, sans-serif;
          box-sizing: border-box;
        }

        .rm-panel * { box-sizing: border-box; }

        .rm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .rm-header h2 {
          margin: 0;
          font-size: 19px;
        }

        .rm-close {
          border: 0;
          background: transparent;
          color: #4b5563;
          font-size: 25px;
          cursor: pointer;
        }

        .rm-request {
          margin-bottom: 12px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
        }

        .rm-request p {
          margin: 7px 0;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .rm-warning {
          padding: 10px;
          border-radius: 8px;
          background: #fff7ed;
          color: #9a3412;
          font-size: 13px;
          line-height: 1.5;
        }

        .rm-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .rm-btn {
          flex: 1;
          min-height: 42px;
          border: 0;
          border-radius: 9px;
          padding: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .rm-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .rm-approve { background: #15803d; color: #fff; }
        .rm-cancel { background: #fee2e2; color: #991b1b; }
        .rm-submit { width: 100%; background: #111827; color: #fff; }

        .rm-form {
          display: grid;
          gap: 10px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .rm-form h3 { margin: 0; font-size: 16px; }

        .rm-form label {
          display: grid;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
        }

        .rm-form input {
          width: 100%;
          min-height: 43px;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          font-size: 15px;
        }

        .rm-message, .rm-error {
          margin: 10px 0;
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
        }

        .rm-message { background: #dcfce7; color: #166534; }
        .rm-error { background: #fee2e2; color: #991b1b; }

        .rm-empty {
          padding: 12px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }

        .rm-support {
          margin-top: 14px;
          font-size: 12px;
          line-height: 1.5;
          color: #6b7280;
        }

        @media (max-width: 480px) {
          .rm-launcher { right: 12px; bottom: 12px; }
          .rm-panel {
            right: 12px;
            bottom: 68px;
            width: calc(100vw - 24px);
            padding: 16px;
          }
        }
      `}</style>

      <button
        type="button"
        className="rm-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Ouvrir les retraits marchands"
      >
        Retraits
        {requests.length > 0 && (
          <span className="rm-count">{requests.length}</span>
        )}
      </button>

      {open && (
        <section
          className="rm-panel"
          role="dialog"
          aria-label="Gestion des retraits marchands"
        >
          <div className="rm-header">
            <h2>Retraits marchands</h2>
            <button
              type="button"
              className="rm-close"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          {message && (
            <p className="rm-message" role="status">{message}</p>
          )}

          {error && (
            <p className="rm-error" role="alert">{error}</p>
          )}

          <h3>Demandes reçues</h3>

          {requests.length === 0 ? (
            <p className="rm-empty">
              Aucune demande de retrait en attente.
            </p>
          ) : (
            requests.map((request) => (
              <article className="rm-request" key={request.id}>
                <p>
                  <strong>{request.merchant_username || "Marchand"}</strong>
                  {" "}demande un retrait de{" "}
                  <strong>{formatFC(request.amount)}</strong> dans votre compte.
                </p>

                <p className="rm-warning">
                  Si vous autorisez cette transaction, ce montant sera
                  débité de votre compte et ne sera pas récupérable
                  après validation. Si vous n'avez pas demandé ce retrait,
                  annulez-le et contactez le support 6BetBall.
                </p>

                <div className="rm-actions">
                  <button
                    type="button"
                    className="rm-btn rm-approve"
                    disabled={processingId !== null}
                    onClick={() => handleDecision(request, "approve")}
                  >
                    {String(processingId) === String(request.id)
                      ? "Traitement..."
                      : "Autoriser"}
                  </button>

                  <button
                    type="button"
                    className="rm-btn rm-cancel"
                    disabled={processingId !== null}
                    onClick={() => handleDecision(request, "reject")}
                  >
                    Annuler
                  </button>
                </div>
              </article>
            ))
          )}

          <p className="rm-support">
            Vous n'êtes pas à l'origine d'une demande ?
            Contactez le support 6BetBall au{" "}
            <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>.
          </p>

          <form className="rm-form" onSubmit={handleCustomerRequest}>
            <h3>Initier une demande de retrait</h3>

            <label>
              Identifiant du marchand / ambassadeur
              <input
                type="text"
                value={merchantId}
                onChange={(event) => setMerchantId(event.target.value)}
                placeholder="Ex. : identifiant marchand"
                autoComplete="off"
                required
              />
            </label>

            <label>
              Montant (FC)
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ex. : 5000"
                required
              />
            </label>

            <button
              type="submit"
              className="rm-btn rm-submit"
              disabled={submitting}
            >
              {submitting ? "Envoi..." : "Envoyer ma demande"}
            </button>

            <p className="rm-support">
              Votre demande doit être vérifiée par le serveur.
              Aucun montant ne doit être débité simplement parce que
              vous avez rempli ce formulaire.
            </p>
          </form>
        </section>
      )}
    </>
  );
}
