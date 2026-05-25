export default function TransactionsTable({ transactions }) {
  return (
    <div style={{ background: "#222", padding: 20, borderRadius: 10 }}>
      <h3 style={{ color: "#fff" }}>📊 Transactions</h3>

      <table width="100%" style={{ color: "#fff" }}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Montant</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.type}</td>
              <td>{t.amount} CDF</td>
              <td>{new Date(t.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}