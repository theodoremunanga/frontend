import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";


import api from "../services/api";
import { io } from "socket.io-client";

import DashboardStats from "./admin/DashboardStats";
import TransactionsList from "./admin/TransactionsList";
import MatchesList from "./admin/MatchesList";
import MessagesList from "./admin/MessagesList";
import AIControlPanel from "./admin/AIControlPanel";

import ActionsAdmin from "../components/admin/ActionsAdmin";
import PerceptorCM from "../components/admin/PerceptorCM";

import AdsManager from "./admin/AdsManager";
import AdsEditor from "./admin/AdsEditor";

import GestionTournois from "./admin/GestionTournois";
import Parametres from "./admin/Parametres";

import {
  getAISettings,
  getAIWallet,
  updateAISettings,
  creditBot,
  debitBot,
  transferToSystem,
} from "../services/aiService";

// ======================================================
// CONFIG
// ======================================================

const API_URL =
  import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "❌ VITE_API_URL is missing"
  );
}

const SOCKET_URL =
  API_URL.replace("/api", "");

const NAVBAR_HEIGHT = 70;

const PAGE_SIZE = 10;

const SOCKET_TIMEOUT = 20000;

const MAX_RECONNECT_ATTEMPTS = 10;

// ======================================================
// AXIOS
// ======================================================

// supprimé

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

   // supprimé

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

   // supprimé

// ======================================================
// HELPERS
// ======================================================

function safeArray(data) {
  return Array.isArray(data)
    ? data
    : [];
}

function formatMoney(v) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "CDF",
      maximumFractionDigits: 0,
    }
  ).format(Number(v || 0));
}

function formatDate(date) {
  if (!date) return "--";

  try {
    return new Date(date)
      .toLocaleString("fr-FR");
  } catch {
    return "--";
  }
}

// ======================================================
// TAB TITLES
// ======================================================

const tabTitles = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  matches: "Matches",
  messages: "Messages",
  ai: "Ai",
  users: "Users",
  ads: "Ads",
  "ads-editor": "Ads Editor",
  tournaments: "Gestion Tournois",
  perceptor: "Perceptor",
  settings: "Paramètres",
};

// ======================================================
// COMPONENT
// ======================================================

export default function AdminDashboard() {
  // ======================================================
  // STATES
  // ======================================================

  const [tab, setTab] =
    useState("dashboard");

  const [loading, setLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [connected, setConnected] =
    useState(false);

  const [ping, setPing] =
    useState("--");

  const [lastRefresh, setLastRefresh] =
    useState(null);

  const [stats, setStats] =
    useState({});

  const [transactions, setTransactions] =
    useState([]);

  const [matches, setMatches] =
    useState([]);

  const [messages, setMessages] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [ai, setAi] = useState({
    settings: {},
    wallet: {},
  });

  // ======================================================
  // AI
  // ======================================================


  // ======================================================
  // SEARCH
  // ======================================================

  const [search, setSearch] =
    useState("");

  // ======================================================
  // NOTIFICATIONS
  // ======================================================

  const [notifications, setNotifications] =
    useState([]);

  // ======================================================
  // PAGINATION
  // ======================================================

  const [page, setPage] =
    useState(1);

  // ======================================================
  // REFS
  // ======================================================

  const socketRef = useRef(null);

  const pingInterval =
    useRef(null);

  // ======================================================
  // NOTIFICATIONS
  // ======================================================

  const pushNotif =
    useCallback((text, type = "info") => {
      const id =
        Date.now() + Math.random();

      const notif = {
        id,
        text,
        type,
      };

      setNotifications((prev) => [
        notif,
        ...prev,
      ]);

      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter(
            (n) => n.id !== id
          )
        );
      }, 4000);
    }, []);

  // ======================================================
  // FETCH DATA
  // ======================================================

  const fetchData =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          dashRes,
          txRes,
          matchRes,
          usersRes,
          messagesRes,
        ] = await Promise.all([
          api.get("/admin/dashboard"),

          api.get(
            "/admin/transactions"
          ),

          api.get(
            "/admin/matches"
          ),


          api.get("/admin/users"),

          api.get(
            "/admin/messages"
          ),
        ]);

        setStats(
          dashRes.data || {}
        );

        setTransactions(
          safeArray(txRes.data)
        );

        setMatches(
          safeArray(matchRes.data)
        );

        setUsers(
          safeArray(usersRes.data)
        );

        setMessages(
          safeArray(
            messagesRes.data
          )
        );

        setLastRefresh(
          new Date()
        );
      } catch (err) {
        console.error(
          "FETCH ERROR:",
          err
        );

        pushNotif(
          "❌ Erreur serveur",
          "error"
        );
      } finally {
        setLoading(false);
      }
    }, [pushNotif]);

    const refreshAI = async () => {
      try {

        const [
          settingsRes,
            usersRes
          ] = await Promise.all([
            getAISettings(),
            api.get("/admin/users")
          ]);

       

        const bot = usersRes.data.find(
          u =>
            Number(u.id) === 9999 ||
            Number(u.custom_id) === 9999
        );

        setAi({
          settings: settingsRes.data,
          wallet: {
            balance_available: bot?.balance ?? 0,
            balance_locked: bot?.balance_locked ?? 0
          },
          user: bot
        });

        } catch (err) {
          console.error(err);
        }
      };

  // ======================================================
  // SOCKET
  // ======================================================

