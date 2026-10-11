
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

const API = "/marchands/manager";
const PAGE_SIZE = 7;

const NAVIGATION = [
  { id: "overview", icon: "▦", label: "Vue d'ensemble" },
  { id: "settings", icon: "⚙", label: "Commissions globales" },
  { id: "merchants", icon: "♙", label: "Marchands & ambassadeurs" },
  { id: "operations", icon: "⇄", label: "Historique des opérations" },
];

const EMPTY_SETTINGS = {
  depositRate: "2",
  withdrawalRate: "1",
  ambassadorRate: "1.5",
};

const money = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const percent = (value) => `${money(value)} %`;

const dateFormat = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error) =>
  error?.message || "Une erreur inattendue est survenue.";

function readToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  } catch {
    return "";
  }
}

async function apiRequest(path, options = {}) {
  const response = await api.request({
    url: `${API}${path}`,
    method: options.method || "GET",
    data: options.body
      ? JSON.parse(options.body)
      : undefined,
    headers: options.headers,
  });

  const data = response.data;

  if (data?.success === false) {
    throw new Error(
      data.error ||
      data.message ||
      "Une erreur est survenue."
    );
  }

  return data;
}

function StatCard({ icon, label, value, detail, color = "blue" }) {
  return (
    <article className={`mm-stat mm-stat-${color}`}>
      <div className="mm-stat-top">
        <span className="mm-stat-label">{label}</span>
        <span className="mm-stat-icon">{icon}</span>
      </div>
      <div className="mm-stat-value">{value}</div>
      <div className="mm-stat-detail">{detail}</div>
    </article>
  );
}

function StatusBadge({ active, children }) {
  return (
    <span className={`mm-badge ${active ? "is-active" : "is-inactive"}`}>
      <span className="mm-status-dot" />
      {children}
    </span>
  );
}

