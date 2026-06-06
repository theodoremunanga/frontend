import { useState } from "react";
import useAdminDashboard from "../hooks/useAdminDashboard";

const NAVBAR_HEIGHT = 70;

export default function AdminDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const {
    loading,
    stats,
    transactions,
    matches,
    messages,
    notifications,
    fetchData,
    approve,
    reject,
    cancelMatch,
  } = useAdminDashboard();

  const money = (v) => Number(v || 0).toLocaleString();

  const filteredTx = transactions.filter((t) => {
    const s = search.toLowerCase();
    return (
      (t.username?.toLowerCase().includes(s) ||
        String(t.id).includes(s)) &&
      (statusFilter === "all" || t.status === statusFilter)
    );
  });

  return (
    <div style={layout}>
      {/* SIDEBAR */}
      <div style={sidebar}>
        <h2>⚡ 6BetBall Admin</h2>

        {["dashboard", "transactions", "matches", "messages"].map((key) => (
          <div
            key={key}
            onClick={() => setTab(key)}
            style={{
              ...menuItem,
              background: tab === key ? "#2563eb" : "transparent",
            }}
          >
            {key}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={main}>
        <div style={header}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchBox}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={searchBox}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>

          <button onClick={fetchData} style={refresh}>🔄</button>
        </div>

        {loading && <p>Chargement...</p>}

        {tab === "dashboard" && (
          <div style={grid}>
            <Card title="Users" value={stats.users} />
            <Card title="Deposits" value={money(stats.totalDeposits)} />
            <Card title="Matches" value={stats.matches} />
          </div>
        )}

        {tab === "transactions" &&
          filteredTx.map((t) => (
            <div key={t.id} style={card}>
              <strong>{t.username}</strong> | {t.status}
              <br />
              {money(t.amount)}

              {t.status === "pending" && (
                <>
                  <button onClick={() => approve(t.id)} style={btn}>✔</button>
                  <button onClick={() => reject(t.id)} style={danger}>✖</button>
                </>
              )}
            </div>
          ))}

        {tab === "matches" &&
          matches.map((m) => (
            <div key={m.id} style={card}>
              {m.id} - {m.status}
              <button onClick={() => cancelMatch(m.id)} style={danger}>
                Cancel
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}