useEffect(() => {

  fetchData();

  refreshAI();

  const token =
    localStorage.getItem("token");

  const socket = io(
    SOCKET_URL,
    {
      auth: {
        token,
      },

      withCredentials: true,

      transports: [
        "websocket",
        "polling",
      ],

      reconnection: true,

      reconnectionAttempts:
        MAX_RECONNECT_ATTEMPTS,

      reconnectionDelay: 2000,

      reconnectionDelayMax: 10000,

      timeout:
        SOCKET_TIMEOUT,

      autoConnect: true,
    }
  );

  socketRef.current = socket;

  // ====================================================
  // CONNECT
  // ====================================================

  socket.on("connect", () => {
    setConnected(true);

    pushNotif(
      "🟢 Temps réel connecté",
      "success"
    );

    clearInterval(
      pingInterval.current
    );

    pingInterval.current =
      setInterval(() => {
        const start =
          Date.now();

        socket.emit(
          "ping:test",
          start
        );
      }, 5000);
  });

  // ====================================================
  // PING
  // ====================================================

  socket.on(
    "pong:test",
    (start) => {
      setPing(
        Date.now() - start
      );
    }
  );

  // ====================================================
  // DISCONNECT
  // ====================================================

  socket.on(
    "disconnect",
    (reason) => {
      setConnected(false);

      console.warn(
        "⚠️ Socket disconnected:",
        reason
      );

      pushNotif(
        "🔴 Temps réel déconnecté",
        "error"
      );
    }
  );

  // ====================================================
  // CONNECT ERROR
  // ====================================================

  socket.on(
    "connect_error",
    (err) => {
      console.error(
        "❌ Socket error:",
        err.message
      );

      pushNotif(
        "❌ Connexion temps réel impossible",
        "error"
      );
    }
  );

  // ====================================================
  // TRANSACTIONS
  // ====================================================

  socket.on(
    "transaction:new",
    (tx) => {
      setTransactions(
        (prev) => [
          tx,
          ...prev,
        ]
      );

      pushNotif(
        "💰 Nouvelle transaction",
        "success"
      );
    }
  );

  // ====================================================
  // MESSAGES
  // ====================================================

  socket.on(
    "message:new",
    (message) => {
      setMessages(
        (prev) => [
          message,
          ...prev,
        ]
      );

      pushNotif(
        "💬 Nouveau message",
        "info"
      );
    }
  );

  // ====================================================
  // MATCHES
  // ====================================================

  socket.on(
    "match:new",
    (match) => {
      setMatches(
        (prev) => [
          match,
          ...prev,
        ]
      );

      pushNotif(
        "♟️ Nouveau match",
        "info"
      );
    }
  );

  // ====================================================
  // CLEANUP
  // ====================================================

  return () => {
    clearInterval(
      pingInterval.current
    );

    socket.removeAllListeners();

    socket.disconnect();
  };
}, [fetchData, pushNotif]);

  // ======================================================
  // RESET PAGE
  // ======================================================

  useEffect(() => {
    setPage(1);
  }, [
    search,
    tab,
  ]);



  // ======================================================
  // FILTERS
  // ======================================================

  const filterData =
  useCallback(
    (data) => {
      if (!search.trim()) {
        return data;
      }

      const q =
        search.toLowerCase();

      return data.filter((item) =>
        Object.values(item)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    },
    [search]
  );

// ======================================================
// OFFLINE STATE
// ======================================================

const isOffline = !connected;
  {/* HEADER */}

     <div style={header}>
       <div>
         <div style={pageTitle}>
           {tabTitles[tab] || "Admin"}
     </div>

     <div style={pageSub}>
         Dernière mise à jour :{" "}
       {formatDate(lastRefresh)}
    </div>
  </div>

  <div style={headerActions}>
    <input
      placeholder="Recherche globale..."
      value={search}
      onChange={(e) =>
        setSearch(e.target.value)
      }
      style={searchBox}
    />

    <button
      onClick={fetchData}
      style={refreshBtn}
    >
      🔄 Actualiser
    </button>
  </div>
</div>

{/* OFFLINE WARNING */}

{isOffline && (
  <div
    style={{
      background:
        "rgba(239,68,68,0.15)",
      border:
        "1px solid rgba(239,68,68,0.4)",
      color: "#ef4444",
      padding: 14,
      borderRadius: 14,
      marginBottom: 20,
      fontWeight: 700,
    }}
  >
    ⚠️ Mode hors ligne
  </div>
)}

  // ======================================================
  // PAGINATION
  // ======================================================

  const paginate =
    useCallback(
      (data) => {
        const start =
          (page - 1) *
          PAGE_SIZE;

        return data.slice(
          start,
          start + PAGE_SIZE
        );
      },
      [page]
    );

  // ======================================================
  // FILTERED DATA
  // ======================================================

  const filteredTransactions =
    useMemo(
      () =>
        filterData(
          transactions
        ),
      [
        transactions,
        filterData,
      ]
    );

  const filteredMatches =
    useMemo(
      () =>
        filterData(matches),
      [
        matches,
        filterData,
      ]
    );

  const filteredMessages =
    useMemo(
      () =>
        filterData(messages),
      [
        messages,
        filterData,
      ]
    );

  const filteredUsers =
    useMemo(
      () =>
        filterData(users),
      [
        users,
        filterData,
      ]
    );

  // ======================================================
  // AI SETTINGS
  // ======================================================

  const saveSettings =
    async (payload) => {

    await updateAISettings(
      payload
    );

    await refreshAI();
  };

  const creditBotHandler =
    async (amount) => {

    await creditBot(amount);

    await refreshAI();
  };

  const debitBotHandler =
    async (amount) => {

    await debitBot(amount);

    await refreshAI();
  };

  const transferHandler =
    async (amount) => {

    await transferToSystem(
      amount
      
    );

  }; 

  

  // ======================================================
  // REFRESH
  // ======================================================


  // ======================================================
  // MENU ITEMS
  // ======================================================

  const menuItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: "📊",
    },

    {
      key: "transactions",
      label: "Transactions",
      icon: "💰",
    },

    {
      key: "matches",
      label: "Matches",
      icon: "♟️",
    },

    {
      key: "messages",
      label: "Messages",
      icon: "💬",
    },

    {
      key: "ai",
      label: "Ai",
      icon: "🤖",
    },

    {
      key: "users",
      label: "Users",
      icon: "👥",
    },

    {
      key: "ads",
      label: "Ads",
      icon: "📢",
    },

    {
      key: "ads-editor",
      label: "Ads Editor",
      icon: "✏️",
    },

    {
      key: "tournaments",
      label: "Tournois",
      icon: "🏆",
    },

    {
      key: "perceptor",
      label: "Perceptor",
      icon: "🧠",
    },

    {
      key: "settings",
      label: "Paramètres",
      icon: "⚙️",
    },


  ];

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div style={layout}>
      {/* SIDEBAR */}

      <aside style={sidebar}>
        <div style={logoBox}>
          <div style={logo}>
            ⚡
          </div>

          <div>
            <div
              style={
                logoTitle
              }
            >
              Admin Panel
            </div>

            <div
              style={
                logoSub
              }
            >
              6BetBall
            </div>
          </div>
        </div>

        <div
          style={
            statusBox
          }
        >
          <div>
            {connected
              ? "🟢 En ligne"
              : "🔴 Hors ligne"}
          </div>

          <div>
            ⚡ {ping}ms
          </div>
        </div>

        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() =>
              setTab(
                item.key
              )
            }
            style={{
              ...menuItem,

              background:
                tab ===
                item.key
                  ? "linear-gradient(135deg,#2563eb,#1d4ed8)"
                  : "transparent",

              border:
                tab ===
                item.key
                  ? "1px solid rgba(255,255,255,0.15)"
                  : "1px solid transparent",
            }}
          >
            <span>
              {item.icon}
            </span>

            <span>
              {item.label}
            </span>
          </button>
        ))}
      </aside>

      {/* MAIN */}

      <main style={main}>
        {/* HEADER */}

        <div style={header}>
          <div>
            <div
              style={
                pageTitle
              }
            >
              {tabTitles[
                tab
              ] || "Admin"}
            </div>

            <div
              style={
                pageSub
              }
            >
              Dernière mise à jour :
              {" "}
              {formatDate(
                lastRefresh
              )}
            </div>
          </div>

          <div
            style={
              headerActions
            }
          >
            <input
              placeholder="Recherche globale..."
              value={search}
              onChange={(
                e
              ) =>
                setSearch(
                  e.target
                    .value
                )
              }
              style={
                searchBox
              }
            />

            <button
              onClick={
                fetchData
              }
              style={
                refreshBtn
              }
            >
              🔄 Actualiser
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS */}

        {!!notifications.length && (
          <div
            style={
              notifWrapper
            }
          >
            {notifications.map(
              (
                notif
              ) => (
                <div
                  key={
                    notif.id
                  }
                  style={{
                    ...notifItem,

                    borderLeft:
                      notif.type ===
                      "error"
                        ? "4px solid #ef4444"
                        : notif.type ===
                          "success"
                        ? "4px solid #22c55e"
                        : "4px solid #3b82f6",
                  }}
                >
                  {
                    notif.text
                  }
                </div>
              )
            )}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div
            style={
              loadingBox
            }
          >
            ⏳ Chargement...
          </div>
        )}

        {/* DASHBOARD */}

        {tab ===
          "dashboard" && (
          <DashboardStats
            stats={stats}
            money={
              formatMoney
            }
          />
        )}

        {/* AI */}

        {tab === "ai" && (
          <AIControlPanel
            ai={ai}
            saveSettings={
              saveSettings
            }
            creditBot={
              creditBotHandler
            }
            debitBot={
              debitBotHandler
            }
            transferToSystem={
              transferHandler
            }
            refreshAI={
              refreshAI
            }
            money={
              formatMoney
            }
            actionLoading={
              actionLoading
            }
          />
        )}

        {/* USERS */}

        {tab ===
          "users" && (
          <>
            <ActionsAdmin
              users={paginate(
                filteredUsers
              )}
              money={
                formatMoney
              }
              refresh={
                fetchData
              }
            />

            <Pagination
              page={page}
              setPage={
                setPage
              }
              total={
                filteredUsers.length
              }
            />
          </>
        )}

        {/* TRANSACTIONS */}

        {tab ===
          "transactions" && (
          <>
            <TransactionsList
              transactions={paginate(
                filteredTransactions
              )}
              money={
                formatMoney
              }
              refresh={
                fetchData
              }
            />

            <Pagination
              page={page}
              setPage={
                setPage
              }
              total={
                filteredTransactions.length
              }
            />
          </>
        )}

        {/* MATCHES */}

        {tab ===
          "matches" && (
          <>
            <MatchesList
              matches={paginate(
                filteredMatches
              )}
            />

            <Pagination
              page={page}
              setPage={
                setPage
              }
              total={
                filteredMatches.length
              }
            />
          </>
        )}

        {/* MESSAGES */}

        {tab ===
          "messages" && (
          <>
            <MessagesList />

            <Pagination
              page={page}
              setPage={
                setPage
              }
              total={
                filteredMessages.length
              }
            />
          </>
        )}

        {/* ADS */}

        {tab === "ads" && (
          <AdsManager />
        )}

        {/* ADS EDITOR */}

        {tab ===
          "ads-editor" && (
          <AdsEditor />
        )}

        {/* TOURNAMENTS */}

        {tab ===
          "tournaments" && (
          <GestionTournois />
        )}

        {/* PERCEPTOR */}

        {tab ===
          "perceptor" && (
          <PerceptorCM />
        )}

        {/* PARAMETRES */}

        {tab === "settings" && (
          <Parametres />
        )}
      </main>
    </div>
  );
}