function EmptyState({ icon = "⌕", title, detail }) {
  return (
    <div className="mm-empty">
      <div className="mm-empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

function Pagination({ pagination, onPage }) {
  const limit = pagination?.limit || PAGE_SIZE;
  const offset = pagination?.offset || 0;
  const total = pagination?.total || 0;
  const count = pagination?.count || 0;
  const start = total === 0 ? 0 : offset + 1;
  const end = offset + count;
  const hasPrevious = offset > 0;
  const hasNext = Boolean(pagination?.hasMore);

  return (
    <div className="mm-pagination">
      <span>
        {start}–{end} sur {total} résultat{total > 1 ? "s" : ""}
      </span>
      <div className="mm-pagination-actions">
        <button
          type="button"
          className="mm-button mm-button-light"
          disabled={!hasPrevious}
          onClick={() => onPage(Math.max(0, offset - limit))}
        >
          ← Précédent
        </button>
        <button
          type="button"
          className="mm-button mm-button-light"
          disabled={!hasNext}
          onClick={() => onPage(offset + limit)}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}

export default function MarchandManager() {
  const [section, setSection] = useState("overview");
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [merchants, setMerchants] = useState([]);
  const [operations, setOperations] = useState([]);
  const [merchantPagination, setMerchantPagination] = useState({
    limit: PAGE_SIZE,
    offset: 0,
    count: 0,
    total: 0,
    hasMore: false,
  });
  const [operationPagination, setOperationPagination] = useState({
    limit: PAGE_SIZE,
    offset: 0,
    count: 0,
    total: 0,
    hasMore: false,
  });

  const [merchantOffset, setMerchantOffset] = useState(0);
  const [operationOffset, setOperationOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [individualRate, setIndividualRate] = useState("");
  const [useGlobalRate, setUseGlobalRate] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const notify = useCallback((message) => {
    setNotice(message);
    setError("");
  }, []);

  const reportError = useCallback((err) => {
    setError(getErrorMessage(err));
    setNotice("");
  }, []);

  const loadSettings = useCallback(async () => {
    const data = await apiRequest("/settings");
    const s = data?.settings;

    if (!s) {
        throw new Error(
        "La réponse du serveur ne contient pas les réglages des commissions."
        );
    }

    setSettings({
        depositRate: String(s.deposit_rate ?? 0),
        withdrawalRate: String(s.withdrawal_rate ?? 0),
        ambassadorRate: String(s.ambassador_rate ?? 0),
    });
    }, []);

  const loadMerchants = useCallback(async (offset = 0) => {
    const data = await apiRequest(
      `/merchants?limit=${PAGE_SIZE}&offset=${offset}`
    );

    setMerchants(data.merchants || []);
    setMerchantPagination(data.pagination || {});
    setMerchantOffset(offset);
  }, []);

  const loadOperations = useCallback(async (offset = 0) => {
    const data = await apiRequest(
      `/operations?limit=${PAGE_SIZE}&offset=${offset}`
    );

    setOperations(data.operations || []);
    setOperationPagination(data.pagination || {});
    setOperationOffset(offset);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        loadSettings(),
        loadMerchants(merchantOffset),
        loadOperations(operationOffset),
      ]);

      const failed = results.find((result) => result.status === "rejected");

      if (failed) {
        throw failed.reason;
      }
    } catch (err) {
      reportError(err);
    } finally {
      setLoading(false);
    }
  }, [
    loadSettings,
    loadMerchants,
    loadOperations,
    merchantOffset,
    operationOffset,
    reportError,
  ]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const filteredMerchants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return merchants;

    return merchants.filter((merchant) =>
      [
        merchant.username,
        merchant.custom_id,
        merchant.email,
        merchant.id,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [merchants, search]);

  const activeMerchants = merchants.filter(
    (merchant) => merchant.merchant_enabled
  ).length;

  const suspendedMerchants = merchants.length - activeMerchants;

  const openMerchantEditor = (merchant) => {
    setSelectedMerchant(merchant);
    const override = merchant.ambassador_rate_override;
    setUseGlobalRate(override === null || override === undefined);
    setIndividualRate(
      override === null || override === undefined
        ? ""
        : String(override)
    );
    setError("");
    setNotice("");
  };

  const saveGlobalSettings = async (event) => {
    event.preventDefault();

    const rates = [
      settings.depositRate,
      settings.withdrawalRate,
      settings.ambassadorRate,
    ];

    const valid = rates.every((value) => {
      if (String(value).trim() === "") return false;
      if (!/^\d+(?:\.\d{1,2})?$/.test(String(value).trim())) {
        return false;
      }
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 && n <= 50;
    });

    if (!valid) {
      reportError(
        new Error("Chaque taux doit être compris entre 0 et 50 %, avec deux décimales maximum.")
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest("/settings", {
        method: "PUT",
        body: JSON.stringify({
          depositRate: Number(settings.depositRate),
          withdrawalRate: Number(settings.withdrawalRate),
          ambassadorRate: Number(settings.ambassadorRate),
        }),
      });

      const s = data.settings;
      setSettings({
        depositRate: String(s.deposit_rate),
        withdrawalRate: String(s.withdrawal_rate),
        ambassadorRate: String(s.ambassador_rate),
      });

      notify("Les commissions globales ont été enregistrées.");
    } catch (err) {
      reportError(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleMerchant = async (merchant) => {
    const nextValue = !merchant.merchant_enabled;

    if (
      !window.confirm(
        nextValue
          ? `Activer le service marchand pour ${merchant.username || merchant.id} ?`
          : `Suspendre le service marchand de ${merchant.username || merchant.id} ?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/merchants/${merchant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ merchantEnabled: nextValue }),
      });

      await loadMerchants(merchantOffset);
      notify(
        nextValue
          ? "Le service marchand a été activé."
          : "Le service marchand a été suspendu."
      );
    } catch (err) {
      reportError(err);
    } finally {
      setSaving(false);
    }
  };

  const saveIndividualRate = async (event) => {
    event.preventDefault();
    if (!selectedMerchant) return;

    let rate = null;

    if (!useGlobalRate) {
      const raw = individualRate.trim();

      if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
        reportError(
          new Error("Saisis un taux valide avec deux décimales maximum.")
        );
        return;
      }

      rate = Number(raw);

      if (!Number.isFinite(rate) || rate < 0 || rate > 50) {
        reportError(new Error("Le taux doit être compris entre 0 et 50 %."));
        return;
      }
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest(
        `/ambassadors/${selectedMerchant.id}/commission`,
        {
          method: "PATCH",
          body: JSON.stringify({ rate }),
        }
      );

      await loadMerchants(merchantOffset);

      setSelectedMerchant((previous) =>
        previous
          ? {
              ...previous,
              ambassador_rate_override:
                data.ambassador?.ambassadorRateOverride ?? null,
            }
          : previous
      );

      notify(
        useGlobalRate
          ? "Le taux global sera appliqué à cet ambassadeur."
          : "Le taux individuel a été enregistré."
      );

      setSelectedMerchant(null);
    } catch (err) {
      reportError(err);
    } finally {
      setSaving(false);
    }
  };

  const navigate = (id) => {
    setSection(id);
    setError("");
    setNotice("");
    setSearch("");
  };

  const reloadCurrentSection = async () => {
    setLoading(true);
    setError("");

    try {
      if (section === "settings") await loadSettings();
      if (section === "merchants") await loadMerchants(merchantOffset);
      if (section === "operations") await loadOperations(operationOffset);
      if (section === "overview") await refreshAll();

      notify("Les données ont été actualisées.");
    } catch (err) {
      reportError(err);
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    overview: ["Vue d'ensemble", "Suivez l'activité économique du SAJCL."],
    settings: ["Commissions globales", "Configurez les taux de rémunération."],
    merchants: ["Marchands & ambassadeurs", "Gérez les accès et les taux individuels."],
    operations: ["Historique des opérations", "Consultez les opérations marchandes enregistrées."],
  };

  return (
    <div className="mm-app">
      <style>{`
        .mm-app {
          --mm-bg: #f3f5f8;
          --mm-panel: #ffffff;
          --mm-text: #202633;
          --mm-muted: #727b8a;
          --mm-border: #e2e7ef;
          --mm-blue: #1769aa;
          --mm-blue-dark: #10558d;
          min-height: 100vh;
          display: flex;
          background: var(--mm-bg);
          color: var(--mm-text);
          font-family: "Segoe UI", Arial, sans-serif;
          font-size: 14px;
        }
        .mm-app * { box-sizing: border-box; }
        .mm-sidebar {
          width: 248px;
          flex: 0 0 248px;
          background: #fff;
          border-right: 1px solid var(--mm-border);
          display: flex;
          flex-direction: column;
        }
        .mm-brand {
          min-height: 82px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px;
          border-bottom: 1px solid var(--mm-border);
        }
        .mm-brand-mark {
          width: 40px; height: 40px;
          display: grid; place-items: center;
          border-radius: 8px;
          color: #fff; background: #1769aa;
          font-size: 22px; font-weight: 700;
        }
        .mm-brand-name { font-size: 16px; font-weight: 700; }
        .mm-brand-sub { margin-top: 4px; font-size: 11px; color: var(--mm-muted); }
        .mm-nav-title {
          padding: 25px 20px 10px;
          color: #8992a0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.1px;
          text-transform: uppercase;
        }
        .mm-nav { padding: 0 10px; display: grid; gap: 5px; }
        .mm-nav-item {
          width: 100%; display: flex; align-items: center; gap: 12px;
          border: 0; border-left: 3px solid transparent;
          border-radius: 5px; padding: 12px 12px;
          text-align: left; font: inherit; color: #525d6d;
          background: transparent; cursor: pointer;
          transition: background .15s ease;
        }
        .mm-nav-item:hover { background: #f2f6fb; }
        .mm-nav-item.active {
          color: #135f9b; background: #eaf3fc;
          border-left-color: #1769aa; font-weight: 600;
        }
        .mm-nav-icon { width: 20px; text-align: center; font-size: 17px; }
        .mm-sidebar-footer {
          margin-top: auto; padding: 18px 20px;
          border-top: 1px solid var(--mm-border);
          color: var(--mm-muted); font-size: 11px; line-height: 1.7;
        }
        .mm-main { flex: 1; min-width: 0; }
        .mm-topbar {
          height: 62px; background: #fff;
          border-bottom: 1px solid var(--mm-border);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 30px; gap: 15px;
        }
        .mm-breadcrumb { color: var(--mm-muted); font-size: 12px; }
        .mm-top-right { display: flex; align-items: center; gap: 12px; }
        .mm-admin {
          display: flex; align-items: center; gap: 9px;
          color: #455064; font-size: 12px;
        }
        .mm-admin-avatar {
          width: 32px; height: 32px; display: grid; place-items: center;
          border-radius: 50%; background: #e7f0fa; color: #1769aa;
          font-weight: 700;
        }
        .mm-content { max-width: 1600px; margin: auto; padding: 28px 30px 40px; }
        .mm-page-heading {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 18px; margin-bottom: 24px;
        }
        .mm-page-heading h1 { margin: 0; font-size: 25px; font-weight: 600; letter-spacing: -.5px; }
        .mm-page-heading p { margin: 8px 0 0; color: var(--mm-muted); font-size: 13px; }
        .mm-heading-actions { display: flex; gap: 9px; flex-wrap: wrap; }
        .mm-button {
          min-height: 36px; padding: 8px 13px; border-radius: 4px;
          border: 1px solid transparent; font: inherit; font-size: 12px;
          font-weight: 600; cursor: pointer; transition: .15s ease;
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        }
        .mm-button:disabled { opacity: .45; cursor: not-allowed; }
        .mm-button-primary { background: var(--mm-blue); color: #fff; }
        .mm-button-primary:hover:not(:disabled) { background: var(--mm-blue-dark); }
        .mm-button-light { color: #4b5667; background: #fff; border-color: #dce2ea; }
        .mm-button-light:hover:not(:disabled) { background: #f4f7fa; }
        .mm-button-danger { background: #fff; color: #b83232; border-color: #edcaca; }
        .mm-button-danger:hover:not(:disabled) { background: #fff2f2; }
        .mm-alert {
          padding: 12px 15px; border-radius: 5px; margin-bottom: 18px;
          display: flex; align-items: flex-start; gap: 9px; line-height: 1.5;
        }
        .mm-alert-error { background: #fff0f0; color: #a52a2a; border: 1px solid #f0cccc; }
        .mm-alert-success { background: #edf8f0; color: #236b3c; border: 1px solid #cbe9d2; }
        .mm-stats {
          display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px; margin-bottom: 23px;
        }
        .mm-stat {
          min-width: 0; padding: 19px 20px; border-radius: 6px;
          background: #fff; border: 1px solid var(--mm-border);
          box-shadow: 0 1px 2px rgba(25, 42, 70, .025);
        }
        .mm-stat-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .mm-stat-label { font-size: 12px; color: #697486; }
        .mm-stat-icon {
          width: 32px; height: 32px; display: grid; place-items: center;
          border-radius: 6px; font-size: 17px; background: #eaf3fc; color: #1769aa;
        }
        .mm-stat-green .mm-stat-icon { background: #e8f7ee; color: #20804a; }
        .mm-stat-orange .mm-stat-icon { background: #fff3e3; color: #b66a14; }
        .mm-stat-purple .mm-stat-icon { background: #f2eaff; color: #7943af; }
        .mm-stat-value { margin-top: 16px; font-size: 26px; line-height: 1.2; font-weight: 650; overflow-wrap: anywhere; }
        .mm-stat-detail { margin-top: 7px; font-size: 11px; color: #8992a0; }
        .mm-panel {
          background: #fff; border: 1px solid var(--mm-border);
          border-radius: 6px; margin-bottom: 20px; min-width: 0;
        }
        .mm-panel-header {
          padding: 18px 21px; display: flex; align-items: center;
          justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--mm-border);
        }
        .mm-panel-title { font-size: 15px; font-weight: 650; margin: 0; }
        .mm-panel-subtitle { color: var(--mm-muted); font-size: 12px; margin: 5px 0 0; }
        .mm-panel-body { padding: 22px; }
        .mm-overview-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 20px; }
        .mm-rate-list { display: grid; gap: 0; }
        .mm-rate-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px 0; border-bottom: 1px solid #edf0f4;
        }
        .mm-rate-row:last-child { border-bottom: 0; }
        .mm-rate-label { color: #667183; font-size: 12px; }
        .mm-rate-value { font-size: 18px; font-weight: 650; }
        .mm-info-strip {
          background: #f1f6fc; border: 1px solid #dceaf8; color: #42617f;
          border-radius: 5px; padding: 13px 14px; font-size: 12px; line-height: 1.6;
        }
        .mm-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; padding: 16px 20px;
          border-bottom: 1px solid var(--mm-border);
        }
        .mm-search {
          min-height: 36px; width: min(100%, 330px); padding: 8px 11px;
          border: 1px solid #dce2ea; border-radius: 4px; outline: none;
          font: inherit; color: var(--mm-text); background: #fff;
        }
        .mm-search:focus, .mm-input:focus {
          border-color: #5d9ed8; box-shadow: 0 0 0 2px rgba(23, 105, 170, .1);
        }
        .mm-table-wrap { width: 100%; overflow-x: auto; }
        .mm-table { border-collapse: collapse; width: 100%; min-width: 760px; text-align: left; }
        .mm-table th {
          background: #f8fafc; padding: 12px 16px; color: #758093;
          font-size: 10px; letter-spacing: .5px; text-transform: uppercase;
          font-weight: 700; white-space: nowrap;
        }
        .mm-table td {
          padding: 14px 16px; border-top: 1px solid #edf0f4;
          color: #485365; font-size: 12px; vertical-align: middle;
        }
        .mm-table tbody tr:hover { background: #fafcff; }
        .mm-user-cell { display: flex; align-items: center; gap: 10px; min-width: 170px; }
        .mm-user-avatar {
          flex: 0 0 34px; width: 34px; height: 34px; border-radius: 50%;
          display: grid; place-items: center; background: #eaf3fc; color: #1769aa;
          font-weight: 700; font-size: 12px;
        }
        .mm-user-name { font-weight: 650; color: #2e3746; font-size: 12px; }
        .mm-user-meta { color: #8b94a1; font-size: 11px; margin-top: 4px; }
        .mm-badge {
          display: inline-flex; align-items: center; gap: 6px;
          border-radius: 20px; padding: 5px 9px; font-size: 10px;
          font-weight: 650; white-space: nowrap;
        }
        .mm-badge.is-active { color: #207444; background: #e8f7ee; }
        .mm-badge.is-inactive { color: #747d8b; background: #eef0f3; }
        .mm-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .mm-inline-actions { display: flex; gap: 7px; flex-wrap: wrap; }
        .mm-small-button {
          padding: 6px 9px; border-radius: 4px; border: 1px solid #dce2ea;
          background: #fff; color: #475467; cursor: pointer; font: inherit; font-size: 11px;
        }
        .mm-small-button:hover { background: #f2f6fb; }
        .mm-small-button:disabled { opacity: .5; cursor: not-allowed; }
        .mm-pagination {
          padding: 15px 20px; border-top: 1px solid var(--mm-border);
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; color: #7b8493; font-size: 11px;
        }
        .mm-pagination-actions { display: flex; gap: 8px; }
        .mm-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 17px; }
        .mm-field { display: grid; gap: 8px; }
        .mm-field label { font-size: 12px; color: #505b6c; font-weight: 600; }
        .mm-field small { font-size: 11px; color: #8b94a1; line-height: 1.5; }
        .mm-input-wrap { position: relative; }
        .mm-input {
          width: 100%; min-height: 41px; padding: 10px 36px 10px 12px;
          border: 1px solid #dce2ea; border-radius: 4px; outline: none;
          font: inherit; color: var(--mm-text); background: #fff;
        }
        .mm-input-suffix {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: #818a98; pointer-events: none;
        }
        .mm-form-actions {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 10px; padding-top: 22px; margin-top: 22px;
          border-top: 1px solid #edf0f4;
        }
        .mm-empty {
          text-align: center; padding: 42px 20px; color: #7a8492;
        }
        .mm-empty-icon { font-size: 28px; margin-bottom: 10px; color: #a0a9b6; }
        .mm-empty strong { display: block; font-size: 13px; color: #475264; }
        .mm-empty p { font-size: 12px; margin: 7px 0 0; }
        .mm-modal-backdrop {
          position: fixed; inset: 0; z-index: 1000; padding: 20px;
          background: rgba(19, 29, 43, .4); display: grid; place-items: center;
        }
        .mm-modal {
          width: min(100%, 470px); background: #fff; border-radius: 7px;
          box-shadow: 0 18px 60px rgba(18, 35, 56, .22); overflow: hidden;
        }
        .mm-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px; border-bottom: 1px solid var(--mm-border);
        }
        .mm-modal-header h2 { margin: 0; font-size: 16px; }
        .mm-modal-close {
          border: 0; background: transparent; font-size: 22px;
          color: #788291; cursor: pointer;
        }
        .mm-modal-body { padding: 22px; }
        .mm-modal-footer {
          display: flex; justify-content: flex-end; gap: 9px;
          padding: 15px 22px; background: #fafbfd; border-top: 1px solid var(--mm-border);
        }
        .mm-radio-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px; border: 1px solid #e2e7ef; border-radius: 5px;
          margin-bottom: 10px; cursor: pointer;
        }
        .mm-radio-row.selected { border-color: #72a9da; background: #f3f8fd; }
        .mm-radio-row input { margin-top: 3px; accent-color: #1769aa; }
        .mm-radio-row strong { display: block; font-size: 12px; }
        .mm-radio-row small { display: block; margin-top: 4px; color: #7d8795; font-size: 11px; line-height: 1.5; }
        .mm-loading { opacity: .65; pointer-events: none; }
        @media (max-width: 1100px) {
          .mm-sidebar { width: 218px; flex-basis: 218px; }
          .mm-content { padding: 24px 20px 35px; }
          .mm-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .mm-overview-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .mm-app { display: block; }
          .mm-sidebar { width: 100%; border-right: 0; border-bottom: 1px solid var(--mm-border); }
          .mm-brand { min-height: 65px; padding: 12px 16px; }
          .mm-brand-mark { width: 35px; height: 35px; }
          .mm-nav-title { padding: 13px 16px 7px; }
          .mm-nav { display: flex; overflow-x: auto; padding: 0 10px 10px; gap: 5px; }
          .mm-nav-item { flex: 0 0 auto; width: auto; padding: 10px 11px; font-size: 11px; border-left: 0; border-bottom: 2px solid transparent; }
          .mm-nav-item.active { border-bottom-color: #1769aa; }
          .mm-sidebar-footer { display: none; }
          .mm-topbar { height: 49px; padding: 0 16px; }
          .mm-content { padding: 21px 13px 28px; }
          .mm-page-heading { flex-direction: column; }
          .mm-page-heading h1 { font-size: 22px; }
          .mm-stats { gap: 10px; }
          .mm-stat { padding: 14px; }
          .mm-stat-value { font-size: 23px; }
          .mm-panel-header, .mm-panel-body { padding: 16px; }
          .mm-form-grid { grid-template-columns: 1fr; }
          .mm-toolbar { padding: 13px; }
          .mm-search { width: 100%; }
          .mm-admin-label { display: none; }
        }
        @media (max-width: 390px) {
          .mm-stats { grid-template-columns: 1fr; }
          .mm-stat-value { font-size: 22px; }
          .mm-pagination { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      <aside className="mm-sidebar">
        <div className="mm-brand">
          <div className="mm-brand-mark">S</div>
          <div>
            <div className="mm-brand-name">SAJCL</div>
            <div className="mm-brand-sub">Administration économique</div>
          </div>
        </div>

        <div className="mm-nav-title">Espace économique</div>
        <nav className="mm-nav" aria-label="Navigation marchande">
          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mm-nav-item ${section === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <span className="mm-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mm-sidebar-footer">
          <strong>SAJCL · Module économique</strong>
          <br />
          Gestion des commissions et marchands
          <br />
          © {new Date().getFullYear()} 6BetBall
        </div>
      </aside>

      <main className="mm-main">
        <header className="mm-topbar">
          <div className="mm-breadcrumb">SAJCL / Module économique</div>
          <div className="mm-top-right">
            <span className="mm-breadcrumb">Administration</span>
            <div className="mm-admin">
              <span className="mm-admin-avatar">A</span>
              <span className="mm-admin-label">Administrateur</span>
            </div>
          </div>
        </header>

        <div className="mm-content">
          <div className="mm-page-heading">
            <div>
              <h1>{titles[section][0]}</h1>
              <p>{titles[section][1]}</p>
            </div>
            <div className="mm-heading-actions">
              <button
                type="button"
                className="mm-button mm-button-light"
                disabled={loading || saving}
                onClick={reloadCurrentSection}
              >
                ↻ Actualiser
              </button>
            </div>
          </div>

          {error && (
            <div className="mm-alert mm-alert-error" role="alert">
              <span>⚠</span>
              <span>{error}</span>
              <button
                type="button"
                className="mm-modal-close"
                style={{ marginLeft: "auto", fontSize: 17 }}
                onClick={() => setError("")}
                aria-label="Fermer l'erreur"
              >
                ×
              </button>
            </div>
          )}

          {notice && (
            <div className="mm-alert mm-alert-success" role="status">
              <span>✓</span>
              <span>{notice}</span>
              <button
                type="button"
                className="mm-modal-close"
                style={{ marginLeft: "auto", fontSize: 17 }}
                onClick={() => setNotice("")}
                aria-label="Fermer le message"
              >
                ×
              </button>
            </div>
          )}

          <div className={loading ? "mm-loading" : ""}>
            {section === "overview" && (
              <>
                <div className="mm-stats">
                  <StatCard
                    icon="♙"
                    label="Ambassadeurs recensés"
                    value={money(merchantPagination.total)}
                    detail="Comptes ayant le rôle ambassadeur"
                  />
                  <StatCard
                    icon="✓"
                    color="green"
                    label="Marchands actifs sur la page"
                    value={money(activeMerchants)}
                    detail={`${money(suspendedMerchants)} inactif(s) sur cette page`}
                  />
                  <StatCard
                    icon="%"
                    color="purple"
                    label="Commission sur dépôts"
                    value={percent(settings.depositRate)}
                    detail="Taux global configuré"
                  />
                  <StatCard
                    icon="⇄"
                    color="orange"
                    label="Opérations enregistrées"
                    value={money(operationPagination.total)}
                    detail="Total de l'historique disponible"
                  />
                </div>

                <div className="mm-overview-grid">
                  <section className="mm-panel">
                    <div className="mm-panel-header">
                      <div>
                        <h2 className="mm-panel-title">Configuration des commissions</h2>
                        <p className="mm-panel-subtitle">Taux actuellement enregistrés</p>
                      </div>
                      <button
                        type="button"
                        className="mm-button mm-button-light"
                        onClick={() => navigate("settings")}
                      >
                        Modifier
                      </button>
                    </div>
                    <div className="mm-panel-body">
                      <div className="mm-rate-list">
                        <div className="mm-rate-row">
                          <span className="mm-rate-label">Commission sur dépôt</span>
                          <span className="mm-rate-value">{percent(settings.depositRate)}</span>
                        </div>
                        <div className="mm-rate-row">
                          <span className="mm-rate-label">Commission sur retrait</span>
                          <span className="mm-rate-value">{percent(settings.withdrawalRate)}</span>
                        </div>
                        <div className="mm-rate-row">
                          <span className="mm-rate-label">Taux global ambassadeur</span>
                          <span className="mm-rate-value">{percent(settings.ambassadorRate)}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="mm-panel">
                    <div className="mm-panel-header">
                      <div>
                        <h2 className="mm-panel-title">Accès rapides</h2>
                        <p className="mm-panel-subtitle">Actions du module économique</p>
                      </div>
                    </div>
                    <div className="mm-panel-body">
                      <div className="mm-rate-list">
                        <div className="mm-rate-row">
                          <div>
                            <strong>Marchands & ambassadeurs</strong>
                            <p className="mm-panel-subtitle">Activer un compte et régler son taux</p>
                          </div>
                          <button
                            type="button"
                            className="mm-button mm-button-light"
                            onClick={() => navigate("merchants")}
                          >
                            Ouvrir →
                          </button>
                        </div>
                        <div className="mm-rate-row">
                          <div>
                            <strong>Historique des opérations</strong>
                            <p className="mm-panel-subtitle">Consulter les commissions enregistrées</p>
                          </div>
                          <button
                            type="button"
                            className="mm-button mm-button-light"
                            onClick={() => navigate("operations")}
                          >
                            Ouvrir →
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="mm-info-strip">
                  <strong>À savoir :</strong> les chiffres des marchands actifs sont calculés
                  sur la page actuellement chargée. Le nombre total d'ambassadeurs provient
                  de la pagination du serveur. Ce tableau de bord n'effectue aucune écriture
                  financière.
                </div>
              </>
            )}

            {section === "settings" && (
              <section className="mm-panel">
                <div className="mm-panel-header">
                  <div>
                    <h2 className="mm-panel-title">Paramètres des commissions</h2>
                    <p className="mm-panel-subtitle">
                      Les taux sont exprimés en pourcentage. Plafond autorisé : 50 %.
                    </p>
                  </div>
                </div>

                <form className="mm-panel-body" onSubmit={saveGlobalSettings}>
                  <div className="mm-form-grid">
                    <div className="mm-field">
                      <label htmlFor="mm-deposit-rate">Commission sur dépôt</label>
                      <div className="mm-input-wrap">
                        <input
                          id="mm-deposit-rate"
                          className="mm-input"
                          type="number"
                          min="0"
                          max="50"
                          step="0.01"
                          required
                          value={settings.depositRate}
                          onChange={(event) =>
                            setSettings((previous) => ({
                              ...previous,
                              depositRate: event.target.value,
                            }))
                          }
                        />
                        <span className="mm-input-suffix">%</span>
                      </div>
                      <small>Taux global appliqué aux dépôts selon les règles du service financier.</small>
                    </div>

                    <div className="mm-field">
                      <label htmlFor="mm-withdrawal-rate">Commission sur retrait</label>
                      <div className="mm-input-wrap">
                        <input
                          id="mm-withdrawal-rate"
                          className="mm-input"
                          type="number"
                          min="0"
                          max="50"
                          step="0.01"
                          required
                          value={settings.withdrawalRate}
                          onChange={(event) =>
                            setSettings((previous) => ({
                              ...previous,
                              withdrawalRate: event.target.value,
                            }))
                          }
                        />
                        <span className="mm-input-suffix">%</span>
                      </div>
                      <small>Taux global de commission sur les retraits.</small>
                    </div>

                    <div className="mm-field">
                      <label htmlFor="mm-ambassador-rate">Commission ambassadeur</label>
                      <div className="mm-input-wrap">
                        <input
                          id="mm-ambassador-rate"
                          className="mm-input"
                          type="number"
                          min="0"
                          max="50"
                          step="0.01"
                          required
                          value={settings.ambassadorRate}
                          onChange={(event) =>
                            setSettings((previous) => ({
                              ...previous,
                              ambassadorRate: event.target.value,
                            }))
                          }
                        />
                        <span className="mm-input-suffix">%</span>
                      </div>
                      <small>Taux par défaut des ambassadeurs sans taux individuel.</small>
                    </div>
                  </div>

                  <div className="mm-info-strip" style={{ marginTop: 24 }}>
                    Les valeurs sont enregistrées sur le serveur. Le calcul effectif des
                    commissions doit aussi respecter ces limites dans le service financier.
                  </div>

                  <div className="mm-form-actions">
                    <button
                      type="button"
                      className="mm-button mm-button-light"
                      disabled={saving}
                      onClick={loadSettings}
                    >
                      Annuler les modifications
                    </button>
                    <button
                      type="submit"
                      className="mm-button mm-button-primary"
                      disabled={saving}
                    >
                      {saving ? "Enregistrement…" : "✓ Enregistrer les taux"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {section === "merchants" && (
              <section className="mm-panel">
                <div className="mm-panel-header">
                  <div>
                    <h2 className="mm-panel-title">Répertoire des ambassadeurs</h2>
                    <p className="mm-panel-subtitle">
                      {money(merchantPagination.total)} compte(s) au total
                    </p>
                  </div>
                  <StatusBadge active>
                    Gestion administrateur
                  </StatusBadge>
                </div>

                <div className="mm-toolbar">
                  <input
                    className="mm-search"
                    type="search"
                    aria-label="Rechercher un ambassadeur"
                    placeholder="⌕  Rechercher par nom, ID ou e-mail…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <span className="mm-breadcrumb">
                    {filteredMerchants.length} résultat(s) affiché(s) sur cette page
                  </span>
                </div>

                {filteredMerchants.length === 0 ? (
                  <EmptyState
                    title="Aucun ambassadeur trouvé"
                    detail={
                      search
                        ? "Essaie un autre nom, identifiant ou e-mail."
                        : "Aucun ambassadeur n'est disponible sur cette page."
                    }
                  />
                ) : (
                  <div className="mm-table-wrap">
                    <table className="mm-table">
                      <thead>
                        <tr>
                          <th>Ambassadeur</th>
                          <th>Compte</th>
                          <th>Solde portefeuille</th>
                          <th>Taux individuel</th>
                          <th>Service marchand</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMerchants.map((merchant) => {
                          const blocked =
                            merchant.is_suspended === true ||
                            merchant.is_banned === true ||
                            ["suspended", "banned"].includes(
                              String(merchant.account_status || "").toLowerCase()
                            );

                          const override = merchant.ambassador_rate_override;
                          const hasOverride =
                            override !== null && override !== undefined;

                          return (
                            <tr key={merchant.id}>
                              <td>
                                <div className="mm-user-cell">
                                  <div className="mm-user-avatar">
                                    {String(merchant.username || "A")
                                      .trim()
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="mm-user-name">
                                      {merchant.username || "Sans nom"}
                                    </div>
                                    <div className="mm-user-meta">
                                      {merchant.custom_id || `ID ${merchant.id}`}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div>{merchant.email || "—"}</div>
                                <div className="mm-user-meta">
                                  {merchant.account_status || "Statut non précisé"}
                                </div>
                              </td>
                              <td>
                                <strong>{money(merchant.wallet_balance)} FC</strong>
                              </td>
                              <td>
                                <div>{hasOverride ? percent(override) : "Taux global"}</div>
                                <div className="mm-user-meta">
                                  {hasOverride
                                    ? "Personnalisé"
                                    : percent(settings.ambassadorRate)}
                                </div>
                              </td>
                              <td>
                                <StatusBadge active={merchant.merchant_enabled}>
                                  {merchant.merchant_enabled ? "Actif" : "Suspendu"}
                                </StatusBadge>
                                {blocked && (
                                  <div className="mm-user-meta" style={{ color: "#b83232" }}>
                                    Compte bloqué
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="mm-inline-actions">
                                  <button
                                    type="button"
                                    className="mm-small-button"
                                    disabled={saving}
                                    onClick={() => openMerchantEditor(merchant)}
                                  >
                                    Taux
                                  </button>
                                  <button
                                    type="button"
                                    className={`mm-small-button ${merchant.merchant_enabled ? "" : ""}`}
                                    disabled={saving || (blocked && !merchant.merchant_enabled)}
                                    title={
                                      blocked && !merchant.merchant_enabled
                                        ? "Un compte bloqué ne peut pas être activé."
                                        : ""
                                    }
                                    onClick={() => toggleMerchant(merchant)}
                                  >
                                    {merchant.merchant_enabled ? "Suspendre" : "Activer"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!search && (
                  <Pagination
                    pagination={merchantPagination}
                    onPage={async (offset) => {
                      setLoading(true);
                      setError("");
                      try {
                        await loadMerchants(offset);
                      } catch (err) {
                        reportError(err);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                )}
              </section>
            )}

            {section === "operations" && (
              <section className="mm-panel">
                <div className="mm-panel-header">
                  <div>
                    <h2 className="mm-panel-title">Opérations marchandes</h2>
                    <p className="mm-panel-subtitle">
                      {money(operationPagination.total)} opération(s) enregistrée(s)
                    </p>
                  </div>
                </div>

                {operations.length === 0 ? (
                  <EmptyState
                    icon="⇄"
                    title="Aucune opération enregistrée"
                    detail="Les opérations marchandes apparaîtront ici lorsqu'elles seront enregistrées dans la base de données."
                  />
                ) : (
                  <div className="mm-table-wrap">
                    <table className="mm-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Référence</th>
                          <th>Marchand</th>
                          <th>Client</th>
                          <th>Type</th>
                          <th>Montant</th>
                          <th>Commission</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operations.map((operation) => (
                          <tr key={operation.id}>
                            <td>{dateFormat(operation.created_at)}</td>
                            <td>
                              <strong>{operation.reference || `#${operation.id}`}</strong>
                            </td>
                            <td>
                              <div className="mm-user-name">
                                {operation.merchant_username || "—"}
                              </div>
                              <div className="mm-user-meta">
                                {operation.merchant_custom_id || `ID ${operation.merchant_id}`}
                              </div>
                            </td>
                            <td>
                              <div className="mm-user-name">
                                {operation.customer_username || "—"}
                              </div>
                              <div className="mm-user-meta">
                                {operation.customer_custom_id || `ID ${operation.customer_id}`}
                              </div>
                            </td>
                            <td>{operation.operation_type || "—"}</td>
                            <td>
                              <strong>{money(operation.amount)} FC</strong>
                            </td>
                            <td>
                              <div>{money(operation.commission_amount)} FC</div>
                              <div className="mm-user-meta">
                                {percent(operation.commission_rate)}
                              </div>
                            </td>
                            <td>
                              <StatusBadge
                                active={
                                  String(operation.status || "").toLowerCase() === "completed" ||
                                  String(operation.status || "").toLowerCase() === "success" ||
                                  String(operation.status || "").toLowerCase() === "completed"
                                }
                              >
                                {operation.status || "Inconnu"}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Pagination
                  pagination={operationPagination}
                  onPage={async (offset) => {
                    setLoading(true);
                    setError("");
                    try {
                      await loadOperations(offset);
                    } catch (err) {
                      reportError(err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              </section>
            )}
          </div>
        </div>
      </main>

      {selectedMerchant && (
        <div
          className="mm-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setSelectedMerchant(null);
            }
          }}
        >
          <section
            className="mm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mm-rate-modal-title"
          >
            <div className="mm-modal-header">
              <div>
                <h2 id="mm-rate-modal-title">Commission individuelle</h2>
                <div className="mm-user-meta">
                  {selectedMerchant.username || `Ambassadeur ${selectedMerchant.id}`}
                </div>
              </div>
              <button
                type="button"
                className="mm-modal-close"
                disabled={saving}
                onClick={() => setSelectedMerchant(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveIndividualRate}>
              <div className="mm-modal-body">
                <label
                  className={`mm-radio-row ${useGlobalRate ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="mm-rate-mode"
                    checked={useGlobalRate}
                    onChange={() => setUseGlobalRate(true)}
                  />
                  <span>
                    <strong>Utiliser le taux global</strong>
                    <small>
                      Taux actuel : {percent(settings.ambassadorRate)}. Les changements
                      futurs du taux global seront pris en compte.
                    </small>
                  </span>
                </label>

                <label
                  className={`mm-radio-row ${!useGlobalRate ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="mm-rate-mode"
                    checked={!useGlobalRate}
                    onChange={() => setUseGlobalRate(false)}
                  />
                  <span>
                    <strong>Définir un taux personnalisé</strong>
                    <small>Un taux propre à cet ambassadeur, compris entre 0 et 50 %.</small>
                  </span>
                </label>

                {!useGlobalRate && (
                  <div className="mm-field" style={{ marginTop: 18 }}>
                    <label htmlFor="mm-individual-rate">Taux de commission</label>
                    <div className="mm-input-wrap">
                      <input
                        id="mm-individual-rate"
                        className="mm-input"
                        type="number"
                        min="0"
                        max="50"
                        step="0.01"
                        required
                        value={individualRate}
                        onChange={(event) => setIndividualRate(event.target.value)}
                        placeholder="Ex. : 2.5"
                      />
                      <span className="mm-input-suffix">%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mm-modal-footer">
                <button
                  type="button"
                  className="mm-button mm-button-light"
                  disabled={saving}
                  onClick={() => setSelectedMerchant(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="mm-button mm-button-primary"
                  disabled={saving}
                >
                  {saving ? "Enregistrement…" : "Enregistrer le taux"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
