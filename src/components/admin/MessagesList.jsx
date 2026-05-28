// ======================================================
// IMPORTS
// ======================================================

import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { io } from "socket.io-client";

import api, { SOCKET_URL } from "../../services/api";
// ======================================================
// SOCKET
// ======================================================

const socket = io(
  SOCKET_URL,
  {
    transports: [
      "websocket",
    ],
    reconnection: true,
  }
);

// ======================================================
// HELPERS
// ======================================================

function formatDate(date) {
  if (!date) {
    return "--";
  }

  try {
    return new Date(
      date
    ).toLocaleString();
  } catch {
    return "--";
  }
}

function truncate(
  text,
  max = 140
) {
  if (!text) {
    return "";
  }

  if (
    text.length <= max
  ) {
    return text;
  }

  return (
    text.slice(0, max) +
    "..."
  );
}

function statusColor(
  status
) {
  switch (
    String(
      status
    ).toLowerCase()
  ) {
    case "approved":
    case "resolved":
    case "done":
    case "closed":
      return "#22c55e";

    case "pending":
    case "open":
      return "#f59e0b";

    case "rejected":
      return "#ef4444";

    default:
      return "#64748b";
  }
}

// ======================================================
// COMPONENT
// ======================================================

export default function Messages() {

  // ======================================================
  // STATES
  // ======================================================

  const [
    reports,
    setReports,
  ] = useState([]);

  const [
    claims,
    setClaims,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] = useState("reports");

  const [
    selected,
    setSelected,
  ] = useState(null);

  const [
    processingId,
    setProcessingId,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  // ======================================================
  // OFFLINE MODE
  // ======================================================

  const [
    isOffline,
    setIsOffline,
  ] = useState(
    !navigator.onLine
  );

  // ======================================================
  // NETWORK LISTENER
  // ======================================================

  useEffect(() => {

    const goOnline =
      () => {
        setIsOffline(
          false
        );
      };

    const goOffline =
      () => {
        setIsOffline(
          true
        );
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
  // LOAD DATA
  // ======================================================

  const loadData =
    useCallback(
      async (
        silent = false
      ) => {

        // ==================================================
        // OFFLINE
        // ==================================================

        if (isOffline) {

          setError(
            "⚠️ Hors ligne"
          );

          return;
        }

        try {

          if (!silent) {
            setLoading(
              true
            );
          }

          setRefreshing(
            true
          );

          setError("");

          const [
            reportsRes,
            claimsRes,
          ] =
            await Promise.all([
              api.get(
                "/admin/reports"
              ),

              api.get(
                "/admin/claims"
              ),
            ]);

          setReports(
            Array.isArray(
              reportsRes.data
            )
              ? reportsRes.data
              : reportsRes.data
                  ?.reports || []
          );

          setClaims(
            Array.isArray(
              claimsRes.data
            )
              ? claimsRes.data
              : claimsRes.data
                  ?.claims || []
          );

        } catch (err) {

          console.error(
            "❌ loadData:",
            err
          );

          setError(
            err?.message ||
            err?.response
              ?.data
              ?.error ||
            "Impossible de charger les messages"
          );

        } finally {

          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [isOffline]
    );

  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {

    loadData();

    // ==================================================
    // POLLING
    // ==================================================

    const interval =
      setInterval(() => {
        loadData(true);
      }, 15000);

    // ==================================================
    // SOCKET EVENTS
    // ==================================================

    socket.on(
      "new_report",
      () => {
        loadData(true);
      }
    );

    socket.on(
      "new_claim",
      () => {
        loadData(true);
      }
    );

    return () => {

      clearInterval(
        interval
      );

      socket.off(
        "new_report"
      );

      socket.off(
        "new_claim"
      );
    };

  }, [loadData]);

  // ======================================================
  // FILTERED REPORTS
  // ======================================================

  const filteredReports =
    useMemo(() => {

      const q =
        search.toLowerCase();

      return reports.filter(
        (r) => {

          return (
            String(
              r.id
            )
              .toLowerCase()
              .includes(q) ||

            String(
              r.match_id || ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              r.username ||
              r.user_name ||
              ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              r.reason ||
              r.message ||
              ""
            )
              .toLowerCase()
              .includes(q)
          );
        }
      );

    }, [
      reports,
      search,
    ]);

  // ======================================================
  // FILTERED CLAIMS
  // ======================================================

  const filteredClaims =
    useMemo(() => {

      const q =
        search.toLowerCase();

      return claims.filter(
        (c) => {

          return (
            String(
              c.id
            )
              .toLowerCase()
              .includes(q) ||

            String(
              c.subject || ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              c.username ||
              c.user_name ||
              ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              c.message || ""
            )
              .toLowerCase()
              .includes(q)
          );
        }
      );

    }, [
      claims,
      search,
    ]);

  // ======================================================
  // REPORT APPROVE
  // ======================================================

  const resolveReport =
    async (id) => {

      if (
        !window.confirm(
          "Marquer ce report comme résolu ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        await api.post(
          `/admin/reports/${id}/resolve`
        );

        await loadData(
          true
        );

        alert(
          "✅ Report résolu"
        );

      } catch (err) {

        console.error(
          err
        );

        alert(
          err?.message ||
          "Erreur résolution"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // CLAIM APPROVE
  // ======================================================

  const resolveClaim =
    async (id) => {

      if (
        !window.confirm(
          "Approuver cette réclamation ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        await api.post(
          `/admin/claims/${id}/approve`
        );

        await loadData(
          true
        );

        alert(
          "✅ Réclamation approuvée"
        );

      } catch (err) {

        console.error(
          err
        );

        alert(
          err?.message ||
          "Erreur approbation"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // REPORT REJECT
  // ======================================================

  const deleteReport =
    async (id) => {

      if (
        !window.confirm(
          "Rejeter ce report ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        await api.delete(
          `/admin/reports/${id}`
        );

        await loadData(
          true
        );

        setSelected(
          null
        );

        alert(
          "❌ Report rejeté"
        );

      } catch (err) {

        console.error(
          err
        );

        alert(
          err?.message ||
          "Erreur suppression"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // CLAIM REJECT
  // ======================================================

  const deleteClaim =
    async (id) => {

      if (
        !window.confirm(
          "Rejeter cette réclamation ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        await api.post(
          `/admin/claims/${id}/reject`,
          {
            reason:
              "Rejeté par administrateur",
          }
        );

        await loadData(
          true
        );

        alert(
          "❌ Réclamation rejetée"
        );

      } catch (err) {

        console.error(
          err
        );

        alert(
          err?.message ||
          "Erreur rejet"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // PERMANENT DELETE
  // ======================================================

  const permanentDelete =
    async (id) => {

      if (
        !window.confirm(
          "Supprimer définitivement ce message ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        const route =
          activeTab ===
          "reports"
            ? `/admin/reports/${id}`
            : `/admin/claims/${id}`;

        await api.delete(
          route
        );

        setSelected(
          null
        );

        await loadData(
          true
        );

        alert(
          "🗑 Message supprimé"
        );

      } catch (err) {

        console.error(
          err
        );

        alert(
          err?.message ||
          "Erreur suppression"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // CURRENT LIST
  // ======================================================

  const currentList =
    activeTab ===
    "reports"
      ? filteredReports
      : filteredClaims;

  // ======================================================
  // ACTIONS JSX
  // ======================================================

  /*
  <div style={detailsActions}>

    <button
      disabled={
        processingId === selected.id
      }
      onClick={() =>
        activeTab === "reports"
          ? resolveReport(selected.id)
          : resolveClaim(selected.id)
      }
      style={btnSuccess}
    >
      ✅ Approuver
    </button>

    <button
      disabled={
        processingId === selected.id
      }
      onClick={() =>
        activeTab === "reports"
          ? deleteReport(selected.id)
          : deleteClaim(selected.id)
      }
      style={btnDanger}
    >
      ❌ Rejeter
    </button>

    <button
      disabled={
        processingId === selected.id
      }
      onClick={() =>
        permanentDelete(selected.id)
      }
      style={btnDelete}
    >
      🗑 Supprimer
    </button>

  </div>
  */

}

// ======================================================
// DELETE BUTTON STYLE
// ======================================================

const btnDelete = {
  ...btnBase,
  background: "#7f1d1d",
};