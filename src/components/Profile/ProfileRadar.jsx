import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  User, Wallet as WalletIcon, RefreshCw, Trophy, ShieldCheck, Phone, Mail,
  Globe, TrendingUp, Clock3, Star, Swords, Coins, BadgeCheck, WifiOff,
  Pencil, Save, X, CheckCircle2, AlertCircle, Copy
} from "lucide-react";
import WalletActions from "../WalletActions";
import "./ProfileRadar.css";

const API_URL = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem("token");
}

function getProfileId(profile) {
  return (
    profile?.custom_id ||
    profile?.customId ||
    profile?.customID ||
    profile?.id ||
    profile?.user_id ||
    null
  );
}

function getInternalId(profile) {
  return profile?.user_id ?? profile?.id ?? null;
}

function getErrorMessage(data, fallback) {
  return data?.message || data?.error || fallback;
}

function SectionTitle({ icon, title, action }) {
  return (
    <div className="pr-section-title">
      <div className="pr-section-heading">{icon}<span>{title}</span></div>
      {action}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="pr-info-row">
      <div className="pr-info-label">{icon}<span>{label}</span></div>
      <strong>{value || "Non renseigné"}</strong>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="pr-stat-card">
      <div className="pr-stat-icon">{icon}</div>
      <div className="pr-stat-value">{value}</div>
      <div className="pr-stat-label">{label}</div>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="pr-mini-stat">
      <div className="pr-mini-label">{icon}<span>{label}</span></div>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileField({ label, name, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="pr-field">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        autoComplete={name === "email" ? "email" : name === "phone" ? "tel" : "off"}
      />
    </label>
  );
}

export default function ProfileRadar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", country: "" });
  const mountedRef = useRef(false);
  const requestRef = useRef(null);

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (!API_URL) {
      setError("La variable VITE_API_URL n'est pas configurée.");
      setLoading(false);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      setError("Connexion internet indisponible.");
      setLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
      setUser(null);
      setError("Utilisateur non authentifié. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/user/profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: controller.signal,
      });

      if (response.status === 401) {
        setUser(null);
        setError("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await response.json() : null;
      if (!response.ok) throw new Error(getErrorMessage(data, "Impossible de charger le profil."));
      if (!data || typeof data !== "object") throw new Error("Réponse serveur invalide.");

      // Certaines API renvoient { user: {...} }, d'autres directement l'objet utilisateur.
      const profile = data.user && typeof data.user === "object" ? data.user : data;
      if (mountedRef.current) {
        setUser(profile);
        setForm({
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          country: profile.country ?? "",
        });
        setOffline(false);
      }
    } catch (err) {
      if (err.name !== "AbortError" && mountedRef.current) {
        setError(err.message || "Erreur lors du chargement du profil.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadProfile();
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, [loadProfile]);

  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      loadProfile({ silent: true });
    };
    const onOffline = () => setOffline(true);
    const onFocus = () => {
      if (navigator.onLine) loadProfile({ silent: true });
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadProfile]);

  const updateForm = useCallback((name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
    setNotice("");
  }, []);

  const startEditing = () => {
    setForm({
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      country: user?.country ?? "",
    });
    setNotice("");
    setError("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm({
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      country: user?.country ?? "",
    });
    setEditing(false);
    setError("");
    setNotice("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!API_URL) {
      setError("La variable VITE_API_URL n'est pas configurée.");
      return;
    }
    const token = getToken();
    if (!token) {
      setError("Utilisateur non authentifié. Veuillez vous reconnecter.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      // Seuls les champs autorisés sont envoyés. Nom, âge et identifiants sont exclus.
      const payload = {
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
      };
      const response = await fetch(`${API_URL}/user/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await response.json() : null;
      if (response.status === 401) throw new Error("Session expirée. Veuillez vous reconnecter.");
      if (!response.ok) throw new Error(getErrorMessage(data, "La mise à jour du profil a échoué."));

      const updated = data?.user && typeof data.user === "object" ? data.user : data;
      if (updated && typeof updated === "object") {
        setUser((previous) => ({ ...previous, ...updated }));
        setForm({
          email: updated.email ?? payload.email,
          phone: updated.phone ?? payload.phone,
          country: updated.country ?? payload.country,
        });
      } else {
        setUser((previous) => ({ ...previous, ...payload }));
      }
      setEditing(false);
      setNotice("Profil mis à jour avec succès.");
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour du profil.");
    } finally {
      setSaving(false);
    }
  };

  const balance = Number(user?.wallet?.balance ?? user?.balance ?? 0);
  const locked = Number(user?.wallet?.balance_locked ?? 0);
  const wins = Number(user?.wins ?? 0);
  const losses = Number(user?.losses ?? 0);
  const matches = Number(user?.matches ?? 0);
  const level = Number(user?.level ?? 1);
  const customId = getProfileId(user);
  const internalId = getInternalId(user);
  const winRate = useMemo(() => {
    const total = wins + losses;
    return total ? Number(((wins / total) * 100).toFixed(1)) : 0;
  }, [wins, losses]);

  const rank = useMemo(() => {
    if (wins >= 200) return "Grand Maître";
    if (wins >= 100) return "Maître";
    if (wins >= 50) return "Expert";
    if (wins >= 20) return "Confirmé";
    return "Débutant";
  }, [wins]);

  const copyId = async (value) => {
    if (value === null || value === undefined || value === "") return;
    try {
      await navigator.clipboard.writeText(String(value));
      setNotice("Identifiant copié.");
    } catch {
      setNotice("Copie impossible dans ce navigateur.");
    }
  };

  if (loading) {
    return (
      <main className="pr-page pr-centered">
        <div className="pr-loader" aria-hidden="true" />
        <h2>Chargement du profil…</h2>
        <p className="pr-muted">Récupération de vos informations</p>
      </main>
    );
  }

  if (!user && error) {
    return (
      <main className="pr-page">
        <div className="pr-state-card pr-error-card">
          <AlertCircle size={26} />
          <h2>Impossible d'afficher le profil</h2>
          <p>{error}</p>
          <button className="pr-button pr-button-primary" onClick={() => loadProfile()}>
            <RefreshCw size={16} /> Réessayer
          </button>
        </div>
      </main>
    );
  }

  if (!user) {
    return <main className="pr-page"><div className="pr-state-card">Aucun utilisateur trouvé.</div></main>;
  }

  return (
    <main className="pr-page">
      <header className="pr-hero">
        <div className="pr-hero-person">
          <div className="pr-avatar" aria-hidden="true">
            {(user.username || user.name || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="pr-hero-copy">
            <div className="pr-verified"><BadgeCheck size={15} /> Profil joueur</div>
            <h1>{user.username || user.name || "Utilisateur"}</h1>
            <div className="pr-hero-meta">
              {customId !== null && customId !== "" && <span>Custom ID : {String(customId)}</span>}
              {internalId !== null && internalId !== "" && <span>ID : {String(internalId)}</span>}
              <span>Niveau {level}</span>
              <span>{rank}</span>
            </div>
            {offline && <span className="pr-offline"><WifiOff size={14} /> Hors ligne</span>}
          </div>
        </div>
        <button className="pr-button pr-button-glass" onClick={() => loadProfile({ silent: true })} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? "pr-spin" : ""} />
          {refreshing ? "Actualisation…" : "Actualiser"}
        </button>
      </header>

      {(error || notice) && (
        <div className={`pr-notice ${error ? "pr-notice-error" : "pr-notice-success"}`} role="status">
          {error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          <span>{error || notice}</span>
          <button type="button" className="pr-icon-button" onClick={() => { setError(""); setNotice(""); }} aria-label="Fermer le message"><X size={16} /></button>
        </div>
      )}

      <div className="pr-grid">
        <section className="pr-card">
          <SectionTitle icon={<WalletIcon size={19} />} title="Portefeuille" />
          <div className="pr-wallet-box">
            <span className="pr-wallet-label">Solde disponible</span>
            <strong>{balance.toLocaleString()} <small>CDF</small></strong>
          </div>
          <div className="pr-mini-list">
            <MiniStat icon={<ShieldCheck size={15} />} label="Solde bloqué" value={`${locked.toLocaleString()} CDF`} />
            <MiniStat icon={<Coins size={15} />} label="Winrate" value={`${winRate}%`} />
          </div>
          <div className="pr-wallet-actions">
            <WalletActions onSuccess={() => loadProfile({ silent: true })} />
          </div>
        </section>

        <section className="pr-card">
          <SectionTitle
            icon={<User size={19} />}
            title="Informations du profil"
            action={!editing && <button className="pr-button pr-button-secondary" onClick={startEditing}><Pencil size={15} /> Modifier</button>}
          />
          {editing ? (
            <form className="pr-profile-form" onSubmit={saveProfile}>
              <p className="pr-form-help">Vous pouvez modifier les coordonnées ci-dessous. Le nom, l'âge et les identifiants restent inchangés.</p>
              <ProfileField label="Adresse e-mail" name="email" type="email" value={form.email} onChange={updateForm} placeholder="exemple@domaine.com" />
              <ProfileField label="Téléphone" name="phone" type="tel" value={form.phone} onChange={updateForm} placeholder="+243…" />
              <ProfileField label="Pays" name="country" value={form.country} onChange={updateForm} placeholder="Votre pays" />
              <div className="pr-form-actions">
                <button type="button" className="pr-button pr-button-secondary" onClick={cancelEditing} disabled={saving}><X size={16} /> Annuler</button>
                <button type="submit" className="pr-button pr-button-primary" disabled={saving}>
                  {saving ? <RefreshCw size={16} className="pr-spin" /> : <Save size={16} />}
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <InfoRow icon={<Mail size={15} />} label="E-mail" value={user.email} />
              <InfoRow icon={<Phone size={15} />} label="Téléphone" value={user.phone} />
              <InfoRow icon={<Globe size={15} />} label="Pays" value={user.country} />
              <InfoRow icon={<User size={15} />} label="Nom" value={user.username || user.name} />
              {user.age !== undefined && user.age !== null && <InfoRow icon={<Clock3 size={15} />} label="Âge" value={user.age} />}
              {customId !== null && customId !== "" && (
                <div className="pr-info-row">
                  <div className="pr-info-label"><BadgeCheck size={15} /><span>Custom ID</span></div>
                  <div className="pr-id-value"><strong>{String(customId)}</strong><button className="pr-copy-button" onClick={() => copyId(customId)} title="Copier le Custom ID" aria-label="Copier le Custom ID"><Copy size={14} /></button></div>
                </div>
              )}
              {internalId !== null && internalId !== "" && (
                <div className="pr-info-row">
                  <div className="pr-info-label"><ShieldCheck size={15} /><span>ID interne</span></div>
                  <div className="pr-id-value"><strong>{String(internalId)}</strong><button className="pr-copy-button" onClick={() => copyId(internalId)} title="Copier l'ID interne" aria-label="Copier l'ID interne"><Copy size={14} /></button></div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="pr-card">
          <SectionTitle icon={<Trophy size={19} />} title="Statistiques de jeu" />
          <div className="pr-stats-grid">
            <StatCard icon={<TrendingUp size={18} />} value={wins} label="Victoires" />
            <StatCard icon={<Swords size={18} />} value={losses} label="Défaites" />
            <StatCard icon={<Clock3 size={18} />} value={matches} label="Matchs" />
            <StatCard icon={<Star size={18} />} value={`${winRate}%`} label="Winrate" />
          </div>
          <div className="pr-progress-wrap">
            <div className="pr-progress-top"><span>Taux de victoire</span><strong>{winRate}%</strong></div>
            <div className="pr-progress-track" role="progressbar" aria-label="Taux de victoire" aria-valuenow={winRate} aria-valuemin={0} aria-valuemax={100}>
              <div className="pr-progress-fill" style={{ width: `${Math.min(100, Math.max(0, winRate))}%` }} />
            </div>
          </div>
        </section>

        <section className="pr-card">
          <SectionTitle icon={<Clock3 size={19} />} title="Transactions récentes" />
          {!user.transactions_list?.length ? (
            <div className="pr-empty-transactions">Aucune transaction à afficher.</div>
          ) : (
            <div className="pr-transactions">
              {user.transactions_list.slice(0, 8).map((transaction, index) => {
                const amount = Number(transaction?.amount ?? 0);
                const positive = amount > 0;
                return (
                  <div className="pr-transaction-row" key={transaction?.id ?? transaction?._id ?? `${transaction?.created_at ?? "transaction"}-${index}`}>
                    <div className="pr-transaction-main">
                      <strong>{transaction?.type || "Transaction"}</strong>
                      <span>{transaction?.created_at ? new Date(transaction.created_at).toLocaleString() : "Date inconnue"}</span>
                    </div>
                    <strong className={positive ? "pr-amount-positive" : "pr-amount-negative"}>
                      {positive ? "+" : ""}{amount.toLocaleString()} CDF
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
