import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function PerceptorCM() {
  const [data, setData] = useState({
    balance: 0,
    locked: 0,
    totalCommission: 0,
    todayCommission: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlatform = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Token manquant");
        }

        const res = await axios.get(
          `${API}/admin/platform-wallet`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("💰 Perceptor API =>", res.data);

        // 🔥 IMPORTANT
        setData(
          res.data?.perceptor || {
            balance: 0,
            locked: 0,
            totalCommission: 0,
            todayCommission: 0,
          }
        );

      } catch (err) {
        console.error("PerceptorCM error:", err);

        setError(
          err?.response?.data?.error ||
            "Impossible de charger les données"
        );

      } finally {
        setLoading(false);
      }
    };

    fetchPlatform();
  }, []);

  // 🔄 LOADING
  if (loading) {
    return (
      <div style={{ color: "white" }}>
        ⏳ Chargement des données...
      </div>
    );
  }

  // ❌ ERROR
  if (error) {
    return (
      <div style={{ color: "red" }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div
      style={{
        color: "white",
        padding: 20,
        border: "1px solid #444",
        borderRadius: 12,
        marginTop: 20,
        background: "#1e1e1e",
        boxShadow: "0 0 10px rgba(0,0,0,0.4)",
      }}
    >
      <h2
        style={{
          marginBottom: 15,
          color: "#ffd700",
        }}
      >
        💰 Percepteur Commission
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr style={{ background: "#333" }}>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Valeur</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={tdStyle}>💼 Balance</td>

            <td style={tdStyle}>
              {Number(data.balance || 0).toLocaleString()} CDF
            </td>
          </tr>

          <tr>
            <td style={tdStyle}>🔒 Locked</td>

            <td style={tdStyle}>
              {Number(data.locked || 0).toLocaleString()} CDF
            </td>
          </tr>

          <tr>
            <td style={tdStyle}>📊 Total Commission</td>

            <td style={tdStyle}>
              {Number(
                data.totalCommission || 0
              ).toLocaleString()}{" "}
              CDF
            </td>
          </tr>

          <tr>
            <td style={tdStyle}>📅 Today Commission</td>

            <td style={tdStyle}>
              {Number(
                data.todayCommission || 0
              ).toLocaleString()}{" "}
              CDF
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: 12,
  border: "1px solid #555",
  textAlign: "left",
  color: "#ffd700",
};

const tdStyle = {
  padding: 12,
  border: "1px solid #444",
};