import {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";

import api from "../../services/api";

// ======================================================
// COMPONENT
// ======================================================

export default function AdminUsersList({
  users = [],
  money,
  refresh,
}) {
  // ======================================================
  // STATES
  // ======================================================

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("ALL");

  const [loadingAction, setLoadingAction] =
    useState(null);

  const [sortBy, setSortBy] =
    useState("balance");

  // ======================================================
  // HELPERS
  // ======================================================

  const safeMoney = useCallback(
    (value) => {
      if (money) {
        return money(value || 0);
      }

      return new Intl.NumberFormat(
        "fr-FR",
        {
          style: "currency",
          currency: "CDF",
        }
      ).format(Number(value || 0));
    },
    [money]
  );

  // ======================================================
  // FILTER + SORT
  // ======================================================

  const filtered = useMemo(() => {
    let data = [...users];

    // ROLE
    if (roleFilter !== "ALL") {
      data = data.filter(
        (u) =>
          String(u.role || "")
            .toUpperCase()
            === roleFilter
      );
    }

    // SEARCH
    if (search.trim()) {
      const q =
        search.toLowerCase();

      data = data.filter((u) => {
        return (
          String(
            u.username || ""
          )
            .toLowerCase()
            .includes(q) ||

          String(
            u.custom_id || ""
          )
            .toLowerCase()
            .includes(q) ||

          String(
            u.number || ""
          )
            .toLowerCase()
            .includes(q)
        );
      });
    }

    // SORT
    switch (sortBy) {
      case "balance":
        data.sort(
          (a, b) =>
            Number(
              b.balance || 0
            ) -
            Number(
              a.balance || 0
            )
        );
        break;

      case "active":
        data.sort(
          (a, b) =>
            Number(
              b.days_active || 0
            ) -
            Number(
              a.days_active || 0
            )
        );
        break;

      case "username":
        data.sort((a, b) =>
          String(
            a.username || ""
          ).localeCompare(
            String(
              b.username || ""
            )
          )
        );
        break;

      default:
        break;
    }

    return data;
  }, [
    users,
    search,
    roleFilter,
    sortBy,
  ]);

  // ======================================================
  // STATS
  // ======================================================

  const stats = useMemo(() => {
    return {
      total: users.length,

      admins:
        users.filter(
          (u) =>
            u.role === "ADMIN"
        ).length,

      jo:
        users.filter(
          (u) =>
            u.role === "JO"
        ).length,

      suspended:
        users.filter(
          (u) =>
            u.is_suspended
        ).length,

      pendingKyc:
        users.filter(
          (u) =>
            u.kyc_status ===
            "pending"
        ).length,
    };
  }, [users]);

  // ======================================================
  // ACTION ADMIN
  // ======================================================

  const actionAdmin =
    useCallback(
      async (
        endpoint,
        payload = {},
        method = "post",
        loadingKey = ""
      ) => {
        try {
          setLoadingAction(
            loadingKey
          );

          const res =
            method === "delete"
              ? await api.delete(
                  endpoint,
                  {
                    data: payload,
                  }
                )
              : await api.post(
                  endpoint,
                  payload
                );

          await refresh?.();

          return res.data;
        } catch (err) {
          console.error(
            "ADMIN ACTION ERROR:",
            err?.response
              ?.data || err
          );

          alert(
            err?.response?.data
              ?.message ||
              "❌ Action échouée"
          );
        } finally {
          setLoadingAction(
            null
          );
        }
      },
      [refresh]
    );

  // ======================================================
  // ACTIONS
  // ======================================================

  const suspend = (
    id,
    value
  ) =>
    actionAdmin(
      "/admin/users/suspend",
      {
        userId: id,
        value,
      },
      "post",
      `suspend-${id}`
    );

  const freeze = (
    id,
    value
  ) =>
    actionAdmin(
      "/admin/users/freeze-funds",
      {
        userId: id,
        freeze: value,
      },
      "post",
      `freeze-${id}`
    );

  const fund = async (
    id,
    amount
  ) => {
    if (
      !amount ||
      Number(amount) <= 0
    ) {
      return;
    }

    return actionAdmin(
      "/admin/users/fund",
      {
        userId: id,
        amount: Number(
          amount
        ),
      },
      "post",
      `fund-${id}`
    );
  };

  const demote = (id) =>
    actionAdmin(
      "/admin/users/demote",
      {
        userId: id,
      },
      "post",
      `demote-${id}`
    );

  const remove = async (
    id,
    username
  ) => {
    const confirmDelete =
      window.confirm(
        `Supprimer définitivement ${username} ?`
      );

    if (!confirmDelete) {
      return;
    }

    return actionAdmin(
      `/admin/users/${id}`,
      {},
      "delete",
      `delete-${id}`
    );
  };

  const kycAction = (
    id,
    action
  ) =>
    actionAdmin(
      "/admin/users/kyc",
      {
        userId: id,
        action,
      },
      "post",
      `kyc-${id}`
    );

  // ======================================================
  // EFFECT
  // ======================================================

  useEffect(() => {
    if (
      ![
        "ALL",
        "USER",
        "JO",
        "ADMIN",
      ].includes(roleFilter)
    ) {
      setRoleFilter("ALL");
    }
  }, [roleFilter]);

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div>
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div style={headerCard}>
        <div>
          <div style={pageTitle}>
            👥 Gestion des utilisateurs
          </div>

          <div style={pageSub}>
            Administration avancée
            des comptes
          </div>
        </div>

        <div style={headerStats}>
          <StatBox
            label="Utilisateurs"
            value={stats.total}
          />

          <StatBox
            label="Admins"
            value={stats.admins}
          />

          <StatBox
            label="KYC attente"
            value={
              stats.pendingKyc
            }
          />

          <StatBox
            label="Suspendus"
            value={
              stats.suspended
            }
          />
        </div>
      </div>

      {/* ====================================================== */}
      {/* FILTERS */}
      {/* ====================================================== */}

      <div style={filtersWrapper}>
        <div style={searchWrapper}>
          <span
            style={searchIcon}
          >
            🔍
          </span>

          <input
            placeholder="Rechercher utilisateur..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            style={searchInput}
          />
        </div>

        <div style={filtersRow}>
          {[
            "ALL",
            "USER",
            "JO",
            "ADMIN",
          ].map((r) => (
            <button
              key={r}
              onClick={() =>
                setRoleFilter(r)
              }
              style={
                roleFilter === r
                  ? activeBtn
                  : btn
              }
            >
              {r}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(
              e.target.value
            )
          }
          style={select}
        >
          <option value="balance">
            Trier par balance
          </option>

          <option value="active">
            Trier par activité
          </option>

          <option value="username">
            Trier par nom
          </option>
        </select>
      </div>

      {/* ====================================================== */}
      {/* EMPTY */}
      {/* ====================================================== */}

      {!filtered.length && (
        <div style={emptyState}>
          Aucun utilisateur trouvé
        </div>
      )}

      {/* ====================================================== */}
      {/* USERS */}
      {/* ====================================================== */}

      <div style={usersGrid}>
        {filtered.map((u) => {
          const busy =
            loadingAction &&
            loadingAction.includes(
              String(u.id)
            );

          return (
            <div
              key={u.id}
              style={card}
            >
              {/* TOP */}

              <div style={topRow}>
                <div>
                  <div
                    style={
                      userTitle
                    }
                  >
                    #{u.number} •{" "}
                    {
                      u.username
                    }
                  </div>

                  <div
                    style={
                      userId
                    }
                  >
                    {u.custom_id}
                  </div>
                </div>

                <div
                  style={{
                    ...roleBadge,
                    background:
                      roleColor(
                        u.role
                      ),
                  }}
                >
                  {u.role}
                </div>
              </div>

              {/* BALANCE */}

              <div
                style={
                  balanceCard
                }
              >
                <div>
                  <div
                    style={
                      smallLabel
                    }
                  >
                    Solde
                  </div>

                  <div
                    style={
                      balanceValue
                    }
                  >
                    {safeMoney(
                      u.balance
                    )}
                  </div>
                </div>

                <div>
                  <div
                    style={
                      smallLabel
                    }
                  >
                    Gelé
                  </div>

                  <div
                    style={{
                      ...balanceValue,
                      fontSize: 18,
                    }}
                  >
                    {safeMoney(
                      u.balance_locked
                    )}
                  </div>
                </div>
              </div>

              {/* INFOS */}

              <div style={infoGrid}>
                <InfoItem
                  label="KYC"
                  value={
                    u.kyc_status
                  }
                  color={getKycColor(
                    u.kyc_status
                  )}
                />

                <InfoItem
                  label="Jours actifs"
                  value={
                    u.days_active ||
                    0
                  }
                />

                <InfoItem
                  label="Suspendu"
                  value={
                    u.is_suspended
                      ? "Oui"
                      : "Non"
                  }
                  color={
                    u.is_suspended
                      ? "#ef4444"
                      : "#22c55e"
                  }
                />
              </div>

              {/* ACTIONS */}

              <div
                style={
                  actionsWrapper
                }
              >
                <button
                  disabled={busy}
                  onClick={() =>
                    suspend(
                      u.id,
                      !u.is_suspended
                    )
                  }
                  style={
                    u.is_suspended
                      ? successBtn
                      : warningBtn
                  }
                >
                  {u.is_suspended
                    ? "✅ Réactiver"
                    : "⛔ Suspendre"}
                </button>

                <button
                  disabled={busy}
                  onClick={() =>
                    freeze(
                      u.id,
                      true
                    )
                  }
                  style={btn}
                >
                  ❄️ Geler
                </button>

                <button
                  disabled={busy}
                  onClick={() =>
                    freeze(
                      u.id,
                      false
                    )
                  }
                  style={btn}
                >
                  🔓 Débloquer
                </button>

                <button
                  disabled={busy}
                  onClick={() => {
                    const amount =
                      prompt(
                        "Montant à ajouter ?"
                      );

                    if (
                      amount
                    ) {
                      fund(
                        u.id,
                        amount
                      );
                    }
                  }}
                  style={
                    successBtn
                  }
                >
                  💵 Créditer
                </button>

                {u.role !==
                  "USER" && (
                  <button
                    disabled={
                      busy
                    }
                    onClick={() =>
                      demote(
                        u.id
                      )
                    }
                    style={
                      warningBtn
                    }
                  >
                    ⬇️ Destituer
                  </button>
                )}

                <button
                  disabled={busy}
                  onClick={() =>
                    remove(
                      u.id,
                      u.username
                    )
                  }
                  style={
                    dangerBtn
                  }
                >
                  🗑 Supprimer
                </button>

                {u.kyc_status ===
                  "pending" && (
                  <>
                    <button
                      disabled={
                        busy
                      }
                      onClick={() =>
                        kycAction(
                          u.id,
                          "verified"
                        )
                      }
                      style={
                        successBtn
                      }
                    >
                      ✔ Valider
                    </button>

                    <button
                      disabled={
                        busy
                      }
                      onClick={() =>
                        kycAction(
                          u.id,
                          "rejected"
                        )
                      }
                      style={
                        dangerBtn
                      }
                    >
                      ✖ Rejeter
                    </button>
                  </>
                )}
              </div>

              {busy && (
                <div
                  style={
                    loadingOverlay
                  }
                >
                  Traitement...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ======================================================
// SMALL COMPONENTS
// ======================================================

function StatBox({
  label,
  value,
}) {
  return (
    <div style={statCard}>
      <div style={statLabel}>
        {label}
      </div>

      <div style={statValue}>
        {value}
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  color,
}) {
  return (
    <div style={infoItem}>
      <div style={infoLabel}>
        {label}
      </div>

      <div
        style={{
          ...infoValue,
          color:
            color ||
            "#ffffff",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ======================================================
// HELPERS
// ======================================================

function roleColor(role) {
  if (role === "ADMIN") {
    return "#dc2626";
  }

  if (role === "JO") {
    return "#2563eb";
  }

  return "#16a34a";
}

function getKycColor(
  status
) {
  if (status === "verified") {
    return "#22c55e";
  }

  if (status === "pending") {
    return "#facc15";
  }

  if (status === "rejected") {
    return "#ef4444";
  }

  return "#ffffff";
}

// ======================================================
// STYLES
// ======================================================

const headerCard = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
  background:
    "linear-gradient(135deg,#111827,#1f2937)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  padding: 24,
  marginBottom: 24,
};

const pageTitle = {
  fontSize: 28,
  fontWeight: 800,
};

const pageSub = {
  marginTop: 6,
  color: "#94a3b8",
};

const headerStats = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const statCard = {
  minWidth: 120,
  background:
    "rgba(255,255,255,0.05)",
  borderRadius: 18,
  padding: 14,
};

const statLabel = {
  color: "#94a3b8",
  fontSize: 13,
  marginBottom: 6,
};

const statValue = {
  fontSize: 24,
  fontWeight: 700,
};

const filtersWrapper = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 24,
};

const searchWrapper = {
  flex: 1,
  minWidth: 260,
  display: "flex",
  alignItems: "center",
  background:
    "rgba(255,255,255,0.06)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  overflow: "hidden",
};

const searchIcon = {
  paddingLeft: 14,
  paddingRight: 10,
  opacity: 0.7,
};

const searchInput = {
  flex: 1,
  padding: "14px 12px",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "white",
  fontSize: 14,
};

const filtersRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const select = {
  padding: "12px 14px",
  borderRadius: 14,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
};

const usersGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill,minmax(420px,1fr))",
  gap: 20,
};

const card = {
  position: "relative",
  background:
    "linear-gradient(180deg,#111827,#0f172a)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  padding: 22,
  overflow: "hidden",
};

const topRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  marginBottom: 20,
};

const userTitle = {
  fontSize: 20,
  fontWeight: 700,
};

const userId = {
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 13,
};

const roleBadge = {
  padding: "8px 12px",
  borderRadius: 999,
  color: "white",
  fontWeight: 700,
  fontSize: 12,
};

const balanceCard = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 20,
  background:
    "rgba(255,255,255,0.05)",
  borderRadius: 18,
  padding: 16,
  marginBottom: 18,
};

const smallLabel = {
  color: "#94a3b8",
  fontSize: 13,
  marginBottom: 6,
};

const balanceValue = {
  fontSize: 24,
  fontWeight: 800,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,1fr)",
  gap: 12,
  marginBottom: 20,
};

const infoItem = {
  background:
    "rgba(255,255,255,0.04)",
  borderRadius: 14,
  padding: 12,
};

const infoLabel = {
  fontSize: 12,
  color: "#94a3b8",
  marginBottom: 6,
};

const infoValue = {
  fontWeight: 700,
  fontSize: 14,
};

const actionsWrapper = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const btn = {
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const activeBtn = {
  ...btn,
  background:
    "linear-gradient(135deg,#2563eb,#1d4ed8)",
};

const successBtn = {
  ...btn,
  background:
    "linear-gradient(135deg,#22c55e,#15803d)",
};

const warningBtn = {
  ...btn,
  background:
    "linear-gradient(135deg,#f59e0b,#d97706)",
};

const dangerBtn = {
  ...btn,
  background:
    "linear-gradient(135deg,#ef4444,#b91c1c)",
};

const emptyState = {
  textAlign: "center",
  padding: 40,
  borderRadius: 24,
  background:
    "rgba(255,255,255,0.04)",
  color: "#94a3b8",
};

const loadingOverlay = {
  position: "absolute",
  inset: 0,
  background:
    "rgba(0,0,0,0.45)",
  backdropFilter:
    "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  fontWeight: 700,
  fontSize: 18,
};