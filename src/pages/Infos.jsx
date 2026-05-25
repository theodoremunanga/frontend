import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styled from "styled-components";

import axios from "axios";

import socket from "../socket";

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
} from "lucide-react";

// ======================================================
// API
// ======================================================

const API =
  "http://localhost:3000/api/notifications";

// ======================================================
// COMPONENT
// ======================================================

export default function Infos() {
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState("all");

  // ======================================================
  // FETCH NOTIFICATIONS
  // ======================================================

  const fetchNotifications =
    async () => {
      try {
        setLoading(true);

        const token =
          localStorage.getItem(
            "token"
          );

        const res =
          await axios.get(
            `${API}/my`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        console.log(
          "NOTIFICATIONS:",
          res.data
        );

        // ✅ CORRECTION
        // l'API retourne directement un tableau
        if (
          Array.isArray(res.data)
        ) {
          setNotifications(
            res.data
          );
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.log(
          "Erreur notifications :",
          error
        );

        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ======================================================
  // SOCKET REALTIME
  // ======================================================

  useEffect(() => {
    const userId =
      localStorage.getItem(
        "userId"
      );

    if (!userId) return;

    // rejoindre room socket
    socket.emit(
      "join_user_room",
      userId
    );

    // ==================================================
    // NEW NOTIFICATION
    // ==================================================

    const handleNotification = (
      notification
    ) => {
      console.log(
        "🔔 NEW NOTIFICATION:",
        notification
      );

      setNotifications(
        (prev) => {
          // anti doublon
          const exists =
            prev.some(
              (n) =>
                String(n.id) ===
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

    // ==================================================
    // SOCKET EVENTS
    // ==================================================

    socket.on(
      "new_notification",
      handleNotification
    );

    socket.on(
      "connect",
      () => {
        console.log(
          "✅ Notifications socket connected"
        );

        socket.emit(
          "join_user_room",
          userId
        );
      }
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "❌ Notifications socket disconnected:",
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
    };
  }, []);

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

      if (filter === "read") {
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
          `${API}/${id}/read`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // ✅ CORRECTION
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
  // MARK ALL AS READ
  // ======================================================

  const markAllAsRead =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        await axios.put(
          `${API}/read-all`,
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
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        await axios.delete(
          `${API}/${id}`,
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
                String(n.id) !==
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

  const getIcon = (type) => {
    switch (type) {
      // ✅ TYPES BACKEND
      case "TRANSACTION_APPROVED":
        return (
          <ArrowDownCircle size={22} />
        );

      case "TRANSACTION_REJECTED":
        return (
          <ArrowUpCircle size={22} />
        );

      case "ADMIN_DEBIT":
        return (
          <Wallet size={22} />
        );

      case "ADMIN_CREDIT":
        return (
          <CreditCard size={22} />
        );

      case "COMPETITION_AVAILABLE":
        return (
          <Trophy size={22} />
        );

      case "MATCH_READY":
        return (
          <CheckCircle size={22} />
        );

      case "MATCH_AVAILABLE":
        return (
          <Gamepad2 size={22} />
        );

      // compatibilité anciens types
      case "deposit_approved":
      case "deposit_rejected":
        return (
          <ArrowDownCircle size={22} />
        );

      case "withdraw_approved":
      case "withdraw_rejected":
        return (
          <ArrowUpCircle size={22} />
        );

      case "admin_debit":
        return (
          <Wallet size={22} />
        );

      case "admin_credit":
        return (
          <CreditCard size={22} />
        );

      case "competition_available":
        return (
          <Trophy size={22} />
        );

      case "match_ready":
        return (
          <CheckCircle size={22} />
        );

      case "match_available":
        return (
          <Gamepad2 size={22} />
        );

      default:
        return (
          <Bell size={22} />
        );
    }
  };

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
  // RENDER
  // ======================================================

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Bell size={28} />

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
            filter === "read"
          }
          onClick={() =>
            setFilter("read")
          }
        >
          Lues
        </FilterButton>
      </Filters>

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

function formatDate(date) {
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
    background: #0f172a;
    padding: 24px;
    color: white;
  `;

const Header =
  styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;

    @media (max-width: 768px) {
      flex-direction: column;
      gap: 15px;
      align-items: flex-start;
    }
  `;

const HeaderLeft =
  styled.div`
    display: flex;
    align-items: center;
    gap: 15px;
  `;

const Title = styled.h2`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
`;

const Subtitle = styled.p`
  margin: 4px 0 0;
  color: #94a3b8;
`;

const HeaderActions =
  styled.div`
    display: flex;
    gap: 10px;
  `;

const ActionButton =
  styled.button`
    border: none;
    background: #2563eb;
    color: white;
    padding: 12px 18px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 600;

    &:hover {
      background: #1d4ed8;
    }
  `;

const Filters = styled.div`
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
    font-weight: 600;

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
        : "#111827"};

    border: 1px solid
      ${({ $unread }) =>
        $unread
          ? "#3b82f6"
          : "#1f2937"};

    border-radius: 20px;
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
    width: 55px;
    min-width: 55px;
    height: 55px;
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

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
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
    font-weight: 600;
  `;

const DeleteButton =
  styled.button`
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 10px;
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