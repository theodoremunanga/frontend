import React, { useEffect, useMemo, useState } from "react";
import "./Ambassade.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "";

const COMMISSION_RATE = 0.015;
const MIN_AMOUNT = 500;

const formatCDF = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(amount) + " CDF";
};

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken")
  );
};

const apiRequest = async (url, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        "Une erreur est survenue."
    );
  }

  return data;
};

export default function Ambassade() {
  const [tid, setTid] = useState("");
  const [amount, setAmount] = useState("");
  const [userId, setUserId] = useState("");

  const [fund, setFund] = useState(null);
  const [loadingTid, setLoadingTid] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [history, setHistory] = useState([]);

  const commission = useMemo(() => {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.round(
      value * COMMISSION_RATE * 100
    ) / 100;
  }, [amount]);

  const totalRecovered = useMemo(() => {
    return history.reduce(
      (total, operation) =>
        total + Number(operation.amount || 0),
      0
    );
  }, [history]);

  const totalCommission = useMemo(() => {
    return history.reduce(
      (total, operation) =>
        total + Number(operation.commission || 0),
      0
    );
  }, [history]);

  useEffect(() => {
    const saved =
      localStorage.getItem(
        "ambassador_recovery_history"
      );

    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        localStorage.removeItem(
          "ambassador_recovery_history"
        );
      }
    }
  }, []);

  const saveHistory = (operation) => {
    const updated = [
      operation,
      ...history,
    ].slice(0, 20);

    setHistory(updated);

    localStorage.setItem(
      "ambassador_recovery_history",
      JSON.stringify(updated)
    );
  };

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleLookupTid = async () => {
    resetMessages();

    const cleanTid = tid.trim();

    if (!cleanTid) {
      setError("Veuillez saisir le TID.");
      return;
    }

    setLoadingTid(true);
    setFund(null);

    try {
      const data = await apiRequest(
        `/api/ambassador/funds/tid/${encodeURIComponent(
          cleanTid
        )}`
      );

      if (!data.success || !data.fund) {
        throw new Error(
          "Fonds introuvable."
        );
      }

      setFund(data.fund);

      setAmount(
        String(data.fund.amount)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTid(false);
    }
  };

  const handleAmountChange = (event) => {
    const value = event.target.value;

    setAmount(value);

    if (
      fund &&
      Number(value) !== Number(fund.amount)
    ) {
      setError(
        `Le montant doit correspondre exactement au TID : ${formatCDF(
          fund.amount
        )}.`
      );
    } else {
      setError("");
    }
  };

  const handleRecover = async (event) => {
    event.preventDefault();

    resetMessages();

    const cleanTid = tid.trim();
    const numericAmount = Number(amount);
    const numericUserId = Number(userId);

    if (!cleanTid) {
      setError("Le TID est obligatoire.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < MIN_AMOUNT
    ) {
      setError(
        `Le montant minimum est de ${formatCDF(
          MIN_AMOUNT
        )}.`
      );
      return;
    }

    if (
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0
    ) {
      setError(
        "Veuillez saisir un ID utilisateur valide."
      );
      return;
    }

    if (!fund) {
      setError(
        "Veuillez d'abord vérifier le TID."
      );
      return;
    }

    if (
      Number(fund.amount) !==
      numericAmount
    ) {
      setError(
        `Le montant ne correspond pas au TID. Montant attendu : ${formatCDF(
          fund.amount
        )}.`
      );
      return;
    }

    if (fund.status !== "circulating") {
      setError(
        "Ce fonds n'est plus disponible."
      );
      return;
    }

    const confirmed = window.confirm(
      `Confirmer la récupération ?\n\n` +
        `TID : ${cleanTid}\n` +
        `Montant utilisateur : ${formatCDF(
          numericAmount
        )}\n` +
        `ID utilisateur : ${numericUserId}\n` +
        `Commission ambassadeur : ${formatCDF(
          commission
        )}\n\n` +
        `Le montant complet sera crédité à l'utilisateur.`
    );

    if (!confirmed) {
      return;
    }

    setRecovering(true);

    try {
      const data = await apiRequest(
        "/api/ambassador/funds/recover",
        {
          method: "POST",
          body: JSON.stringify({
            tid: cleanTid,
            amount: numericAmount,
            userId: numericUserId,
          }),
        }
      );

      const operation =
        data.operation || {};

      saveHistory({
        id:
          operation.transactionId ||
          Date.now(),
        tid: operation.tid || cleanTid,
        amount:
          Number(operation.amount) ||
          numericAmount,
        commission:
          Number(
            operation.ambassador?.commission
          ) || commission,
        userId:
          operation.user?.id ||
          numericUserId,
        username:
          operation.user?.username ||
          "",
        customId:
          operation.user?.custom_id ||
          "",
        date: new Date().toISOString(),
      });

      setSuccess(
        data.message ||
          `Récupération de ${formatCDF(
            numericAmount
          )} effectuée avec succès.`
      );

      setTid("");
      setAmount("");
      setUserId("");
      setFund(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecovering(false);
    }
  };

  const clearForm = () => {
    setTid("");
    setAmount("");
    setUserId("");
    setFund(null);
    resetMessages();
  };

  return (
    <div className="ambassade-page">

      {/* ==================================================
          HEADER
      ================================================== */}
      <header className="ambassade-header">
        <div>
          <span className="ambassade-kicker">
            SAJCL • FINANCEMENT
          </span>

          <h1>
            Espace Ambassadeur
          </h1>

          <p>
            Récupérez les fonds enregistrés par
            l'administration et créditez directement
            le compte de l'utilisateur.
          </p>
        </div>

        <div className="ambassade-status">
          <span className="status-dot" />
          Ambassadeur actif
        </div>
      </header>


      {/* ==================================================
          KPI
      ================================================== */}
      <section className="ambassade-stats">

        <div className="ambassade-stat-card">
          <div className="stat-icon">💰</div>

          <div>
            <span>Fonds récupérés</span>
            <strong>
              {formatCDF(totalRecovered)}
            </strong>
          </div>
        </div>

        <div className="ambassade-stat-card">
          <div className="stat-icon">📈</div>

          <div>
            <span>Mes commissions</span>
            <strong>
              {formatCDF(totalCommission)}
            </strong>
          </div>
        </div>

        <div className="ambassade-stat-card">
          <div className="stat-icon">🔄</div>

          <div>
            <span>Opérations</span>
            <strong>
              {history.length}
            </strong>
          </div>
        </div>

        <div className="ambassade-stat-card commission-card">
          <div className="stat-icon">1,5%</div>

          <div>
            <span>Taux ambassadeur</span>
            <strong>
              Commission
            </strong>
          </div>
        </div>

      </section>


      {/* ==================================================
          EXPLICATION DU CIRCUIT
      ================================================== */}
      <section className="ambassade-flow">

        <div className="flow-step">
          <div className="flow-number">1</div>
          <div>
            <strong>Utilisateur</strong>
            <span>
              Verse à la caisse officielle C.O.6
            </span>
          </div>
        </div>

        <div className="flow-line" />

        <div className="flow-step">
          <div className="flow-number">2</div>
          <div>
            <strong>Administrateur</strong>
            <span>
              Enregistre le TID dans le SAJCL
            </span>
          </div>
        </div>

        <div className="flow-line" />

        <div className="flow-step">
          <div className="flow-number">3</div>
          <div>
            <strong>Ambassadeur</strong>
            <span>
              Récupère et crédite le destinataire
            </span>
          </div>
        </div>

      </section>


      <main className="ambassade-content">

        {/* ==================================================
            FORMULAIRE
        ================================================== */}
        <section className="recovery-card">

          <div className="card-heading">
            <div>
              <span className="section-label">
                OPÉRATION
              </span>

              <h2>
                Récupérer un fonds
              </h2>

              <p>
                Saisissez les informations du fonds
                enregistré par l'administration.
              </p>
            </div>

            <div className="secure-badge">
              🔐 Opération sécurisée
            </div>
          </div>


          <form
            onSubmit={handleRecover}
            className="recovery-form"
          >

            {/* TID */}
            <div className="field-group tid-field">
              <label htmlFor="tid">
                TID du fonds
              </label>

              <div className="tid-input-row">
                <input
                  id="tid"
                  type="text"
                  value={tid}
                  onChange={(e) =>
                    setTid(e.target.value)
                  }
                  placeholder="Ex. CO260821.1659.T32121"
                  autoComplete="off"
                />

                <button
                  type="button"
                  className="lookup-button"
                  onClick={handleLookupTid}
                  disabled={
                    loadingTid ||
                    !tid.trim()
                  }
                >
                  {loadingTid
                    ? "Vérification..."
                    : "Vérifier"}
                </button>
              </div>
            </div>


            {/* APERÇU DU TID */}
            {fund && (
              <div className="fund-preview">

                <div className="preview-header">
                  <span>
                    Fonds vérifié
                  </span>

                  <span className="fund-status">
                    ● DISPONIBLE
                  </span>
                </div>

                <div className="preview-grid">

                  <div>
                    <span>TID</span>
                    <strong>
                      {fund.tid}
                    </strong>
                  </div>

                  <div>
                    <span>Montant enregistré</span>
                    <strong>
                      {formatCDF(
                        fund.amount
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>État</span>
                    <strong>
                      {fund.status}
                    </strong>
                  </div>

                </div>

              </div>
            )}


            {/* MONTANT */}
            <div className="form-grid">

              <div className="field-group">
                <label htmlFor="amount">
                  Montant à récupérer
                </label>

                <div className="amount-input">
                  <input
                    id="amount"
                    type="number"
                    min={MIN_AMOUNT}
                    step="1"
                    value={amount}
                    onChange={
                      handleAmountChange
                    }
                    placeholder="Montant en CDF"
                  />

                  <span>CDF</span>
                </div>

                <small>
                  Minimum :{" "}
                  {formatCDF(MIN_AMOUNT)}
                </small>
              </div>


              {/* ID USER */}
              <div className="field-group">
                <label htmlFor="userId">
                  ID utilisateur destinataire
                </label>

                <input
                  id="userId"
                  type="number"
                  min="1"
                  value={userId}
                  onChange={(e) =>
                    setUserId(e.target.value)
                  }
                  placeholder="Ex. 25"
                />

                <small>
                  Le compte qui recevra
                  l'intégralité du fonds.
                </small>
              </div>

            </div>


            {/* CALCUL */}
            <div className="commission-box">

              <div className="commission-row">
                <span>
                  Crédit utilisateur
                </span>

                <strong>
                  {formatCDF(
                    Number(amount) || 0
                  )}
                </strong>
              </div>

              <div className="commission-row">
                <span>
                  Commission ambassadeur
                  <small>1,5 %</small>
                </span>

                <strong className="commission-value">
                  + {formatCDF(commission)}
                </strong>
              </div>

              <div className="commission-separator" />

              <div className="commission-info">
                <span>
                  ℹ️
                </span>

                <p>
                  La commission est générée
                  séparément dans votre portefeuille
                  ambassadeur. Elle ne diminue pas
                  le montant crédité à l'utilisateur.
                </p>
              </div>

            </div>


            {/* MESSAGES */}
            {error && (
              <div className="ambassade-alert error">
                <span>⚠</span>
                {error}
              </div>
            )}

            {success && (
              <div className="ambassade-alert success">
                <span>✓</span>
                {success}
              </div>
            )}


            {/* ACTIONS */}
            <div className="form-actions">

              <button
                type="button"
                className="clear-button"
                onClick={clearForm}
                disabled={recovering}
              >
                Réinitialiser
              </button>

              <button
                type="submit"
                className="recover-button"
                disabled={
                  recovering ||
                  loadingTid ||
                  !fund
                }
              >
                {recovering
                  ? "Récupération en cours..."
                  : "Récupérer et créditer"}
              </button>

            </div>

          </form>

        </section>


        {/* ==================================================
            HISTORIQUE
        ================================================== */}
        <section className="history-card">

          <div className="card-heading">
            <div>
              <span className="section-label">
                JOURNAL
              </span>

              <h2>
                Mes dernières récupérations
              </h2>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="empty-history">
              <div className="empty-icon">
                📋
              </div>

              <strong>
                Aucune récupération
              </strong>

              <p>
                Vos opérations apparaîtront ici
                après chaque récupération réussie.
              </p>
            </div>
          ) : (
            <div className="history-list">

              {history.map((operation) => (
                <div
                  className="history-item"
                  key={operation.id}
                >

                  <div className="history-main">

                    <div className="history-icon">
                      ✓
                    </div>

                    <div>
                      <strong>
                        {formatCDF(
                          operation.amount
                        )}
                      </strong>

                      <span>
                        TID : {operation.tid}
                      </span>

                      <span>
                        Utilisateur #{operation.userId}
                        {operation.username
                          ? ` • ${operation.username}`
                          : ""}
                      </span>
                    </div>

                  </div>

                  <div className="history-commission">

                    <span>
                      Commission
                    </span>

                    <strong>
                      +{" "}
                      {formatCDF(
                        operation.commission
                      )}
                    </strong>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

      </main>


      {/* ==================================================
          RAPPEL SÉCURITÉ
      ================================================== */}
      <footer className="ambassade-footer">

        <div>
          <strong>
            🛡️ Responsabilité Ambassadeur
          </strong>

          <p>
            Vérifiez toujours le TID, le montant et
            l'identité du destinataire avant de
            confirmer une récupération.
          </p>
        </div>

        <div className="footer-rule">
          <span>Règle financière</span>
          <strong>
            100% utilisateur + 1,5% ambassadeur
          </strong>
        </div>

      </footer>

    </div>
  );
}