// ======================================================
// PAGINATION
// ======================================================

function Pagination({
  page,
  setPage,
  total,
}) {
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
          PAGE_SIZE
      )
    );

  return (
    <div
      style={
        pagination
      }
    >
      <button
        onClick={() =>
          setPage((p) =>
            Math.max(
              p - 1,
              1
            )
          )
        }
        disabled={page === 1}
        style={
          pageBtn
        }
      >
        ◀
      </button>

      <div
        style={
          pageIndicator
        }
      >
        Page {page} /{" "}
        {totalPages}
      </div>

      <button
        onClick={() =>
          setPage((p) =>
            Math.min(
              p + 1,
              totalPages
            )
          )
        }
        disabled={
          page ===
          totalPages
        }
        style={
          pageBtn
        }
      >
        ▶
      </button>
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

const layout = {
  display: "flex",
  minHeight: "100vh",
  background:
    "linear-gradient(135deg,#020617,#0f172a)",
  color: "white",
  paddingTop:
    NAVBAR_HEIGHT,
};

const sidebar = {
  width: 260,
  background:
    "rgba(2,6,23,0.95)",
  borderRight:
    "1px solid rgba(255,255,255,0.06)",
  padding: 20,
  display: "flex",
  flexDirection:
    "column",
  gap: 12,
  position: "sticky",
  top: NAVBAR_HEIGHT,
  height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
  backdropFilter:
    "blur(10px)",
};

const logoBox = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 20,
};

