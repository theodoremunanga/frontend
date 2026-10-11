
import React, { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import "./Marchands.css";

const API = "/marchands/funds";

const money = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getErrorMessage = (error) =>
  error?.message ||
  error?.error ||
  error?.response?.data?.error ||
  "Une erreur est survenue. Veuillez réessayer.";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export default function Marchands({ user: userProp }) {
  const [user] = useState(() => userProp || readStoredUser());

  const role = String(
    user?.role || user?.user?.role || ""
  ).trim().toUpperCase();

  const [wallet, setWallet] = useState({
    balance: 0,
    balance_locked: 0,
    currency: "FC",
  });

  const [merchant, setMerchant] = useState(null);
  const [operations, setOperations] = useState([]);

  const [operationType, setOperationType] = useState("deposit");
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState(null);
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    count: 0,
  });

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setRefreshing(true);

    try {
      const [walletResponse, historyResponse] =
        await Promise.all([
          api.get(`${API}/me`),
          api.get(`${API}/history?limit=20&offset=0`),
        ]);

      const walletData = walletResponse.data;
      const historyData = historyResponse.data;

      if (!walletData?.success || !walletData?.wallet) {
        throw new Error(
          "Les informations du portefeuille sont indisponibles."
        );
      }

      setMerchant(walletData.merchant || null);

      setWallet({
        ...walletData.wallet,
        balance: Number(walletData.wallet.balance || 0),
        balance_locked: Number(
          walletData.wallet.balance_locked || 0
        ),
        currency: "FC",
      });

      setOperations(
        Array.isArray(historyData?.operations)
          ? historyData.operations
          : []
      );

      setPagination(
        historyData?.pagination || {
          limit: 20,
          offset: 0,
          count: 0,
        }
      );

      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (role === "AMBASSADOR") {
      loadData();
    } else {
      setLoading(false);
    }
  }, [role, loadData]);

  const resetCustomer = () => {
    setCustomer(null);
    setNotice("");
  };

  const searchCustomer = async () => {
    const id = customerId.trim();

    if (!id) {
      setError("Saisissez l’identifiant 6BetBall du client.");
      return;
    }

    setSearching(true);
    setError("");
    setNotice("");
    setCustomer(null);

    try {
      const response = await api.get(
        `${API}/customer/${encodeURIComponent(id)}`
      );

      const data = response.data;

      if (!data?.success || !data?.customer) {
        throw new Error(
          data?.error || "Client introuvable."
        );
      }

      setCustomer(data.customer);
      setNotice(
        data.message ||
          "Vérifiez l’identité du client avant de continuer."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const changeOperationType = (type) => {
    setOperationType(type);
    setAmount("");
    setError("");
    setNotice("");
  };


    const submitOperation = async (event) => {
    event.preventDefault();

    setError("");
    setNotice("");

    if (!customer) {
        setError("Recherchez et vérifiez d’abord le client.");
        return;
    }

    const value = Number(amount);

    if (
        !Number.isFinite(value) ||
        value <= 0 ||
        Math.round(value * 100) !== value * 100
    ) {
        setError(
        "Le montant doit être positif et comporter au maximum deux décimales."
        );
        return;
    }

    const isWithdrawal = operationType === "withdraw";

    const confirmed = window.confirm(
        isWithdrawal
        ? `Envoyer une demande de retrait de ${money(value)} FC à ${customer.username} (${customer.custom_id}) ?\n\nLe portefeuille du client ne sera débité qu'après son autorisation.`
        : `Confirmer le dépôt de ${money(value)} FC pour ${customer.username} (${customer.custom_id}) ?`
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
        let data;

        if (isWithdrawal) {
        data = await requestCustomerWithdrawal(value);

        setNotice(
            data.message ||
            "Demande envoyée au client. Aucun débit ne sera effectué sans son autorisation."
        );
        } else {
        const response = await api.post(`${API}/deposit`, {
            customerCustomId: customer.custom_id,
            amount: value,
        });

        data = response.data;

        if (!data?.success) {
            throw new Error(data?.error || "Échec du dépôt.");
        }

        const operation = data.operation || {};

        setNotice(
            `${data.message || "Dépôt effectué."} ` +
            `Commission : ${money(operation.commission)} FC. ` +
            `Référence : ${operation.reference || "—"}.`
        );
        }

        setAmount("");
        setCustomerId("");
        setCustomer(null);

        await loadData();
    } catch (err) {
        setError(getErrorMessage(err));
    } finally {
        setSubmitting(false);
    }
    };


  if (role !== "AMBASSADOR") {
    return null;
  }

  if (loading) {
    return (
      <main className="marchand-page">
        <div className="marchand-loading">
          <span className="marchand-spinner" />
          <p>Chargement de votre espace marchand…</p>
        </div>
      </main>
    );
  }

  
    
    const requestCustomerWithdrawal = async (value) => {
        const response = await api.post("/marchands/funds/approval/merchant-request", {
        customerCustomId: customer.custom_id,
        amount: value,
    });

        const data = response.data;

        if (!data?.success) {
            throw new Error(
            data?.error || "Impossible d'envoyer la demande de retrait."
            );
        }

        return data;
        };



  return (
    <main className="marchand-page">
      <div className="marchand-container">
        <header className="marchand-header">
          <div>
            <div className="marchand-brand">
              <span className="marchand-brand-icon">6B</span>
              <span>6BetBall</span>
            </div>

            <p className="marchand-eyebrow">
              ESPACE PROFESSIONNEL
            </p>

            <h1>Espace marchand</h1>

            <p className="marchand-subtitle">
              Gérez vos dépôts et retraits en toute simplicité.
            </p>
          </div>

          <button
            type="button"
            className="marchand-refresh"
            onClick={() => loadData(true)}
            disabled={refreshing || submitting}
            aria-label="Actualiser les données"
          >
            <span className={refreshing ? "marchand-spin" : ""}>
              ↻
            </span>
            Actualiser
          </button>
        </header>

        {error && (
          <div className="marchand-alert marchand-alert-error" role="alert">
            <span>!</span>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        )}

        {notice && (
          <div
            className="marchand-alert marchand-alert-success"
            role="status"
          >
            <span>✓</span>
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        )}

        <section className="marchand-welcome">
          <div>
            <span className="marchand-welcome-label">
              BONJOUR,
            </span>

            <h2>
              {merchant?.username || user?.username || "Marchand"}
            </h2>

            <p>
              Identifiant :{" "}
              <strong>
                {merchant?.custom_id || "—"}
              </strong>
            </p>
          </div>

          <span className="marchand-status">
            <span />
            Espace marchand
          </span>
        </section>

        <section
          className="marchand-balance-card"
          aria-label="Résumé du portefeuille"
        >
          <div className="marchand-balance-top">
            <span>Solde disponible</span>
            <span className="marchand-wallet-icon">▤</span>
          </div>

          <div className="marchand-balance-value">
            {money(wallet.balance)}
            <span> FC</span>
          </div>

          <div className="marchand-balance-divider" />

          <div className="marchand-balance-bottom">
            <div>
              <span>Solde bloqué</span>
              <strong>{money(wallet.balance_locked)} FC</strong>
            </div>

            <div className="marchand-currency">
              <span>Devise</span>
              <strong>FC · Franc congolais</strong>
            </div>
          </div>
        </section>

        <section className="marchand-section">
          <div className="marchand-section-heading">
            <div>
              <p className="marchand-eyebrow">TRANSACTIONS</p>
              <h2>Nouvelle opération</h2>
            </div>
          </div>

          <div className="marchand-operation-tabs">
            <button
              type="button"
              className={
                operationType === "deposit"
                  ? "marchand-tab active deposit"
                  : "marchand-tab"
              }
              onClick={() => changeOperationType("deposit")}
              aria-pressed={operationType === "deposit"}
            >
              <span className="marchand-tab-icon">↓</span>
              <span>
                <strong>Dépôt</strong>
                <small>Créditer un client</small>
              </span>
            </button>

            <button
              type="button"
              className={
                operationType === "withdraw"
                  ? "marchand-tab active withdrawal"
                  : "marchand-tab"
              }
              onClick={() => changeOperationType("withdraw")}
              aria-pressed={operationType === "withdraw"}
            >
              <span className="marchand-tab-icon">↑</span>
              <span>
                <strong>Retrait</strong>
                <small>Débiter un client</small>
              </span>
            </button>
          </div>

          <form
            className="marchand-form-card"
            onSubmit={submitOperation}
          >
            <div className="marchand-form-title">
              <span
                className={
                  operationType === "deposit"
                    ? "marchand-form-icon deposit"
                    : "marchand-form-icon withdrawal"
                }
              >
                {operationType === "deposit" ? "↓" : "↑"}
              </span>

              <div>
                <h3>
                  {operationType === "deposit"
                    ? "Dépôt client"
                    : "Retrait client"}
                </h3>
                <p>
                    {operationType === "deposit"
                        ? "Vous créditez le compte du client depuis votre portefeuille."
                        : "Une demande sera envoyée au client. Son autorisation est obligatoire avant tout débit."}
                </p>
              </div>
            </div>

            <label
              className="marchand-label"
              htmlFor="marchand-customer-id"
            >
              Identifiant du client
            </label>

            <div className="marchand-customer-search">
              <input
                id="marchand-customer-id"
                type="text"
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  resetCustomer();
                }}
                placeholder="Ex. : 6B000123"
                autoComplete="off"
                maxLength={100}
                required
              />

              <button
                type="button"
                onClick={searchCustomer}
                disabled={searching || submitting}
              >
                {searching ? "Recherche…" : "Vérifier"}
              </button>
            </div>

            {customer && (
              <div className="marchand-customer-card">
                <span className="marchand-customer-avatar">
                  {(customer.username || "?")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <div>
                  <strong>{customer.username}</strong>
                  <span>ID : {customer.custom_id}</span>
                </div>

                <span
                  className="marchand-customer-verified"
                  title="Client vérifié"
                >
                  ✓
                </span>
              </div>
            )}

            <label
              className="marchand-label"
              htmlFor="marchand-amount"
            >
              Montant de l’opération
            </label>

            <div className="marchand-amount-input">
              <input
                id="marchand-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
                required
              />

              <span>FC</span>
            </div>

            <div className="marchand-operation-note">
              <span>ⓘ</span>
              <p>
                    {operationType === "deposit"
                        ? "Le dépôt est traité par le serveur selon les règles financières configurées."
                        : "Le client reçoit une demande avec le montant et votre identité. Aucun débit avant son autorisation."}
            </p>
            </div>

            <button
              className={
                operationType === "deposit"
                  ? "marchand-submit deposit"
                  : "marchand-submit withdrawal"
              }
              type="submit"
              disabled={
                submitting ||
                searching ||
                !customer ||
                !amount
              }
            >
              {submitting
                ? "Traitement en cours…"
                : operationType === "deposit"
                  ? "Confirmer le dépôt"
                  : "Confirmer le retrait"}
            </button>

            <p className="marchand-secure-note">
              <span>✓</span>
              Opération validée par le serveur avant confirmation.
            </p>
          </form>
        </section>

        <section className="marchand-section">
          <div className="marchand-section-heading">
            <div>
              <p className="marchand-eyebrow">SUIVI FINANCIER</p>
              <h2>Historique des opérations</h2>
              <p className="marchand-section-description">
                Vos opérations les plus récentes.
              </p>
            </div>

            <span className="marchand-count">
              {operations.length}
            </span>
          </div>

          {operations.length === 0 ? (
            <div className="marchand-empty">
              <span>▤</span>
              <strong>Aucune opération</strong>
              <p>
                Vos dépôts et retraits apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="marchand-history">
              {operations.map((item) => {
                const isDeposit =
                  String(item.operation_type).toLowerCase() ===
                  "deposit";

                return (
                  <article
                    className="marchand-history-item"
                    key={item.id}
                  >
                    <div
                      className={
                        isDeposit
                          ? "marchand-history-icon deposit"
                          : "marchand-history-icon withdrawal"
                      }
                    >
                      {isDeposit ? "↓" : "↑"}
                    </div>

                    <div className="marchand-history-info">
                      <strong>
                        {isDeposit ? "Dépôt client" : "Retrait client"}
                      </strong>

                      <span>
                        {item.customer_username || "Client"} ·{" "}
                        {item.customer_custom_id || "—"}
                      </span>

                      <small>{formatDate(item.created_at)}</small>

                      <span className="marchand-reference">
                        Réf. : {item.reference || "—"}
                      </span>
                    </div>

                    <div className="marchand-history-amount">
                      <strong>
                        {money(item.amount)} FC
                      </strong>

                      <span
                        className={
                          String(item.status).toLowerCase() ===
                          "completed"
                            ? "marchand-operation-status completed"
                            : "marchand-operation-status"
                        }
                      >
                        {item.status === "completed"
                          ? "Terminée"
                          : item.status || "—"}
                      </span>

                      <small>
                        Commission :{" "}
                        {money(item.commission_amount)} FC
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {pagination.count >= pagination.limit && (
            <p className="marchand-history-footnote">
              Affichage des 20 dernières opérations.
            </p>
          )}
        </section>

        <footer className="marchand-footer">
          <span className="marchand-footer-logo">6B</span>
          <p>6BetBall · Espace marchand sécurisé</p>
        </footer>
      </div>
    </main>
  );
}
