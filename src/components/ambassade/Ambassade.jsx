import React, { useEffect, useMemo, useState } from "react";
import "./Ambassade.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const COMMISSION_RATE = 0.015;
const MIN_AMOUNT = 500;

const formatCDF = (value) => {
  const amount = Number(value || 0);

  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(amount) + " CDF"
  );
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
  // ======================================================
  // FORMULAIRE
  // ======================================================

  const [tid, setTid] = useState("");
  const [amount, setAmount] = useState("");
  const [userId, setUserId] = useState("");

  // ======================================================
  // DONNÉES VÉRIFIÉES
  // ======================================================

  const [fund, setFund] = useState(null);
  const [beneficiary, setBeneficiary] = useState(null);

  // ======================================================
  // ÉTATS
  // ======================================================

  const [loadingTid, setLoadingTid] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======================================================
  // HISTORIQUE
  // ======================================================

  const [history, setHistory] = useState([]);

  // ======================================================
  // COMMISSION
  // ======================================================

  const commission = useMemo(() => {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.round(
      value * COMMISSION_RATE * 100
    ) / 100;
  }, [amount]);

  // ======================================================
  // STATISTIQUES
  // ======================================================

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

  // ======================================================
  // CHARGEMENT HISTORIQUE
  //
  // IMPORTANT :
  // On ne considère plus localStorage comme journal
  // financier officiel.
  //
  // Si l'endpoint existe :
  // GET /api/ambassador/funds/history
  //
  // l'historique est chargé depuis le backend.
  // ======================================================

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await apiRequest(
          "/api/ambassador/funds/history"
        );

        if (
          !cancelled &&
          data &&
          Array.isArray(data.operations)
        ) {
          setHistory(data.operations);
        }
      } catch {
        // L'historique ne doit pas empêcher
        // l'Ambassadeur de faire une récupération.
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  // ======================================================
  // MESSAGES
  // ======================================================

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  // ======================================================
  // RECHERCHE DU TID
  //
  // Cette opération ne donne PAS accès à la liste
  // des fonds en circulation.
  //
  // Elle vérifie uniquement le TID fourni par
  // l'Ambassadeur.
  // ======================================================

  const handleLookupTid = async () => {
    resetMessages();

    const cleanTid = tid.trim();

    if (!cleanTid) {
      setError("Veuillez saisir le TID.");
      return;
    }

    setLoadingTid(true);
    setFund(null);
    setBeneficiary(null);

    try {
      const data = await apiRequest(
        `/api/ambassador/funds/tid/${encodeURIComponent(
          cleanTid
        )}`
      );

      if (!data.success || !data.fund) {
        throw new Error(
          "Fonds introuvable ou indisponible."
        );
      }

      const verifiedFund = data.fund;

      if (
        verifiedFund.status !== "circulating"
      ) {
        throw new Error(
          "Ce fonds n'est plus disponible pour une récupération."
        );
      }

      setFund(verifiedFund);

      // Le montant officiel du TID devient automatiquement
      // le montant de l'opération.
      setAmount(
        String(verifiedFund.amount)
      );
    } catch (err) {
      setFund(null);
      setAmount("");
      setError(err.message);
    } finally {
      setLoadingTid(false);
    }
  };

  // ======================================================
  // CHANGEMENT TID
  // ======================================================

  const handleTidChange = (event) => {
    const value = event.target.value;

    setTid(value);

    // Dès que le TID change, l'ancien fonds vérifié
    // n'est plus considéré comme valide.
    setFund(null);
    setBeneficiary(null);

    setAmount("");
    resetMessages();
  };

  // ======================================================
  // CHANGEMENT MONTANT
  // ======================================================

  const handleAmountChange = (event) => {
    const value = event.target.value;

    setAmount(value);
    setBeneficiary(null);

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

  // ======================================================
  // CHANGEMENT ID UTILISATEUR
  // ======================================================

  const handleUserIdChange = (event) => {
    const value = event.target.value;

    setUserId(value);
    setBeneficiary(null);
    setError("");
  };

  // ======================================================
  // VALIDATION AVANT CONFIRMATION
  // ======================================================

  const validateOperation = () => {
    const cleanTid = tid.trim();
    const numericAmount = Number(amount);
    const numericUserId = Number(userId);

    if (!cleanTid) {
      return "Le TID est obligatoire.";
    }

    if (!fund) {
      return "Veuillez d'abord vérifier le TID.";
    }

    if (fund.status !== "circulating") {
      return "Ce fonds n'est plus disponible.";
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < MIN_AMOUNT
    ) {
      return `Le montant minimum est de ${formatCDF(
        MIN_AMOUNT
      )}.`;
    }

    if (
      Number(fund.amount) !== numericAmount
    ) {
      return `Le montant ne correspond pas au TID. Montant attendu : ${formatCDF(
        fund.amount
      )}.`;
    }

    if (
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0
    ) {
      return "Veuillez saisir un ID utilisateur valide.";
    }

    return null;
  };

  // ======================================================
  // RÉCUPÉRATION
  // ======================================================

  const handleRecover = async (event) => {
    event.preventDefault();

    resetMessages();

    const validationError =
      validateOperation();

    if (validationError) {
      setError(validationError);
      return;
    }

    const cleanTid = tid.trim();
    const numericAmount = Number(amount);
    const numericUserId = Number(userId);

    // ====================================================
    // CONFIRMATION
    // ====================================================

    // Si le backend connaît déjà le bénéficiaire après
    // vérification, son nom sera utilisé.
    //
    // Sinon, on affiche temporairement son ID.
    const beneficiaryName =
      beneficiary?.username ||
      beneficiary?.name ||
      `l'utilisateur #${numericUserId}`;

    const confirmed = window.confirm(
      `Voulez-vous vraiment récupérer ${formatCDF(
        numericAmount
      )} pour ${beneficiaryName} ?\n\n` +
        `TID : ${cleanTid}\n` +
        `ID utilisateur : ${numericUserId}\n\n` +
        `Le bénéficiaire recevra 100 % du montant.\n` +
        `Votre commission de 1,5 % sera créditée séparément.\n\n` +
        `Cette opération est définitive.`
    );

    if (!confirmed) {
      return;
    }

    // ====================================================
    // PROTECTION DOUBLE CLIC
    // ====================================================

    if (recovering) {
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

      const recoveredAmount =
        Number(operation.amount) ||
        numericAmount;

      const recoveredCommission =
        Number(
          operation.ambassador?.commission
        ) ||
        Math.round(
          recoveredAmount *
            COMMISSION_RATE *
            100
        ) / 100;

      const operationUser =
        operation.user || {};

      const historyOperation = {
        id:
          operation.transactionId ||
          operation.id ||
          `${cleanTid}-${Date.now()}`,

        tid:
          operation.tid ||
          cleanTid,

        amount: recoveredAmount,

        commission:
          recoveredCommission,

        userId:
          operationUser.id ||
          numericUserId,

        username:
          operationUser.username ||
          operationUser.name ||
          "",

        customId:
          operationUser.custom_id ||
          "",

        status:
          operation.status ||
          "approved",

        date:
          operation.createdAt ||
          operation.created_at ||
          new Date().toISOString(),
      };

      // ====================================================
      // HISTORIQUE LOCAL TEMPORAIRE D'AFFICHAGE
      //
      // Le backend reste la source officielle.
      // ====================================================

      setHistory((previous) => [
        historyOperation,
        ...previous,
      ].slice(0, 20));

      // ====================================================
      // SUCCÈS
      // ====================================================

      setSuccess(
        data.message ||
          `${formatCDF(
            recoveredAmount
          )} ont été crédités avec succès à l'utilisateur.`
      );

      // ====================================================
      // RESET
      // ====================================================

      setTid("");
      setAmount("");
      setUserId("");

      setFund(null);
      setBeneficiary(null);

      // ====================================================
      // RAFRAÎCHISSEMENT DE L'HISTORIQUE BACKEND
      // ====================================================

      try {
        const historyData =
          await apiRequest(
            "/api/ambassador/funds/history"
          );

        if (
          historyData &&
          Array.isArray(
            historyData.operations
          )
        ) {
          setHistory(
            historyData.operations
          );
        }
      } catch {
        // Le succès de la récupération reste valide
        // même si le rafraîchissement de l'historique
        // échoue.
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRecovering(false);
    }
  };

  // ======================================================
  // RÉINITIALISATION
  // ======================================================

  const clearForm = () => {
    if (recovering) {
      return;
    }

    setTid("");
    setAmount("");
    setUserId("");

    setFund(null);
    setBeneficiary(null);

    resetMessages();
  };

  // ======================================================
  // RENDU
  // ======================================================

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
            Créditez les comptes de vos recrues à
            partir des fonds validés par
            l'administration.
          </p>
        </div>

        <div className="ambassade-status">
          <span className="status-dot" />
          Ambassadeur actif
        </div>
      </header>


      {/* ==================================================
          KPI PERSONNELS
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
            <span>Mes opérations</span>

            <strong>
              {history.length}
            </strong>
          </div>
        </div>


        <div className="ambassade-stat-card commission-card">
          <div className="stat-icon">
            1,5%
          </div>

          <div>
            <span>Taux ambassadeur</span>

            <strong>
              Commission
            </strong>
          </div>
        </div>

      </section>


      {/* ==================================================
          CIRCUIT
      ================================================== */}

      <section className="ambassade-flow">

        <div className="flow-step">
          <div className="flow-number">
            1
          </div>

          <div>
            <strong>
              Votre recrue
            </strong>

            <span>
              Verse à la caisse officielle C.O.6
            </span>
          </div>
        </div>


        <div className="flow-line" />


        <div className="flow-step">
          <div className="flow-number">
            2
          </div>

          <div>
            <strong>
              Administration
            </strong>

            <span>
              Valide et enregistre le TID
            </span>
          </div>
        </div>


        <div className="flow-line" />


        <div className="flow-step">
          <div className="flow-number">
            3
          </div>

          <div>
            <strong>
              Ambassadeur
            </strong>

            <span>
              Crédite le compte du bénéficiaire
            </span>
          </div>
        </div>

      </section>


      <main className="ambassade-content">

        {/* ==================================================
            RÉCUPÉRATION
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
                Saisissez uniquement le TID,
                le montant et l'ID du bénéficiaire.
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

            {/* ==================================================
                TID
            ================================================== */}

            <div className="field-group tid-field">

              <label htmlFor="tid">
                TID du fonds
              </label>

              <div className="tid-input-row">

                <input
                  id="tid"
                  type="text"
                  value={tid}
                  onChange={handleTidChange}
                  placeholder="Ex. CO260821.1659.T32121"
                  autoComplete="off"
                  disabled={recovering}
                />

                <button
                  type="button"
                  className="lookup-button"
                  onClick={handleLookupTid}
                  disabled={
                    loadingTid ||
                    recovering ||
                    !tid.trim()
                  }
                >
                  {loadingTid
                    ? "Vérification..."
                    : "Vérifier"}
                </button>

              </div>

              <small>
                Le TID doit avoir été préalablement
                enregistré et validé par l'administration.
              </small>

            </div>


            {/* ==================================================
                FONDS VÉRIFIÉ
            ================================================== */}

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
                    <span>
                      TID
                    </span>

                    <strong>
                      {fund.tid}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Montant enregistré
                    </span>

                    <strong>
                      {formatCDF(
                        fund.amount
                      )}
                    </strong>
                  </div>


                  <div>
                    <span>
                      État
                    </span>

                    <strong>
                      Disponible
                    </strong>
                  </div>

                </div>

              </div>
            )}


            {/* ==================================================
                MONTANT + ID USER
            ================================================== */}

            <div className="form-grid">

              <div className="field-group">

                <label htmlFor="amount">
                  Montant
                </label>

                <div className="amount-input">

                  <input
                    id="amount"
                    type="number"
                    min={MIN_AMOUNT}
                    step="1"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Montant en CDF"
                    disabled={
                      recovering ||
                      !fund
                    }
                  />

                  <span>
                    CDF
                  </span>

                </div>

                <small>
                  Minimum :{" "}
                  {formatCDF(MIN_AMOUNT)}
                </small>

              </div>


              <div className="field-group">

                <label htmlFor="userId">
                  ID du bénéficiaire
                </label>

                <input
                  id="userId"
                  type="number"
                  min="1"
                  step="1"
                  value={userId}
                  onChange={handleUserIdChange}
                  placeholder="Ex. 25"
                  disabled={recovering}
                />

                <small>
                  ID du compte qui recevra
                  100 % du fonds.
                </small>

              </div>

            </div>


            {/* ==================================================
                RÉCAPITULATIF FINANCIER
            ================================================== */}

            <div className="commission-box">

              <div className="commission-row">

                <span>
                  Crédit bénéficiaire
                </span>

                <strong>
                  {formatCDF(
                    Number(amount) || 0
                  )}
                </strong>

              </div>


              <div className="commission-row">

                <span>
                  Votre commission
                  <small>
                    1,5 %
                  </small>
                </span>

                <strong className="commission-value">
                  +{" "}
                  {formatCDF(
                    commission
                  )}
                </strong>

              </div>


              <div className="commission-separator" />


              <div className="commission-info">

                <span>
                  ℹ️
                </span>

                <p>
                  Le bénéficiaire reçoit
                  l'intégralité du montant.
                  Votre commission de 1,5 % est
                  générée séparément dans votre
                  portefeuille ambassadeur.
                </p>

              </div>

            </div>


            {/* ==================================================
                ALERTES
            ================================================== */}

            {error && (
              <div className="ambassade-alert error">

                <span>
                  ⚠
                </span>

                {error}

              </div>
            )}


            {success && (
              <div className="ambassade-alert success">

                <span>
                  ✓
                </span>

                {success}

              </div>
            )}


            {/* ==================================================
                ACTIONS
            ================================================== */}

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
                  !fund ||
                  !tid.trim() ||
                  !amount ||
                  !userId
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
            HISTORIQUE PERSONNEL
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

              {history.map(
                (operation, index) => (

                  <div
                    className="history-item"
                    key={
                      operation.id ||
                      operation.transactionId ||
                      `${operation.tid}-${index}`
                    }
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
                          TID :{" "}
                          {operation.tid}
                        </span>


                        <span>
                          Utilisateur #
                          {operation.userId}

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

                )
              )}

            </div>

          )}

        </section>

      </main>


      {/* ==================================================
          RAPPEL
      ================================================== */}

      <footer className="ambassade-footer">

        <div>

          <strong>
            🛡️ Responsabilité Ambassadeur
          </strong>

          <p>
            Vérifiez toujours le TID, le montant
            et l'ID du bénéficiaire avant de confirmer.
            Une récupération validée est définitive.
          </p>

        </div>


        <div className="footer-rule">

          <span>
            Règle financière
          </span>

          <strong>
            100% utilisateur + 1,5% ambassadeur
          </strong>

        </div>

      </footer>

    </div>
  );
}