const logo = {
  width: 54,
  height: 54,
  borderRadius: 18,
  background:
    "linear-gradient(135deg,#2563eb,#7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  fontSize: 24,
  fontWeight: 700,
};

const logoTitle = {
  fontSize: 20,
  fontWeight: 800,
};

const logoSub = {
  color: "#94a3b8",
  fontSize: 13,
};

const statusBox = {
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 14,
  marginBottom: 10,
  display: "flex",
  justifyContent:
    "space-between",
  fontSize: 13,
};

const menuItem = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  cursor: "pointer",
  color: "white",
  fontWeight: 600,
  fontSize: 15,
  transition: "0.2s",
};

const main = {
  flex: 1,
  padding: 28,
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
  flexWrap: "wrap",
};

const pageTitle = {
  fontSize: 34,
  fontWeight: 800,
};

const pageSub = {
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 13,
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const searchBox = {
  width: 280,
  padding: "14px 16px",
  borderRadius: 14,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  outline: "none",
  fontSize: 14,
};

const refreshBtn = {
  padding:
    "14px 18px",
  border: "none",
  borderRadius: 14,
  background:
    "linear-gradient(135deg,#16a34a,#15803d)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const notifWrapper = {
  display: "flex",
  flexDirection:
    "column",
  gap: 10,
  marginBottom: 20,
};

const notifItem = {
  background:
    "rgba(255,255,255,0.05)",
  padding: 14,
  borderRadius: 14,
  backdropFilter:
    "blur(8px)",
};

const loadingBox = {
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 18,
  marginBottom: 20,
};

const pagination = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  gap: 16,
  marginTop: 20,
};

const pageBtn = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "none",
  background:
    "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const pageIndicator = {
  fontWeight: 700,
  color: "#cbd5e1",
};