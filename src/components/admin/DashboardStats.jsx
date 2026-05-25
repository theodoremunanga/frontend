export default function DashboardStats({ stats = {}, money }) {
  return (
    <div style={grid}>
      <Card title="👤 Users" value={stats.users} />

      <Card title="⚽ Matches" value={stats.matches} />

      <Card
        title="💰 Total Deposits"
        value={money(stats.totalDeposits || 0)}
      />

      <Card
        title="💸 Total Withdrawals"
        value={money(stats.totalWithdrawals || 0)}
      />

      <Card
        title="⏳ Pending Transactions"
        value={stats.pendingTx}
      />
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={card}>
      <h3 style={{ marginBottom: 5 }}>{title}</h3>
      <p style={{ fontSize: 18, fontWeight: "bold" }}>
        {value ?? 0}
      </p>
    </div>
  );
}

// 🎨 styles
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
  gap: 15,
};

const card = {
  background: "#1e293b",
  padding: 15,
  borderRadius: 10,
};