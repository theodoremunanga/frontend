import { useEffect, useMemo, useState } from "react";

import {
  getAllAds,
  deleteAd,
  toggleAdStatus,
} from "../services/adService";

import AdsEditor from "./AdsEditor";

export default function AdsManager() {
  // ======================================================
  // STATES — logique backend inchangée
  // ======================================================

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // ======================================================
  // LOAD ADS
  // ======================================================

  useEffect(() => {
    loadAds();
  }, []);

  async function loadAds() {
    try {
      setLoading(true);

      const data = await getAllAds();

      setAds(data || []);
    } catch (error) {
      console.error("Load ads error:", error);
    } finally {
      setLoading(false);
    }
  }

  // ======================================================
  // DELETE
  // ======================================================

  async function handleDelete(id) {
    const ok = window.confirm("Supprimer cette publicité ?");

    if (!ok) return;

    try {
      await deleteAd(id);
      await loadAds();
    } catch (error) {
      console.error("Delete ad error:", error);
    }
  }

  // ======================================================
  // TOGGLE STATUS
  // ======================================================

  async function handleToggle(id) {
    try {
      await toggleAdStatus(id);
      await loadAds();
    } catch (error) {
      console.error("Toggle ad error:", error);
    }
  }

  // ======================================================
  // EDIT / CREATE
  // ======================================================

  function handleEdit(ad) {
    setSelectedAd(ad);
    setIsEditing(true);
  }

  function handleCreate() {
    setSelectedAd(null);
    setIsEditing(true);
  }

  function handleCloseEditor() {
    setSelectedAd(null);
    setIsEditing(false);
    loadAds();
  }

  // ======================================================
  // STATS UI — aucune donnée backend modifiée
  // ======================================================

  const stats = useMemo(() => {
    const total = ads.length;
    const active = ads.filter((ad) => ad.status === "active").length;
    const inactive = total - active;
    const views = ads.reduce((sum, ad) => sum + Number(ad.views || 0), 0);
    const clicks = ads.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0);

    return { total, active, inactive, views, clicks };
  }, [ads]);

  // ======================================================
  // HELPERS D'AFFICHAGE
  // ======================================================

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function getIssuer(ad) {
    return (
      ad.company ||
      ad.companyName ||
      ad.enterprise ||
      ad.enterpriseName ||
      ad.businessName ||
      ad.business ||
      ad.issuer ||
      ad.advertiser ||
      ad.ownerName ||
      "Entreprise émettrice"
    );
  }

  function getStartDate(ad) {
    return (
      ad.startDate ||
      ad.start_date ||
      ad.issueDate ||
      ad.issue_date ||
      ad.publishedAt ||
      ad.published_at ||
      ad.createdAt ||
      ad.created_at
    );
  }

  function getEndDate(ad) {
    return (
      ad.endDate ||
      ad.end_date ||
      ad.expirationDate ||
      ad.expiration_date ||
      ad.expiresAt ||
      ad.expires_at ||
      ad.end_at
    );
  }

  function hasVideo(ad) {
    return Boolean(ad.video || ad.videoUrl || ad.video_url);
  }

  function getVideo(ad) {
    return ad.video || ad.videoUrl || ad.video_url;
  }

  function getImage(ad) {
    return ad.image || ad.imageUrl || ad.image_url;
  }

  function truncate(text, length = 180) {
    if (!text) return "Aucune description";
    const value = String(text);

    return value.length > length
      ? `${value.slice(0, length).trim()}…`
      : value;
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 px-5 py-6 text-white sm:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  Administration publicitaire
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Ads Manager
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-white/80 sm:text-base">
                  Gérez, consultez et contrôlez les publicités publiées sur la
                  plateforme.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-white/30"
              >
                <span className="text-lg leading-none">＋</span>
                Nouvelle publicité
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-5 sm:divide-y-0">
            <Stat label="Total" value={stats.total} />
            <Stat label="Actives" value={stats.active} accent="emerald" />
            <Stat label="Inactives" value={stats.inactive} accent="amber" />
            <Stat label="Vues" value={stats.views} accent="blue" />
            <Stat label="Clics" value={stats.clicks} accent="violet" />
          </div>
        </header>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
            <p className="font-semibold text-slate-700">
              Chargement des publicités…
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Récupération des annonces publiées.
            </p>
          </div>
        )}

        {/* ==================================================
            EMPTY
        ================================================== */}

        {!loading && ads.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-3xl">
              📢
            </div>

            <h2 className="text-xl font-bold text-slate-800">
              Aucune publicité
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Les publicités créées apparaîtront ici sous forme de fiches
              professionnelles.
            </p>

            <button
              type="button"
              onClick={handleCreate}
              className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              Créer une publicité
            </button>
          </div>
        )}

        {/* ==================================================
            ADS LIST
        ================================================== */}

        {!loading && ads.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Publicités publiées
                </h2>
                <p className="text-sm text-slate-500">
                  Vue détaillée des campagnes et de leurs performances.
                </p>
              </div>

              <span className="w-fit rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                {ads.length} publicité{ads.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {ads.map((ad) => {
                const image = getImage(ad);
                const video = getVideo(ad);
                const issuer = getIssuer(ad);
                const startDate = getStartDate(ad);
                const endDate = getEndDate(ad);
                const active = ad.status === "active";

                return (
                  <article
                    key={ad.id}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-xl"
                  >
                    <div className="flex flex-col xl:flex-row">
                      {/* MEDIA */}
                      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-slate-100 sm:aspect-[2/1] xl:aspect-auto xl:h-auto xl:min-h-[250px] xl:w-[320px]">
                        {image ? (
                          <img
                            src={image}
                            alt={ad.title || "Publicité"}
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                          />
                        ) : video ? (
                          <video
                            src={video}
                            className="absolute inset-0 h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-blue-50 text-violet-600">
                            <span className="text-4xl">📢</span>
                            <span className="mt-2 text-xs font-bold">
                              Aucun média
                            </span>
                          </div>
                        )}

                        {/* Media type */}
                        {(image || video) && (
                          <div className="absolute left-4 top-4 rounded-full bg-slate-950/70 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
                            {video && !image ? "▶ VIDÉO" : "🖼 IMAGE"}
                          </div>
                        )}

                        {/* Status */}
                        <div
                          className={`absolute right-4 top-4 rounded-full border px-3 py-1.5 text-[11px] font-extrabold backdrop-blur ${
                            active
                              ? "border-emerald-200 bg-emerald-50/95 text-emerald-700"
                              : "border-slate-200 bg-white/95 text-slate-600"
                          }`}
                        >
                          {active ? "● ACTIVE" : "○ INACTIVE"}
                        </div>
                      </div>

                      {/* CONTENT */}
                      <div className="min-w-0 flex-1 p-5 sm:p-6">
                        <div className="flex flex-col gap-5">
                          {/* Issuer + title */}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                🏢 {issuer}
                              </span>

                              {ad.category && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                  {ad.category}
                                </span>
                              )}
                            </div>

                            <h3 className="mt-3 break-words text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl">
                              {ad.title || "Sans titre"}
                            </h3>

                            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                              {truncate(ad.description)}
                            </p>
                          </div>

                          {/* Dates + metrics */}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <InfoItem
                              icon="📅"
                              label="Date d'émission"
                              value={formatDate(startDate)}
                            />

                            <InfoItem
                              icon="⏳"
                              label="Date de fin"
                              value={formatDate(endDate)}
                            />

                            <InfoItem
                              icon="👁"
                              label="Vues"
                              value={Number(ad.views || 0).toLocaleString(
                                "fr-FR"
                              )}
                            />

                            <InfoItem
                              icon="🖱"
                              label="Clics"
                              value={Number(ad.clicks || 0).toLocaleString(
                                "fr-FR"
                              )}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <div className="text-xs text-slate-400">
                              ID publicité :{" "}
                              <span className="font-semibold text-slate-500">
                                #{ad.id}
                              </span>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => handleEdit(ad)}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
                              >
                                ✏️ Modifier
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggle(ad.id)}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                              >
                                {active ? "⏸ Désactiver" : "▶ Activer"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(ad.id)}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100"
                              >
                                🗑 Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ==================================================
            EDITOR
        ================================================== */}

        {isEditing && (
          <AdsEditor ad={selectedAd} onClose={handleCloseEditor} />
        )}
      </div>
    </div>
  );
}

// ======================================================
// PRESENTATION HELPERS
// ======================================================

function Stat({ label, value, accent = "slate" }) {
  const colors = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
  };

  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-xl font-extrabold ${colors[accent]}`}>
        {Number(value || 0).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-extrabold text-slate-800">
        {value}
      </p>
    </div>
  );
}