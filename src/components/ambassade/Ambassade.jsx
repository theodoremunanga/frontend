
import React, { useEffect, useMemo, useState } from "react";
import "./Ambassade.css";

const API_BASE = import.meta.env.VITE_API_URL || "";
const MIN_AMOUNT = 500;
const MAX_COMMISSION_RATE = 50;

// ======================================================
// FORMAT CDF
// ======================================================

const formatCDF = (value) => {
  const amount = Number(value ?? 0);

  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0) + " CDF"
  );
};

const formatRate = (value) => {
  const rate = Number(value);

  if (!Number.isFinite(rate)) return "Indisponible";

  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 4,
    }).format(rate) + " %"
  );
};

// ======================================================
// TOKEN
// ======================================================

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("jwt");

// ======================================================
// API REQUEST
// ======================================================

const apiRequest = async (url, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || "Une erreur est survenue."
    );
  }

  return data;
};

// ======================================================
// NORMALISATION DES DONNÉES
// ======================================================

const normalizeBeneficiary = (data) => {
  const user =
    data?.beneficiary ||
    data?.user ||
    data?.data?.beneficiary ||
    data?.data?.user ||
    null;

  if (!user) return null;

  const id = Number(user.id ?? user.userId);

  if (!Number.isInteger(id) || id <= 0) return null;

  return {
    ...user,
    id,
    username:
      user.username ||
      user.name ||
      user.full_name ||
      user.fullName ||
      "",
    custom_id: user.custom_id || user.customId || "",
  };
};

const normalizeHistoryOperation = (operation, index = 0) => ({
  ...operation,
  id:
    operation.id ??
    operation.transactionId ??
    `${operation.tid || "operation"}-${index}`,
  amount: Number(operation.amount ?? 0),
  commission: Number(operation.commission ?? 0),
  userId: operation.userId ?? operation.user_id ?? null,
  username: operation.username || "",
  customId: operation.customId || operation.custom_id || "",
  date:
    operation.date ||
    operation.recovered_at ||
    operation.updated_at ||
    operation.created_at ||
    null,
});

// ======================================================
// COMPONENT
// ======================================================

