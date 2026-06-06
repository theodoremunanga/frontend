import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import styled from "styled-components";

import axios from "axios";
 
import socket from "../services/socket";


import {
  Bell,
  CheckCircle,
  Trophy,
  Gamepad2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Clock3,
  Trash2,
  CheckCheck,
  RefreshCw,
  WifiOff,
  ShieldAlert,
} from "lucide-react";

// ======================================================
// API
// ======================================================

const API = (
  import.meta.env.VITE_API_URL ||
  "https://backend-ad3t.onrender.com/api"
).replace(/\/+$/, "");

const NOTIFICATION_API =
  `${API}/notifications`;

// ======================================================
// COMPONENT
// ======================================================

export default function Infos() {
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [isOffline, setIsOffline] =
    useState(!navigator.onLine);

  // ======================================================
  // NETWORK LISTENER
  // ======================================================

  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
    };

    const goOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener(
      "online",
      goOnline
    );

    window.addEventListener(
      "offline",
      goOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        goOnline
      );

      window.removeEventListener(
        "offline",
        goOffline
      );
    };
  }, []);

  // ======================================================
  // FETCH NOTIFICATIONS
  // ======================================================

  const fetchNotifications =
    useCallback(
      async (
        silent = false
      ) => {
        if (isOffline) {
          setError(
            "⚠️ Vous êtes hors ligne"
          );

          return;
        }

        try {
          if (!silent) {
            setLoading(true);
          }
 
          setRefreshing(true);

          setError("");

          const token =
            localStorage.getItem(
              "token"
            );

          if (!token) {
            throw new Error(
              "Session invalide"
            );
          }

          const res =
            await axios.get(
              `${NOTIFICATION_API}/my`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

          console.log(
            "🔔 NOTIFICATIONS:",
            res.data
          );

          if (
            Array.isArray(
              res.data
            )
          ) {
            setNotifications(
              res.data
            );
          } else {
            setNotifications(
              []
            );
          }
        } catch (error) {
          console.error(
            "❌ Notifications error:",
            error
          );

          if (
            error?.response
              ?.status === 401
          ) {
            localStorage.removeItem(
              "token"
            );

            localStorage.removeItem(
              "user"
            );

            window.location.href =
              "/";
          }

          setError(
            error?.response?.data
              ?.error ||
              "Impossible de charger les notifications"
          );
        } finally {
          setLoading(false);

          setRefreshing(false);
        }
      },
      [isOffline]
    );

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ======================================================
  // AUTO REFRESH
  // ======================================================

  useEffect(() => {
    const interval =
      setInterval(() => {
        if (
          document.visibilityState ===
            "visible" &&
          navigator.onLine
        ) {
          fetchNotifications(
            true
          );
        }
      }, 20000);

    return () =>
      clearInterval(interval);
  }, [fetchNotifications]);

  // ======================================================
  // SOCKET REALTIME
  // ======================================================

  useEffect(() => {
    const userId =
      localStorage.getItem(
        "userId"
      );

    if (!userId) return;

    socket.emit(
      "join_user_room",
      userId
    );

    // ==================================================
    // HANDLERS
    // ==================================================

    const handleNotification =
      (
        notification
      ) => {
        console.log(
          "🔔 NEW NOTIFICATION:",
          notification
        );

        setNotifications(
          (prev) => {
            const exists =
              prev.some(
                (n) =>
                  String(
                    n.id
                  ) ===
                  String(
                    notification.id
                  )
              );

            if (exists) {
              return prev;
            }

            return [
              notification,
              ...prev,
            ];
          }
        );
      };

    const reconnectHandler =
      () => {
        console.log(
          "✅ Socket reconnected"
        );

        socket.emit(
          "join_user_room",
          userId
        );

        fetchNotifications(
          true
        );
      };

    // ==================================================
    // EVENTS
    // ==================================================

    socket.on(
      "new_notification",
      handleNotification
    );

    socket.on(
      "notification_read",
      () =>
        fetchNotifications(
          true
        )
    );

    socket.on(
      "notification_deleted",
      () =>
        fetchNotifications(
          true
        )
    );

    socket.on(
      "connect",
      reconnectHandler
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "❌ Socket disconnected:",
          reason
        );
      }
    );

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      socket.off(
        "new_notification",
        handleNotification
      );

      socket.off(
        "notification_read"
      );

      socket.off(
        "notification_deleted"
      );

      socket.off(
        "connect",
        reconnectHandler
      );
    };
  }, [fetchNotifications]);

  // ======================================================
  // FILTERS
  // ======================================================

  const filteredNotifications =
    useMemo(() => {
      if (
        filter === "unread"
      ) {
        return notifications.filter(
          (n) =>
            !(
              n.is_read ??
              n.read
            )
        );
      }

      if (
        filter === "read"
      ) {
        return notifications.filter(
          (n) =>
            n.is_read ??
            n.read
        );
      }

      return notifications;
    }, [
      notifications,
      filter,
    ]);

  // ======================================================
  // UNREAD COUNT
  // ======================================================

  const unreadCount =
    notifications.filter(
      (n) =>
        !(
          n.is_read ??
          n.read
        )
    ).length;

  // ======================================================
  // MARK AS READ
  // ======================================================

  const markAsRead =
    async (id) => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        await axios.patch(
          `${NOTIFICATION_API}/${id}/read`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setNotifications(
          (prev) =>
            prev.map((n) =>
              String(n.id) ===
              String(id)
                ? {
                    ...n,
                    is_read: true,
                  }
                : n
            )
        );
      } catch (error) {
        console.log(error);
      }
    };

  // ======================================================
  // MARK ALL
  // ======================================================

  const markAllAsRead =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        await axios.put(
          `${NOTIFICATION_API}/read-all`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setNotifications(
          (prev) =>
            prev.map((n) => ({
              ...n,
              is_read: true,
            }))
        );
      } catch (error) {
        console.log(error);
      }
    };

  // ======================================================
  // DELETE
  // ======================================================

  const deleteNotification =
    async (id) => {
      const confirmDelete =
        window.confirm(
          "Supprimer cette notification ?"
        );

      if (!confirmDelete)
        return;

      try {
        const token =
          localStorage.getItem(
            "token"
          );

        await axios.delete(
          `${NOTIFICATION_API}/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setNotifications(
          (prev) =>
            prev.filter(
              (n) =>
                String(
                  n.id
                ) !==
                String(id)
            )
        );
      } catch (error) {
        console.log(error);
      }
    };

  // ======================================================
  // ICONS
  // ======================================================

  const getIcon = (
    type
  ) => {
    switch (type) {
      case "TRANSACTION_APPROVED":
      case "deposit_approved":
        return (
          <ArrowDownCircle size={22} />
        );

      case "TRANSACTION_REJECTED":
      case "withdraw_rejected":
        return (
          <ArrowUpCircle size={22} />
        );

      case "ADMIN_DEBIT":
      case "admin_debit":
        return (
          <Wallet size={22} />
        );

      case "ADMIN_CREDIT":
      case "admin_credit":
        return (
          <CreditCard size={22} />
        );

      case "COMPETITION_AVAILABLE":
      case "competition_available":
        return (
          <Trophy size={22} />
        );

      case "MATCH_READY":
      case "match_ready":
        return (
          <CheckCircle size={22} />
        );

      case "MATCH_AVAILABLE":
      case "match_available":
        return (
          <Gamepad2 size={22} />
        );

      case "SECURITY_ALERT":
        return (
          <ShieldAlert size={22} />
        );

      default:
        return (
          <Bell size={22} />
        );
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <Container>
      {/* HEADER */}
      <Header>
        <HeaderLeft>
          <Bell size={30} />

          <div>
            <Title>
              Notifications
            </Title>

            <Subtitle>
              {unreadCount} notification
              {unreadCount > 1
                ? "s"
                : ""}{" "}
              non lue
              {unreadCount > 1
                ? "s"
                : ""}
            </Subtitle>
          </div>
        </HeaderLeft>

        <HeaderActions>
          <RefreshButton
            onClick={() =>
              fetchNotifications()
            }
            disabled={
              refreshing
            }
          >
            <RefreshCw
              size={17}
            />

            {refreshing
              ? "Actualisation..."
              : "Actualiser"}
          </RefreshButton>

          <ActionButton
            onClick={
              markAllAsRead
            }
          >
            <CheckCheck
              size={18}
            />
            Tout lire
          </ActionButton>
        </HeaderActions>
      </Header>

      {/* OFFLINE */}
      {isOffline && (
        <OfflineBanner>
          <WifiOff size={18} />
          Mode hors ligne
        </OfflineBanner>
      )}

      {/* ERROR */}
      {error && (
        <ErrorBox>
          {error}
        </ErrorBox>
      )}

      {/* FILTERS */}
      <Filters>
        <FilterButton
          $active={
            filter === "all"
          }
          onClick={() =>
            setFilter("all")
          }
        >
          Toutes
        </FilterButton>

        <FilterButton
          $active={
            filter ===
            "unread"
          }
          onClick={() =>
            setFilter(
              "unread"
            )
          }
        >
          Non lues
        </FilterButton>

        <FilterButton
          $active={
            filter ===
            "read"
          }
          onClick={() =>
            setFilter("read")
          }
        >
          Lues
        </FilterButton>
      </Filters>

      {/* LOADING */}
      {loading ? (
        <LoadingContainer>
          Chargement des notifications...
        </LoadingContainer>
      ) : filteredNotifications.length ===
        0 ? (
        <EmptyState>
          <Bell size={60} />

          <h3>
            Aucune notification
          </h3>

          <p>
            Vos notifications apparaîtront ici.
          </p>
        </EmptyState>
      ) : (
        <NotificationsList>
          {filteredNotifications.map(
            (
              notification
            ) => (
              <NotificationCard
                key={
                  notification.id
                }
                $unread={
                  !(
                    notification.is_read ??
                    notification.read
                  )
                }
              >
                {!(
                  notification.is_read ??
                  notification.read
                ) && (
                  <UnreadDot />
                )}

                <IconContainer>
                  {getIcon(
                    notification.type
                  )}
                </IconContainer>

                <NotificationContent>
                  <TopRow>
                    <NotificationTitle>
                      {
                        notification.title
                      }
                    </NotificationTitle>

                    <TimeContainer>
                      <Clock3
                        size={14}
                      />

                      <TimeText>
                        {formatDate(
                          notification.created_at
                        )}
                      </TimeText>
                    </TimeContainer>
                  </TopRow>

                  <NotificationMessage>
                    {
                      notification.message
                    }
                  </NotificationMessage>

                  <BottomRow>
                    {!(
                      notification.is_read ??
                      notification.read
                    ) && (
                      <ReadButton
                        onClick={() =>
                          markAsRead(
                            notification.id
                          )
                        }
                      >
                        Marquer comme lu
                      </ReadButton>
                    )}

                    <DeleteButton
                      onClick={() =>
                        deleteNotification(
                          notification.id
                        )
                      }
                    >
                      <Trash2
                        size={16}
                      />
                    </DeleteButton>
                  </BottomRow>
                </NotificationContent>
              </NotificationCard>
            )
          )}
        </NotificationsList>
      )}
    </Container>
  );
}

// ======================================================
// HELPERS
// ======================================================

function formatDate(
  date
) {
  if (!date)
    return "Date inconnue";

  return new Date(
    date
  ).toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

// ======================================================
// STYLES
// ======================================================

const Container =
  styled.div`
    width: 100%;
    min-height: 100vh;
    background: #020617;
    padding: 24px;
    color: white;
  `;

const Header =
  styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    gap: 20px;
    flex-wrap: wrap;
  `;

const HeaderLeft =
  styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
  `;

const Title = styled.h2`
  margin: 0;
  font-size: 30px;
  font-weight: 800;
`;

const Subtitle =
  styled.p`
    margin: 4px 0 0;
    color: #94a3b8;
  `;

const HeaderActions =
  styled.div`
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  `;

const ActionButton =
  styled.button`
    border: none;
    background: linear-gradient(
      to right,
      #2563eb,
      #1d4ed8
    );
    color: white;
    padding: 12px 18px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
  `;

const RefreshButton =
  styled.button`
    border: none;
    background: #1e293b;
    color: white;
    padding: 12px 18px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 700;
  `;

const OfflineBanner =
  styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    background: #7c2d12;
    padding: 14px 18px;
    border-radius: 16px;
    margin-bottom: 20px;
    color: #fdba74;
    font-weight: 700;
  `;

const ErrorBox =
  styled.div`
    background: #7f1d1d;
    color: #fecaca;
    padding: 14px 18px;
    border-radius: 16px;
    margin-bottom: 20px;
    font-weight: 600;
  `;

const Filters =
  styled.div`
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  `;

const FilterButton =
  styled.button`
    border: none;
    padding: 10px 18px;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 700;

    background: ${({ $active }) =>
      $active
        ? "#2563eb"
        : "#1e293b"};

    color: white;
  `;

const NotificationsList =
  styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
  `;

const NotificationCard =
  styled.div`
    position: relative;
    display: flex;
    gap: 18px;
    background: ${({ $unread }) =>
      $unread
        ? "#172554"
        : "#0f172a"};

    border: 1px solid
      ${({ $unread }) =>
        $unread
          ? "#3b82f6"
          : "#1e293b"};

    border-radius: 22px;
    padding: 20px;
  `;

const UnreadDot =
  styled.div`
    position: absolute;
    top: 18px;
    right: 18px;
    width: 10px;
    height: 10px;
    background: #3b82f6;
    border-radius: 50%;
  `;

const IconContainer =
  styled.div`
    width: 56px;
    min-width: 56px;
    height: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e293b;
  `;

const NotificationContent =
  styled.div`
    width: 100%;
  `;

const TopRow =
  styled.div`
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  `;

const NotificationTitle =
  styled.h4`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  `;

const NotificationMessage =
  styled.p`
    margin: 0;
    line-height: 1.7;
    color: #cbd5e1;
  `;

const TimeContainer =
  styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    color: #94a3b8;
    font-size: 13px;
  `;

const TimeText =
  styled.span``;

const BottomRow =
  styled.div`
    margin-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

const ReadButton =
  styled.button`
    border: none;
    background: transparent;
    color: #60a5fa;
    cursor: pointer;
    font-weight: 700;
  `;

const DeleteButton =
  styled.button`
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: #1e293b;
    color: #ef4444;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

const EmptyState =
  styled.div`
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #94a3b8;
    text-align: center;
    gap: 10px;
  `;

const LoadingContainer =
  styled.div`
    min-height: 50vh;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #94a3b8;
    font-size: 18px;
  `;