import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * ============================================================
 * AI CONTROL PANEL
 * ============================================================
 *
 * Panneau d'administration IA 6BetBall.
 *
 * Source de vérité :
 * - les paramètres viennent du backend
 * - le wallet vient du backend
 * - après chaque opération, les données sont relues
 *
 * Paramètres backend utilisés :
 *
 * enabled
 * experience_percent
 * spawn_rate
 * max_active_bots
 * join_public_games
 * replace_missing_players
 *
 * Opérations financières :
 *
 * creditBot()
 * transferToSystem()
 *
 * Pas de débit séparé :
 * le transfert IA -> plateforme effectue déjà le débit
 * du wallet IA dans une transaction backend.
 * ============================================================
 */

export default function AIControlPanel({
  ai,
  saveSettings,
  creditBot,
  transferToSystem,
  refreshAI,
  money,
  actionLoading = false,
}) {
  // ==========================================================
  // PARAMÈTRES LOCAUX
  // ==========================================================

  const [enabled, setEnabled] = useState(true);

  const [difficulty, setDifficulty] = useState(50);

  const [spawnRate, setSpawnRate] = useState(50);

  const [maxBots, setMaxBots] = useState(100);

  const [joinPublicGames, setJoinPublicGames] =
    useState(false);

  const [replaceMissingPlayers, setReplaceMissingPlayers] =
    useState(false);

  // ==========================================================
  // OPÉRATIONS FINANCIÈRES
  // ==========================================================

  const [creditAmount, setCreditAmount] = useState("");

  const [transferAmount, setTransferAmount] =
    useState("");

  // ==========================================================
  // ÉTAT UI
  // ==========================================================

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] =
    useState("info");

  const [loading, setLoading] = useState(false);

  // ==========================================================
  // NORMALISATION DES DONNÉES SERVEUR
  // ==========================================================
  //
  // Le backend peut actuellement être reçu sous plusieurs
  // niveaux :
  //
  // response.data.settings
  // response.settings
  // ai.settings
  // ai.settings.settings
  //
  // On normalise ici pour éviter que l'interface affiche
  // artificiellement les valeurs par défaut.
  // ==========================================================

  const serverSettings = useMemo(() => {
    const raw =
      ai?.settings?.settings ??
      ai?.settings?.data?.settings ??
      ai?.settings ??
      {};

    return raw || {};
  }, [ai]);

  const serverWallet = useMemo(() => {
    const raw =
      ai?.wallet?.wallet ??
      ai?.wallet?.data?.wallet ??
      ai?.wallet ??
      ai?.user?.wallet ??
      ai?.user ??
      {};

    return raw || {};
  }, [ai]);

  // ==========================================================
  // INITIALISATION DES PARAMÈTRES
  // ==========================================================

  useEffect(() => {
    if (!serverSettings) {
      return;
    }

    setEnabled(
      Boolean(
        serverSettings.enabled
      )
    );

    setDifficulty(
      normalizeNumber(
        serverSettings.experience_percent,
        50,
        0,
        100
      )
    );

    setSpawnRate(
      normalizeNumber(
        serverSettings.spawn_rate,
        50,
        0,
        100
      )
    );

    setMaxBots(
      normalizeNumber(
        serverSettings.max_active_bots,
        100,
        1,
        10000
      )
    );

    setJoinPublicGames(
      Boolean(
        serverSettings.join_public_games
      )
    );

    setReplaceMissingPlayers(
      Boolean(
        serverSettings.replace_missing_players
      )
    );
  }, [serverSettings]);

  // ==========================================================
  // WALLET
  // ==========================================================

  const wallet = useMemo(() => {
    return {
      available: toNumber(
        serverWallet?.balance_available ??
        serverWallet?.balance ??
        0
      ),

      locked: toNumber(
        serverWallet?.balance_locked ??
        0
      ),

      username:
        serverWallet?.username ??
        "IA",
    };
  }, [serverWallet]);

  // ==========================================================
  // ÉTAT GLOBAL
  // ==========================================================

  const busy =
    loading ||
    Boolean(actionLoading);

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    if (
      typeof refreshAI !==
      "function"
    ) {
      return;
    }

    let mounted = true;

    const loadAI = async () => {
      try {
        setLoading(true);

        await refreshAI();

        if (mounted) {
          setMessage("");
        }

      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error(
          "❌ AI CONTROL PANEL LOAD :",
          error
        );

        showMessage(
          getErrorMessage(
            error,
            "Les données IA n'ont pas pu être chargées."
          ),
          "error"
        );

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAI();

    return () => {
      mounted = false;
    };
  }, [refreshAI]);

  // ==========================================================
  // SAUVEGARDE DES PARAMÈTRES
  // ==========================================================

  const handleSaveSettings = async () => {
    if (
      typeof saveSettings !==
      "function"
    ) {
      showMessage(
        "Le service de sauvegarde IA n'est pas disponible.",
        "error"
      );

      return;
    }

    try {
      setLoading(true);
      setMessage("");

      // ------------------------------------------------------
      // PAYLOAD EXACTEMENT ALIGNÉ SUR LE BACKEND
      // ------------------------------------------------------

      const payload = {
        enabled:
          Boolean(enabled),

        experience_percent:
          normalizeNumber(
            difficulty,
            50,
            0,
            100
          ),

        spawn_rate:
          normalizeNumber(
            spawnRate,
            50,
            0,
            100
          ),

        max_active_bots:
          normalizeNumber(
            maxBots,
            100,
            1,
            10000
          ),

        join_public_games:
          Boolean(
            joinPublicGames
          ),

        replace_missing_players:
          Boolean(
            replaceMissingPlayers
          ),
      };

      console.log(
        "🤖 AI SETTINGS PAYLOAD :",
        payload
      );

      // ------------------------------------------------------
      // SAUVEGARDE
      // ------------------------------------------------------

      const response =
        await saveSettings(
          payload
        );

      console.log(
        "✅ AI SETTINGS RESPONSE :",
        response
      );

      // ------------------------------------------------------
      // IMPORTANT
      // ------------------------------------------------------
      //
      // AdminDashboard doit relire les données serveur.
      // On ne remplace donc PAS les valeurs locales
      // avec une valeur supposée.
      //
      // refreshAI est déjà appelé par saveSettings dans
      // AdminDashboard.
      // ------------------------------------------------------

      showMessage(
        "Configuration IA enregistrée avec succès.",
        "success"
      );

    } catch (error) {
      console.error(
        "❌ AI SETTINGS SAVE :",
        error
      );

      showMessage(
        getErrorMessage(
          error,
          "Impossible d'enregistrer la configuration IA."
        ),
        "error"
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // CRÉDITER LE WALLET IA
  // ==========================================================

  const handleCredit = async () => {
    if (
      typeof creditBot !==
      "function"
    ) {
      showMessage(
        "Le service de crédit du portefeuille IA n'est pas disponible.",
        "error"
      );

      return;
    }

    const amount =
      parseAmount(
        creditAmount
      );

    if (amount <= 0) {
      showMessage(
        "Veuillez saisir un montant supérieur à zéro.",
        "error"
      );

      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response =
        await creditBot(
          amount
        );

      console.log(
        "💰 AI CREDIT RESPONSE :",
        response
      );

      setCreditAmount("");

      // ------------------------------------------------------
      // RELIRE LE WALLET RÉEL APRÈS CRÉDIT
      // ------------------------------------------------------

      if (
        typeof refreshAI ===
        "function"
      ) {
        await refreshAI();
      }

      showMessage(
        `Le portefeuille IA a été crédité de ${formatMoneyValue(
          amount,
          money
        )}.`,
        "success"
      );

    } catch (error) {
      console.error(
        "❌ AI CREDIT :",
        error
      );

      showMessage(
        getErrorMessage(
          error,
          "Impossible de créditer le portefeuille IA."
        ),
        "error"
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // TRANSFERT IA → PLATEFORME
  // ==========================================================

  const handleTransfer = async () => {
    if (
      typeof transferToSystem !==
      "function"
    ) {
      showMessage(
        "Le service de transfert n'est pas disponible.",
        "error"
      );

      return;
    }

    const amount =
      parseAmount(
        transferAmount
      );

    if (amount <= 0) {
      showMessage(
        "Veuillez saisir un montant supérieur à zéro.",
        "error"
      );

      return;
    }

    // --------------------------------------------------------
    // PROTECTION FRONTEND
    // --------------------------------------------------------

    if (
      amount >
      wallet.available
    ) {
      showMessage(
        "Le montant demandé dépasse le solde disponible du portefeuille IA.",
        "error"
      );

      return;
    }

    // --------------------------------------------------------
    // CONFIRMATION
    // --------------------------------------------------------

    const confirmation =
      window.confirm(
        `Confirmer le transfert de ${formatMoneyValue(
          amount,
          money
        )} vers le portefeuille système ?`
      );

    if (!confirmation) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response =
        await transferToSystem(
          amount
        );

      console.log(
        "↗️ AI TRANSFER RESPONSE :",
        response
      );

      setTransferAmount("");

      // ------------------------------------------------------
      // RELIRE LE WALLET RÉEL APRÈS TRANSFERT
      // ------------------------------------------------------

      if (
        typeof refreshAI ===
        "function"
      ) {
        await refreshAI();
      }

      showMessage(
        `Le transfert de ${formatMoneyValue(
          amount,
          money
        )} a été effectué.`,
        "success"
      );

    } catch (error) {
      console.error(
        "❌ AI TRANSFER :",
        error
      );

      showMessage(
        getErrorMessage(
          error,
          "Impossible d'effectuer le transfert."
        ),
        "error"
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // ACTUALISATION MANUELLE
  // ==========================================================

  const handleRefresh = async () => {
    if (
      typeof refreshAI !==
      "function"
    ) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await refreshAI();

      showMessage(
        "Les données IA ont été actualisées.",
        "success"
      );

    } catch (error) {
      console.error(
        "❌ AI REFRESH :",
        error
      );

      showMessage(
        getErrorMessage(
          error,
          "Impossible d'actualiser les données IA."
        ),
        "error"
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <div style={styles.page}>

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <header style={styles.header}>

        <div style={styles.headerLeft}>

          <div style={styles.appIcon}>
            🤖
          </div>

          <div>

            <div style={styles.eyebrow}>
              ADMINISTRATION
            </div>

            <h1 style={styles.title}>
              Intelligence artificielle
            </h1>

            <p style={styles.subtitle}>
              Gérez le comportement et les ressources
              des agents IA de 6BetBall.
            </p>

          </div>

        </div>

        <div style={styles.headerActions}>

          <StatusBadge
            enabled={enabled}
          />

          <button
            type="button"
            style={{
              ...styles.refreshButton,
              ...(busy
                ? styles.buttonDisabled
                : {}),
            }}
            onClick={
              handleRefresh
            }
            disabled={busy}
          >
            {busy
              ? "Actualisation..."
              : "↻ Actualiser"}
          </button>

        </div>

      </header>

      {/* ================================================== */}
      {/* MESSAGE */}
      {/* ================================================== */}

      {message && (
        <div
          style={{
            ...styles.message,

            ...(messageType ===
            "success"
              ? styles.messageSuccess
              : messageType ===
                "error"
              ? styles.messageError
              : styles.messageInfo),
          }}
        >

          <span>
            {messageType ===
            "success"
              ? "✓"
              : messageType ===
                "error"
              ? "!"
              : "i"}
          </span>

          <span>
            {message}
          </span>

        </div>
      )}

      {/* ================================================== */}
      {/* CONTENU */}
      {/* ================================================== */}

      <main style={styles.content}>

        {/* ================================================= */}
        {/* WALLET */}
        {/* ================================================= */}

        <section style={styles.section}>

          <SectionHeader
            icon="💳"
            title="Ressources"
            description="État réel actuel des ressources financières de l'IA."
          />

          <div style={styles.walletGrid}>

            <WalletCard
              title="Solde disponible"
              value={formatMoneyValue(
                wallet.available,
                money
              )}
              icon="💰"
              description="Solde réellement disponible dans le wallet IA"
            />

            <WalletCard
              title="Ressources engagées"
              value={formatMoneyValue(
                wallet.locked,
                money
              )}
              icon="🔒"
              description="Ressources actuellement verrouillées"
            />

            <WalletCard
              title="État du service"
              value={
                enabled
                  ? "Actif"
                  : "Désactivé"
              }
              icon={
                enabled
                  ? "●"
                  : "○"
              }
              description={
                enabled
                  ? "Les agents IA peuvent fonctionner"
                  : "Les agents IA sont arrêtés"
              }
            />

          </div>

        </section>

        {/* ================================================= */}
        {/* PARAMÈTRES */}
        {/* ================================================= */}

        <section style={styles.section}>

          <SectionHeader
            icon="⚙️"
            title="Paramètres IA"
            description="Ces valeurs correspondent directement aux colonnes de ai_settings."
          />

          <div style={styles.settingsCard}>

            {/* ACTIVATION */}

            <SettingRow
              title="Activer l'intelligence artificielle"
              description="Autorise les agents IA à fonctionner."
              right={
                <Toggle
                  checked={enabled}
                  onChange={
                    setEnabled
                  }
                  disabled={busy}
                />
              }
            />

            <Divider />

            {/* DIFFICULTÉ */}

            <SettingRow
              title="Niveau d'expérience"
              description="Correspond directement à experience_percent dans ai_settings."
              right={
                <ValueBadge>
                  {difficulty} %
                </ValueBadge>
              }
            />

            <Slider
              value={difficulty}
              min={0}
              max={100}
              step={1}
              onChange={
                setDifficulty
              }
              disabled={busy}
              leftLabel="Débutant"
              centerLabel="Intermédiaire"
              rightLabel="Expert"
            />

            <Divider />

            {/* SPAWN RATE */}

            <SettingRow
              title="Fréquence d'apparition"
              description="Correspond directement à spawn_rate dans ai_settings."
              right={
                <ValueBadge>
                  {spawnRate} %
                </ValueBadge>
              }
            />

            <Slider
              value={spawnRate}
              min={0}
              max={100}
              step={1}
              onChange={
                setSpawnRate
              }
              disabled={busy}
              leftLabel="Faible"
              centerLabel="Normal"
              rightLabel="Élevé"
            />

            <Divider />

            {/* MAX BOTS */}

            <SettingRow
              title="Nombre maximal d'agents actifs"
              description="Correspond directement à max_active_bots dans ai_settings."
              right={
                <ValueBadge>
                  {maxBots}
                </ValueBadge>
              }
            />

            <div style={styles.numberRow}>

              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                value={
                  maxBots
                }
                disabled={busy}
                onChange={(
                  event
                ) => {
                  const value =
                    Number(
                      event.target
                        .value
                    );

                  if (
                    Number.isFinite(
                      value
                    )
                  ) {
                    setMaxBots(
                      Math.min(
                        10000,
                        Math.max(
                          1,
                          value
                        )
                      )
                    );
                  }
                }}
                style={
                  styles.numberInput
                }
              />

              <span
                style={
                  styles.numberSuffix
                }
              >
                agents maximum
              </span>

            </div>

            <Divider />

            {/* JOIN PUBLIC GAMES */}

            <SettingRow
              title="Rejoindre les parties publiques"
              description="Correspond à join_public_games dans ai_settings."
              right={
                <Toggle
                  checked={
                    joinPublicGames
                  }
                  onChange={
                    setJoinPublicGames
                  }
                  disabled={busy}
                />
              }
            />

            <Divider />

            {/* REPLACE MISSING PLAYERS */}

            <SettingRow
              title="Remplacer les joueurs absents"
              description="Correspond à replace_missing_players dans ai_settings."
              right={
                <Toggle
                  checked={
                    replaceMissingPlayers
                  }
                  onChange={
                    setReplaceMissingPlayers
                  }
                  disabled={busy}
                />
              }
            />

            {/* SAUVEGARDE */}

            <div
              style={
                styles.saveArea
              }
            >

              <div>

                <strong
                  style={
                    styles.saveTitle
                  }
                >
                  Configuration IA
                </strong>

                <div
                  style={
                    styles.saveDescription
                  }
                >
                  Les six paramètres seront enregistrés
                  directement dans ai_settings.
                </div>

              </div>

              <button
                type="button"
                onClick={
                  handleSaveSettings
                }
                disabled={busy}
                style={{
                  ...styles.primaryButton,

                  ...(busy
                    ? styles.buttonDisabled
                    : {}),
                }}
              >
                {busy
                  ? "Enregistrement..."
                  : "Enregistrer"}
              </button>

            </div>

          </div>

        </section>

        {/* ================================================= */}
        {/* OPÉRATIONS FINANCIÈRES */}
        {/* ================================================= */}

        <section style={styles.section}>

          <SectionHeader
            icon="💰"
            title="Gestion des ressources"
            description="Gérez les ressources du wallet IA."
          />

          <div
            style={
              styles.operationsGrid
            }
          >

            {/* CREDIT */}

            <MoneyOperation
              icon="＋"
              title="Ajouter des ressources"
              description="Créditer le wallet IA."
              value={
                creditAmount
              }
              setValue={
                setCreditAmount
              }
              action={
                handleCredit
              }
              buttonLabel="Ajouter"
              disabled={busy}
              money={money}
            />

            {/* TRANSFERT */}

            <MoneyOperation
              icon="↗"
              title="Transférer vers le système"
              description="Transférer une partie du solde IA vers le wallet plateforme."
              value={
                transferAmount
              }
              setValue={
                setTransferAmount
              }
              action={
                handleTransfer
              }
              buttonLabel="Transférer"
              disabled={busy}
              money={money}
            />

          </div>

        </section>

      </main>

      {/* ================================================== */}
      {/* FOOTER */}
      {/* ================================================== */}

      <footer style={styles.footer}>

        <span>
          Intelligence artificielle
        </span>

        <span>
          Configuration administrateur
        </span>

      </footer>

    </div>
  );

  // ========================================================
  // MESSAGE LOCAL
  // ========================================================

  function showMessage(
    text,
    type = "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }
}

/* ============================================================
   COMPONENTS
   ============================================================ */

function SectionHeader({
  icon,
  title,
  description,
}) {
  return (
    <div
      style={
        styles.sectionHeader
      }
    >

      <div
        style={
          styles.sectionIcon
        }
      >
        {icon}
      </div>

      <div>

        <h2
          style={
            styles.sectionTitle
          }
        >
          {title}
        </h2>

        <p
          style={
            styles.sectionDescription
          }
        >
          {description}
        </p>

      </div>

    </div>
  );
}

function StatusBadge({
  enabled,
}) {
  return (
    <div
      style={{
        ...styles.statusBadge,

        ...(enabled
          ? styles.statusActive
          : styles.statusInactive),
      }}
    >

      <span
        style={
          styles.statusDot
        }
      >
        ●
      </span>

      {enabled
        ? "IA active"
        : "IA désactivée"}

    </div>
  );
}

function WalletCard({
  title,
  value,
  icon,
  description,
}) {
  return (
    <div
      style={
        styles.walletCard
      }
    >

      <div
        style={
          styles.walletIcon
        }
      >
        {icon}
      </div>

      <div
        style={
          styles.walletTitle
        }
      >
        {title}
      </div>

      <div
        style={
          styles.walletValue
        }
      >
        {value}
      </div>

      <div
        style={
          styles.walletDescription
        }
      >
        {description}
      </div>

    </div>
  );
}

function SettingRow({
  title,
  description,
  right,
}) {
  return (
    <div
      style={
        styles.settingRow
      }
    >

      <div
        style={
          styles.settingText
        }
      >

        <div
          style={
            styles.settingTitle
          }
        >
          {title}
        </div>

        <div
          style={
            styles.settingDescription
          }
        >
          {description}
        </div>

      </div>

      <div
        style={
          styles.settingControl
        }
      >
        {right}
      </div>

    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={
        checked
      }
      disabled={
        disabled
      }
      onClick={() => {
        if (!disabled) {
          onChange(
            !checked
          );
        }
      }}
      style={{
        ...styles.toggle,

        ...(checked
          ? styles.toggleOn
          : styles.toggleOff),

        ...(disabled
          ? styles.toggleDisabled
          : {}),
      }}
    >

      <span
        style={{
          ...styles.toggleThumb,

          ...(checked
            ? styles.toggleThumbOn
            : {}),
        }}
      />

    </button>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  leftLabel,
  centerLabel,
  rightLabel,
}) {
  return (
    <div
      style={
        styles.sliderContainer
      }
    >

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(
          event
        ) =>
          onChange(
            Number(
              event.target.value
            )
          )
        }
        style={
          styles.slider
        }
      />

      <div
        style={
          styles.sliderLabels
        }
      >

        <span>
          {leftLabel}
        </span>

        <span>
          {centerLabel}
        </span>

        <span>
          {rightLabel}
        </span>

      </div>

    </div>
  );
}

function ValueBadge({
  children,
}) {
  return (
    <div
      style={
        styles.valueBadge
      }
    >
      {children}
    </div>
  );
}

function MoneyOperation({
  icon,
  title,
  description,
  value,
  setValue,
  action,
  buttonLabel,
  disabled,
  money,
}) {
  return (
    <div
      style={
        styles.operationCard
      }
    >

      <div
        style={
          styles.operationHeader
        }
      >

        <div
          style={
            styles.operationIcon
          }
        >
          {icon}
        </div>

        <div>

          <h3
            style={
              styles.operationTitle
            }
          >
            {title}
          </h3>

          <p
            style={
              styles.operationDescription
            }
          >
            {description}
          </p>

        </div>

      </div>

      <div
        style={
          styles.operationInputRow
        }
      >

        <div
          style={
            styles.amountInputWrapper
          }
        >

          <input
            type="number"
            min="0"
            step="1"
            value={value}
            disabled={
              disabled
            }
            onChange={(
              event
            ) =>
              setValue(
                event.target
                  .value
              )
            }
            placeholder="Montant"
            style={
              styles.amountInput
            }
          />

          <span
            style={
              styles.currency
            }
          >
            FC
          </span>

        </div>

        <button
          type="button"
          onClick={action}
          disabled={
            disabled ||
            !value
          }
          style={{
            ...styles.operationButton,

            ...(disabled ||
            !value
              ? styles.buttonDisabled
              : {}),
          }}
        >
          {buttonLabel}
        </button>

      </div>

      {value && (
        <div
          style={
            styles.operationPreview
          }
        >
          Montant :{" "}
          <strong>
            {formatMoneyValue(
              Number(value),
              money
            )}
          </strong>
        </div>
      )}

    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

function Divider() {
  return (
    <div
      style={
        styles.divider
      }
    />
  );
}

function normalizeNumber(
  value,
  fallback,
  min,
  max
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      number
    )
  );
}

function toNumber(
  value
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function parseAmount(
  value
) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {
    return 0;
  }

  return amount;
}

function formatMoneyValue(
  value,
  money
) {
  if (
    typeof money ===
    "function"
  ) {
    return money(
      value
    );
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value || 0)
  );
}

function getErrorMessage(
  error,
  fallback
) {
  return (
    error?.response?.data
      ?.message ||
    error?.response?.data
      ?.error ||
    error?.message ||
    fallback
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg, #f3f6fb 0%, #eef2f7 100%)",
    color: "#1f2937",
    borderRadius: 4,
    overflow: "hidden",
    fontFamily:
      '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },

  header: {
    minHeight: 120,
    padding: "28px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    background:
      "linear-gradient(135deg, #ffffff 0%, #f7f9fc 100%)",
    borderBottom:
      "1px solid #dfe5ec",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },

  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0078d4",
    color: "#fff",
    fontSize: 26,
    boxShadow:
      "0 4px 12px rgba(0, 120, 212, 0.22)",
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#667085",
    marginBottom: 4,
  },

  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.2,
    fontWeight: 600,
    color: "#202020",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#667085",
    fontSize: 14,
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 12px",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 600,
    border:
      "1px solid transparent",
  },

  statusActive: {
    background: "#e8f5e9",
    color: "#107c10",
    borderColor: "#b7dfb7",
  },

  statusInactive: {
    background: "#fce8e6",
    color: "#c42b1c",
    borderColor: "#efb8b4",
  },

  statusDot: {
    fontSize: 9,
  },

  refreshButton: {
    minHeight: 38,
    padding: "0 16px",
    border:
      "1px solid #c8d0da",
    borderRadius: 3,
    background: "#fff",
    color: "#323130",
    fontWeight: 600,
    cursor: "pointer",
  },

  content: {
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },

  section: {
    background: "#fff",
    border:
      "1px solid #dfe5ec",
    boxShadow:
      "0 2px 8px rgba(0, 0, 0, 0.04)",
  },

  sectionHeader: {
    padding: "22px 24px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    borderBottom:
      "1px solid #e5e9ef",
  },

  sectionIcon: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#edf6fc",
    color: "#0078d4",
    fontSize: 20,
    borderRadius: 3,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: "#202020",
  },

  sectionDescription: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#667085",
  },

  walletGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 1,
    background: "#e5e9ef",
  },

  walletCard: {
    padding: 22,
    background: "#fff",
    minHeight: 130,
    boxSizing: "border-box",
  },

  walletIcon: {
    fontSize: 20,
    marginBottom: 12,
  },

  walletTitle: {
    fontSize: 13,
    color: "#667085",
    marginBottom: 6,
  },

  walletValue: {
    fontSize: 23,
    fontWeight: 600,
    color: "#202020",
  },

  walletDescription: {
    marginTop: 6,
    fontSize: 12,
    color: "#8a93a1",
  },

  settingsCard: {
    padding: 24,
  },

  settingRow: {
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
  },

  settingText: {
    minWidth: 0,
    flex: 1,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#323130",
  },

  settingDescription: {
    marginTop: 4,
    maxWidth: 760,
    fontSize: 13,
    lineHeight: 1.5,
    color: "#667085",
  },

  settingControl: {
    flexShrink: 0,
  },

  divider: {
    height: 1,
    background: "#e5e9ef",
    margin: "18px 0",
  },

  valueBadge: {
    minWidth: 62,
    padding: "7px 10px",
    textAlign: "center",
    borderRadius: 3,
    background: "#edf6fc",
    color: "#0078d4",
    fontWeight: 700,
    fontSize: 14,
  },

  sliderContainer: {
    marginTop: 8,
    padding: "0 4px",
  },

  slider: {
    width: "100%",
    accentColor: "#0078d4",
    cursor: "pointer",
  },

  sliderLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    color: "#8a93a1",
    marginTop: 4,
  },

  numberRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },

  numberInput: {
    width: 140,
    height: 42,
    boxSizing: "border-box",
    border:
      "1px solid #c8d0da",
    borderRadius: 3,
    padding: "0 12px",
    background: "#fff",
    color: "#202020",
    fontSize: 15,
    outline: "none",
  },

  numberSuffix: {
    color: "#667085",
    fontSize: 13,
  },

  toggle: {
    position: "relative",
    width: 48,
    height: 24,
    padding: 0,
    border: 0,
    borderRadius: 999,
    cursor: "pointer",
    transition:
      "background 0.15s ease",
  },

  toggleOn: {
    background: "#0078d4",
  },

  toggleOff: {
    background: "#a19f9d",
  },

  toggleDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  toggleThumb: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#fff",
    transition:
      "transform 0.15s ease",
    boxShadow:
      "0 1px 3px rgba(0,0,0,.25)",
  },

  toggleThumbOn: {
    transform:
      "translateX(24px)",
  },

  saveArea: {
    marginTop: 28,
    paddingTop: 22,
    borderTop:
      "1px solid #e5e9ef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },

  saveTitle: {
    fontSize: 14,
    color: "#323130",
  },

  saveDescription: {
    marginTop: 4,
    color: "#667085",
    fontSize: 12,
  },

  primaryButton: {
    minHeight: 42,
    padding: "0 20px",
    border: 0,
    borderRadius: 3,
    background: "#0078d4",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow:
      "0 2px 5px rgba(0,120,212,.18)",
  },

  buttonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  operationsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 1,
    background: "#e5e9ef",
  },

  operationCard: {
    padding: 24,
    background: "#fff",
  },

  operationHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 20,
  },

  operationIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f5f6",
    color: "#0078d4",
    fontSize: 20,
    borderRadius: 3,
  },

  operationTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "#323130",
  },

  operationDescription: {
    margin: "4px 0 0",
    fontSize: 12,
    lineHeight: 1.45,
    color: "#667085",
  },

  operationInputRow: {
    display: "flex",
    gap: 10,
  },

  amountInputWrapper: {
    position: "relative",
    flex: 1,
  },

  amountInput: {
    width: "100%",
    height: 42,
    boxSizing: "border-box",
    padding:
      "0 45px 0 12px",
    border:
      "1px solid #c8d0da",
    borderRadius: 3,
    background: "#fff",
    color: "#202020",
    fontSize: 14,
    outline: "none",
  },

  currency: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform:
      "translateY(-50%)",
    color: "#667085",
    fontSize: 12,
    fontWeight: 600,
  },

  operationButton: {
    minWidth: 110,
    height: 42,
    padding: "0 16px",
    border: 0,
    borderRadius: 3,
    background: "#0078d4",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },

  operationPreview: {
    marginTop: 10,
    fontSize: 12,
    color: "#667085",
  },

  message: {
    margin: "20px 32px 0",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 3,
    fontSize: 13,
    border:
      "1px solid transparent",
  },

  messageSuccess: {
    background: "#e8f5e9",
    color: "#107c10",
    borderColor: "#b7dfb7",
  },

  messageError: {
    background: "#fce8e6",
    color: "#c42b1c",
    borderColor: "#efb8b4",
  },

  messageInfo: {
    background: "#edf6fc",
    color: "#005a9e",
    borderColor: "#c7e0f4",
  },

  footer: {
    padding: "18px 32px",
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    borderTop:
      "1px solid #dfe5ec",
    color: "#8a93a1",
    fontSize: 12,
    background: "#fff",
  },
};