export default function Ambassade() {
  // ====================================================
  // FORMULAIRE
  // ====================================================

  const [tid, setTid] = useState("");
  const [amount, setAmount] = useState("");
  const [userId, setUserId] = useState("");

  // ====================================================
  // DESTINATAIRE
  // ====================================================

  const [beneficiary, setBeneficiary] = useState(null);
  const [loadingBeneficiary, setLoadingBeneficiary] = useState(false);

  // ====================================================
  // ÉTATS
  // ====================================================

  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ====================================================
  // HISTORIQUE
  // ====================================================

  const [history, setHistory] = useState([]);

  // ====================================================
  // TAUX RÉEL DU SERVEUR
  //
  // Le routeur fourni ne propose pas de route de lecture
  // du taux. Le taux devient connu après /recover.
  // null signifie qu'il n'est pas encore connu.
  // ====================================================

  const [commissionRate, setCommissionRate] = useState(null);

  // ====================================================
  // APERÇU DE COMMISSION
  //
  // Cet aperçu n'est disponible que si le serveur a déjà
  // communiqué un taux réel.
  //
  // Le calcul officiel reste celui du backend.
  // ====================================================

  const commission = useMemo(() => {
    const value = Number(amount);
    const rate = Number(commissionRate);

    if (
      amount === "" ||
      !Number.isFinite(value) ||
      value <= 0 ||
      commissionRate === null ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > MAX_COMMISSION_RATE
    ) {
      return null;
    }

    // Même règle d'arrondi monétaire que le backend.
    const amountCents = Math.round(value * 100);

    return Number(
      (Math.round((amountCents * rate) / 100) / 100).toFixed(2)
    );
  }, [amount, commissionRate]);

  // ====================================================
  // STATISTIQUES
  // ====================================================

  const totalRecovered = useMemo(
    () =>
      history.reduce(
        (total, operation) =>
          total + (Number(operation.amount) || 0),
        0
      ),
    [history]
  );

  const totalCommission = useMemo(
    () =>
      history.reduce(
        (total, operation) =>
          total + (Number(operation.commission) || 0),
        0
      ),
    [history]
  );

  // ====================================================
  // CHARGEMENT DE L'HISTORIQUE
  //
  // Contrat du backend :
  // { success: true, count: number, history: [...] }
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await apiRequest("/ambassade/history");

        if (!cancelled && Array.isArray(data.history)) {
          setHistory(
            data.history.map(normalizeHistoryOperation)
          );
        }
      } catch {
        // L'historique ne bloque jamais une récupération.
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  // ====================================================
  // MESSAGES
  // ====================================================

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  // ====================================================
  // CHANGEMENTS DU FORMULAIRE
  // ====================================================

  const handleTidChange = (event) => {
    setTid(event.target.value);
    resetMessages();
  };

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
    resetMessages();
  };

  const handleUserIdChange = (event) => {
    setUserId(event.target.value);
    setBeneficiary(null);
    resetMessages();
  };

  // ====================================================
  // IDENTIFICATION DU DESTINATAIRE
  //
  // Route conservée :
  // GET /ambassade/beneficiary/:userId
  // ====================================================

  const handleBeneficiaryLookup = async () => {
    const cleanUserId = userId.trim();
    const numericUserId = Number(cleanUserId);

    if (!cleanUserId) {
      setBeneficiary(null);
      return null;
    }

    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      setBeneficiary(null);
      setError("Veuillez saisir un ID destinataire valide.");
      return null;
    }

    if (beneficiary && beneficiary.id === numericUserId) {
      return beneficiary;
    }

    setLoadingBeneficiary(true);
    setBeneficiary(null);
    setError("");

    try {
      const data = await apiRequest(
        `/ambassade/beneficiary/${numericUserId}`
      );

      const resolvedBeneficiary = normalizeBeneficiary(data);

      if (!resolvedBeneficiary) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Destinataire introuvable."
        );
      }

      if (resolvedBeneficiary.id !== numericUserId) {
        throw new Error(
          "L'identité du destinataire ne correspond pas à l'ID saisi."
        );
      }

      setBeneficiary(resolvedBeneficiary);
      return resolvedBeneficiary;
    } catch (err) {
      setBeneficiary(null);

      setError(
        err.message ||
          "Impossible de récupérer les informations du destinataire."
      );

      return null;
    } finally {
      setLoadingBeneficiary(false);
    }
  };

  const getBeneficiaryName = (user = beneficiary) => {
    if (!user) return "";

    return (
      user.username ||
      user.name ||
      user.full_name ||
      user.fullName ||
      ""
    );
  };

  // ====================================================
  // VALIDATION
  // ====================================================

  const validateOperation = (resolvedBeneficiary) => {
    const cleanTid = tid.trim();
    const numericAmount = Number(amount);
    const numericUserId = Number(userId);

    if (!cleanTid) {
      return "Le TID est obligatoire.";
    }

    if (
      amount.trim() === "" ||
      !Number.isFinite(numericAmount) ||
      !Number.isInteger(numericAmount) ||
      numericAmount < MIN_AMOUNT
    ) {
      return `Le montant doit être un nombre entier supérieur ou égal à ${formatCDF(
        MIN_AMOUNT
      )}.`;
    }

    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      return "Veuillez saisir un ID destinataire valide.";
    }

    if (!resolvedBeneficiary) {
      return "Veuillez identifier le destinataire avant de continuer.";
    }

    if (Number(resolvedBeneficiary.id) !== numericUserId) {
      return "L'identité du destinataire ne correspond pas à l'ID saisi.";
    }

    return null;
  };

  // ====================================================
  // RÉCUPÉRATION DU FONDS
  //
  // Route conservée :
  // POST /ambassade/recover
  //
  // Le serveur calcule et retourne la commission réelle.
  // ====================================================

  const handleRecover = async (event) => {
    event.preventDefault();

    if (recovering) return;

    resetMessages();

    const numericUserId = Number(userId);

    let resolvedBeneficiary = beneficiary;

    if (
      !resolvedBeneficiary ||
      Number(resolvedBeneficiary.id) !== numericUserId
    ) {
      resolvedBeneficiary = await handleBeneficiaryLookup();
    }

    // Ne pas continuer si la recherche a échoué.
    if (!resolvedBeneficiary) return;

    const validationError = validateOperation(resolvedBeneficiary);

    if (validationError) {
      setError(validationError);
      return;
    }

    const cleanTid = tid.trim();
    const numericAmount = Number(amount);
    const beneficiaryName = getBeneficiaryName(resolvedBeneficiary);

    const confirmed = window.confirm(
      `Voulez-vous vraiment récupérer ${formatCDF(
        numericAmount
      )} pour ${beneficiaryName} ?\n\n` +
        `TID : ${cleanTid}\n` +
        `Montant : ${formatCDF(numericAmount)}\n` +
        `Destinataire : ${beneficiaryName} (#${numericUserId})\n\n` +
        `Le destinataire recevra 100 % du montant.\n` +
        `La commission sera calculée selon le taux administré par le serveur.\n\n` +
        `Cette opération est définitive.`
    );

    if (!confirmed) return;

    setRecovering(true);

    try {
      const data = await apiRequest("/ambassade/recover", {
        method: "POST",
        body: JSON.stringify({
          tid: cleanTid,
          amount: numericAmount,
          userId: numericUserId,
        }),
      });

      const operation = data?.operation;

      if (!data?.success || !operation) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Le serveur n'a pas confirmé la récupération."
        );
      }

      // ------------------------------------------------
      // MONTANT RÉEL
      // ------------------------------------------------

      const recoveredAmount = Number(operation.amount);

      if (!Number.isFinite(recoveredAmount)) {
        throw new Error(
          "Le serveur a retourné un montant de récupération invalide."
        );
      }

      // ------------------------------------------------
      // COMMISSION ET TAUX RÉELS
      //
      // Contrat du routeur :
      // operation.ambassador.commissionRate
      // operation.ambassador.commission
      // ------------------------------------------------

      const serverAmbassador = operation.ambassador || {};

      const serverRate = Number(serverAmbassador.commissionRate);
      const serverCommission = Number(serverAmbassador.commission);

      if (
        !Number.isFinite(serverRate) ||
        serverRate < 0 ||
        serverRate > MAX_COMMISSION_RATE
      ) {
        throw new Error(
          "Le serveur n'a pas retourné un taux de commission valide."
        );
      }

      if (!Number.isFinite(serverCommission) || serverCommission < 0) {
        throw new Error(
          "Le serveur n'a pas retourné une commission valide."
        );
      }

      setCommissionRate(serverRate);

      const operationUser = operation.user || {};

      const finalBeneficiaryName =
        operationUser.username ||
        operationUser.name ||
        beneficiaryName ||
        `#${numericUserId}`;

      // ------------------------------------------------
      // HISTORIQUE LOCAL
      // ------------------------------------------------

      const historyOperation = normalizeHistoryOperation({
        id:
          operation.transactionId ||
          `${cleanTid}-${Date.now()}`,
        transactionId: operation.transactionId || null,
        tid: operation.tid || cleanTid,
        amount: recoveredAmount,
        commission: serverCommission,
        userId: operationUser.id ?? numericUserId,
        username:
          operationUser.username ||
          operationUser.name ||
          finalBeneficiaryName,
        customId:
          operationUser.custom_id ||
          operationUser.customId ||
          "",
        status: operation.status || "completed",
        date:
          operation.createdAt ||
          operation.created_at ||
          new Date().toISOString(),
      });

      setHistory((previous) =>
        [historyOperation, ...previous].slice(0, 100)
      );

      setSuccess(
        `${data.message || "Récupération effectuée avec succès."} ` +
          `Commission réelle : ${formatCDF(serverCommission)} ` +
          `(${formatRate(serverRate)}).`
      );

      // ------------------------------------------------
      // RÉINITIALISATION DU FORMULAIRE
      // ------------------------------------------------

      setTid("");
      setAmount("");
      setUserId("");
      setBeneficiary(null);

      // ------------------------------------------------
      // RAFRAÎCHISSEMENT DE L'HISTORIQUE OFFICIEL
      // ------------------------------------------------

      try {
        const historyData = await apiRequest("/ambassade/history");

        if (Array.isArray(historyData.history)) {
          setHistory(
            historyData.history.map(normalizeHistoryOperation)
          );
        }
      } catch {
        // La récupération est déjà confirmée par le serveur.
      }
    } catch (err) {
      setError(
        err.message || "La récupération du fonds a échoué."
      );
    } finally {
      setRecovering(false);
    }
  };

  // ====================================================
  // RÉINITIALISATION
  // ====================================================

  const clearForm = () => {
    if (recovering) return;

    setTid("");
    setAmount("");
    setUserId("");
    setBeneficiary(null);
    setLoadingBeneficiary(false);
    resetMessages();
  };

  // ====================================================
  // RENDU
  // ====================================================

  return (
    <div className="ambassade-page">
      <header className="ambassade-header">
        <div>
          <span className="ambassade-kicker">
            SAJCL • FINANCEMENT
          </span>

          <h1>Espace Ambassadeur</h1>

          <p>
            Créditez les comptes de vos recrues à partir des fonds
            validés par l'administration.
          </p>
        </div>

        <div className="ambassade-status">
          <span className="status-dot" />
          Ambassadeur actif
        </div>
      </header>

      {/* STATISTIQUES PERSONNELLES */}

      <section className="ambassade-stats">
        <div className="ambassade-stat-card">
          <div className="stat-icon">💰</div>
          <div>
            <span>Fonds récupérés</span>
            <strong>{formatCDF(totalRecovered)}</strong>
          </div>
        </div>

        <div className="ambassade-stat-card">
          <div className="stat-icon">📈</div>
          <div>
            <span>Mes commissions</span>
            <strong>{formatCDF(totalCommission)}</strong>
          </div>
        </div>

        <div className="ambassade-stat-card">
          <div className="stat-icon">🔄</div>
          <div>
            <span>Mes opérations</span>
            <strong>{history.length}</strong>
          </div>
        </div>

        <div className="ambassade-stat-card commission-card">
          <div className="stat-icon">%</div>
          <div>
            <span>Taux ambassadeur</span>
            <strong>{formatRate(commissionRate)}</strong>
          </div>
        </div>
      </section>

      {/* CIRCUIT */}

      <section className="ambassade-flow">
        <div className="flow-step">
          <div className="flow-number">1</div>
          <div>
            <strong>Votre recrue</strong>
            <span>Verse à la caisse officielle C.O.6</span>
          </div>
        </div>

        <div className="flow-line" />

        <div className="flow-step">
          <div className="flow-number">2</div>
          <div>
            <strong>Administration</strong>
            <span>Valide et enregistre le TID</span>
          </div>
        </div>

        <div className="flow-line" />

        <div className="flow-step">
          <div className="flow-number">3</div>
          <div>
            <strong>Ambassadeur</strong>
            <span>Crédite le compte du destinataire</span>
          </div>
        </div>
      </section>

      <main className="ambassade-content">
        {/* FORMULAIRE DE RÉCUPÉRATION */}

        <section className="recovery-card">
          <div className="card-heading">
            <div>
              <span className="section-label">OPÉRATION</span>
              <h2>Récupérer un fonds</h2>
              <p>Saisissez le TID, le montant et l'ID du destinataire.</p>
            </div>

            <div className="secure-badge">
              🔐 Opération sécurisée
            </div>
          </div>

          <form onSubmit={handleRecover} className="recovery-form">
            <div className="field-group tid-field">
              <label htmlFor="tid">TID du fonds</label>

              <input
                id="tid"
                type="text"
                value={tid}
                onChange={handleTidChange}
                placeholder="Ex. CO260821.1659.T32121"
                autoComplete="off"
                disabled={recovering}
                required
              />

              <small>
                Saisissez le TID communiqué après validation du fonds
                par l'administration.
              </small>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="amount">Montant</label>

                <div className="amount-input">
                  <input
                    id="amount"
                    type="number"
                    min={MIN_AMOUNT}
                    step="1"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Montant en CDF"
                    disabled={recovering}
                    required
                  />
                  <span>CDF</span>
                </div>

                <small>Minimum : {formatCDF(MIN_AMOUNT)}</small>
              </div>

              <div className="field-group">
                <label htmlFor="userId">ID du destinataire</label>

                <input
                  id="userId"
                  type="number"
                  min="1"
                  step="1"
                  value={userId}
                  onChange={handleUserIdChange}
                  onBlur={handleBeneficiaryLookup}
                  placeholder="Ex. 25"
                  autoComplete="off"
                  disabled={recovering}
                  required
                />

                <small>
                  ID du compte qui recevra 100 % du fonds.
                </small>

                {loadingBeneficiary && (
                  <div className="beneficiary-status">
                    🔎 Identification du destinataire...
                  </div>
                )}

                {!loadingBeneficiary && beneficiary && (
                  <div className="beneficiary-found">
                    <span className="beneficiary-icon">✓</span>
                    <div>
                      <small>Destinataire identifié</small>
                      <strong>
                        {getBeneficiaryName() || `#${beneficiary.id}`}
                      </strong>
                      {beneficiary.custom_id && (
                        <small>
                          Identifiant : {beneficiary.custom_id}
                        </small>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RÉCAPITULATIF FINANCIER */}

            <div className="commission-box">
              <div className="commission-row">
                <span>Crédit destinataire</span>
                <strong>{formatCDF(Number(amount) || 0)}</strong>
              </div>

              <div className="commission-row">
                <span>
                  Votre commission
                  <small>{formatRate(commissionRate)}</small>
                </span>

                <strong className="commission-value">
                  {commission === null
                    ? "Taux non encore communiqué"
                    : `+ ${formatCDF(commission)}`}
                </strong>
              </div>

              <div className="commission-separator" />

              <div className="commission-info">
                <span>ℹ️</span>
                <p>
                  Le destinataire reçoit l'intégralité du montant.
                  La commission est financée séparément par le compte
                  système PLT777. Le taux appliqué est celui configuré
                  par l'administration. Le montant officiel est celui
                  confirmé par le serveur après récupération.
                </p>
              </div>
            </div>

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
                  loadingBeneficiary ||
                  !tid.trim() ||
                  !amount ||
                  !userId ||
                  !beneficiary ||
                  Number(beneficiary?.id) !== Number(userId)
                }
              >
                {recovering
                  ? "Récupération en cours..."
                  : "Récupérer et créditer"}
              </button>
            </div>
          </form>
        </section>

        {/* HISTORIQUE PERSONNEL */}

        <section className="history-card">
          <div className="card-heading">
            <div>
              <span className="section-label">JOURNAL</span>
              <h2>Mes dernières récupérations</h2>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="empty-history">
              <div className="empty-icon">📋</div>
              <strong>Aucune récupération</strong>
              <p>
                Vos opérations apparaîtront ici après chaque
                récupération réussie.
              </p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((operation, index) => (
                <div
                  className="history-item"
                  key={
                    operation.id ||
                    operation.transactionId ||
                    `${operation.tid}-${index}`
                  }
                >
                  <div className="history-main">
                    <div className="history-icon">✓</div>

                    <div>
                      <strong>{formatCDF(operation.amount)}</strong>

                      <span>TID : {operation.tid || "—"}</span>

                      <span>
                        Destinataire #{operation.userId ?? "—"}
                        {operation.username
                          ? ` • ${operation.username}`
                          : ""}
                      </span>

                      {operation.customId && (
                        <span>Identifiant : {operation.customId}</span>
                      )}

                      {operation.date && (
                        <span>
                          Date :{" "}
                          {new Date(operation.date).toLocaleString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="history-commission">
                    <span>Commission</span>
                    <strong>
                      + {formatCDF(operation.commission)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* RAPPEL */}

      <footer className="ambassade-footer">
        <div>
          <strong>🛡️ Responsabilité Ambassadeur</strong>
          <p>
            Vérifiez toujours le TID, le montant et l'identité du
            destinataire avant de confirmer. Une récupération validée
            est définitive.
          </p>
        </div>

        <div className="footer-rule">
          <span>Règle financière</span>
          <strong>100 % utilisateur + commission administrée</strong>
        </div>
      </footer>
    </div>
  );
}
