import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createAd,
  updateAd,
} from "../services/adService";

/**
 * ============================================================
 * AdsEditor — 6BetBall
 * ============================================================
 *
 * Éditeur professionnel de publicités.
 *
 * Compatible avec le backend existant :
 * - createAd(formData)
 * - updateAd(id, formData)
 *
 * Aucun changement backend nécessaire.
 */
export default function AdsEditor({
  ad = null,
  onClose,
}) {
  // ==========================================================
  // STATES
  // ==========================================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [preview, setPreview] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [mediaFile, setMediaFile] = useState(null);

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    image: "",
    video: "",
    link: "",
    advertiser: "",
    contact: "",
    category: "home_feed",
    status: "active",
    is_sponsored: true,
    comments_enabled: true,
    priority: 1,
    duration_hours: 24,
    start_date: "",
    end_date: "",
  });

  // ==========================================================
  // CATEGORIES
  // ==========================================================

  const categories = useMemo(
    () => [
      {
        value: "home_feed",
        label: "Fil d'accueil",
        description: "Publication classique sur l'accueil",
        icon: "🏠",
      },
      {
        value: "home_banner",
        label: "Bannière d'accueil",
        description: "Grande visibilité sur l'accueil",
        icon: "🖼️",
      },
      {
        value: "carousel",
        label: "Carousel",
        description: "Publicité affichée dans un carousel",
        icon: "🎞️",
      },
      {
        value: "pre_match",
        label: "Avant match",
        description: "Publicité affichée avant un match",
        icon: "⚽",
      },
      {
        value: "post_match",
        label: "Après match",
        description: "Publicité affichée après un match",
        icon: "🏆",
      },
      {
        value: "sponsored_post",
        label: "Publication sponsorisée",
        description: "Contenu publicitaire sponsorisé",
        icon: "💎",
      },
    ],
    []
  );

  // ==========================================================
  // LOAD EXISTING AD
  // ==========================================================

  useEffect(() => {
    if (!ad) return;

    setForm({
      title: ad.title || "",
      description: ad.description || "",
      image: ad.image || "",
      video: ad.video || "",
      link: ad.link || "",
      advertiser: ad.advertiser || "",
      contact: ad.contact || "",
      category: ad.category || "home_feed",
      status: ad.status || "active",
      is_sponsored: ad.is_sponsored ?? true,
      comments_enabled: ad.comments_enabled ?? true,
      priority: ad.priority || 1,
      duration_hours: ad.duration_hours || 24,

      start_date: ad.start_date
        ? formatDateTimeLocal(ad.start_date)
        : "",

      end_date: ad.end_date
        ? formatDateTimeLocal(ad.end_date)
        : "",
    });

    if (ad.video) {
      setMediaType("video");
      setPreview(ad.video);
    } else if (ad.image) {
      setMediaType("image");
      setPreview(ad.image);
    }
  }, [ad]);

  // ==========================================================
  // AUTO END DATE
  // ==========================================================

  useEffect(() => {
    if (!form.start_date) return;

    const start = new Date(form.start_date);

    if (Number.isNaN(start.getTime())) return;

    start.setHours(
      start.getHours() +
        Number(form.duration_hours || 0)
    );

    const formatted = toDateTimeLocal(start);

    setForm((prev) => ({
      ...prev,
      end_date: formatted,
    }));
  }, [
    form.start_date,
    form.duration_hours,
  ]);

  // ==========================================================
  // CLEANUP BLOB PREVIEW
  // ==========================================================

  useEffect(() => {
    return () => {
      if (
        preview &&
        preview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // ==========================================================
  // INPUT CHANGE
  // ==========================================================

  function handleChange(e) {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setError("");
    setSuccess("");
  }

  // ==========================================================
  // FILE UPLOAD
  // ==========================================================

  function handleFileUpload(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    handleSelectedFile(file);

    // Permet de sélectionner à nouveau
    // exactement le même fichier.
    e.target.value = "";
  }

  function handleSelectedFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      setError(
        "Format non supporté. Ajoutez une image ou une vidéo."
      );
      return;
    }

    if (
      preview &&
      preview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(preview);
    }

    const previewUrl =
      URL.createObjectURL(file);

    const isVideo =
      file.type.startsWith("video/");

    setMediaFile(file);
    setPreview(previewUrl);
    setMediaType(
      isVideo ? "video" : "image"
    );

    setForm((prev) => ({
      ...prev,
      image: "",
      video: "",
    }));

    setError("");
    setSuccess("");
  }

  function handleDrop(e) {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];

    if (file) {
      handleSelectedFile(file);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function removeMedia() {
    if (
      preview &&
      preview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(preview);
    }

    setMediaFile(null);
    setPreview("");
    setMediaType("image");

    setForm((prev) => ({
      ...prev,
      image: "",
      video: "",
    }));
  }

  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validateForm() {
    if (!form.title.trim()) {
      setError(
        "Le titre de la publicité est obligatoire."
      );
      return false;
    }

    if (!form.description.trim()) {
      setError(
        "La description de la publicité est obligatoire."
      );
      return false;
    }

    if (!mediaFile && !preview) {
      setError(
        "Ajoutez une image ou une vidéo à votre publicité."
      );
      return false;
    }

    if (!form.start_date) {
      setError(
        "Ajoutez une date de lancement."
      );
      return false;
    }

    if (
      !Number(form.duration_hours) ||
      Number(form.duration_hours) <= 0
    ) {
      setError(
        "La durée de diffusion doit être supérieure à 0 heure."
      );
      return false;
    }

    return true;
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) return;

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append(
        "title",
        form.title.trim()
      );

      formData.append(
        "description",
        form.description.trim()
      );

      formData.append(
        "link",
        form.link.trim()
      );

      formData.append(
        "advertiser",
        form.advertiser.trim()
      );

      formData.append(
        "contact",
        form.contact.trim()
      );

      formData.append(
        "category",
        form.category
      );

      formData.append(
        "status",
        form.status
      );

      formData.append(
        "priority",
        Number(form.priority)
      );

      formData.append(
        "duration_hours",
        Number(form.duration_hours)
      );

      formData.append(
        "start_date",
        form.start_date
      );

      formData.append(
        "end_date",
        form.end_date
      );

      formData.append(
        "is_sponsored",
        form.is_sponsored
      );

      formData.append(
        "comments_enabled",
        form.comments_enabled
      );

      if (mediaFile) {
        formData.append(
          "media",
          mediaFile
        );
      }

      if (ad?.id) {
        await updateAd(
          ad.id,
          formData
        );

        setSuccess(
          "Publicité mise à jour avec succès."
        );
      } else {
        await createAd(formData);

        setSuccess(
          "Publicité publiée avec succès."
        );
      }

      setTimeout(() => {
        onClose?.();
      }, 1200);

    } catch (err) {
      console.error(
        "❌ ADS SAVE ERROR:",
        err
      );

      setError(
        err?.response?.data?.message ||
        "Une erreur est survenue lors de la sauvegarde de la publicité."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // SELECTED CATEGORY
  // ==========================================================

  const selectedCategory =
    categories.find(
      (item) =>
        item.value === form.category
    ) || categories[0];

  // ==========================================================
  // MEDIA INFO
  // ==========================================================

  const mediaSize =
    mediaFile
      ? formatFileSize(mediaFile.size)
      : null;

  const mediaName =
    mediaFile?.name ||
    (mediaType === "video" ? "Vidéo existante" : "Image existante");

  
  // ============================================================
  // RENDER — WHITE PAPER / PROFESSIONAL FORM
  // ============================================================

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm">
      <div className="h-[100dvh] w-full flex items-center justify-center sm:p-4 lg:p-6">
        <div className="w-full max-w-[1500px] h-[100dvh] sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] bg-white sm:rounded-[26px] shadow-[0_30px_90px_rgba(15,23,42,.28)] overflow-hidden flex flex-col min-h-0">

          {/* HEADER */}
          <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-violet-200">
                  <span className="text-xl">📢</span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-slate-900 font-black text-lg sm:text-xl tracking-tight">
                      {ad ? "Modifier la publicité" : "Créer une publicité"}
                    </h1>
                    <span className="rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wide text-violet-700">
                      6BetBall Ads
                    </span>
                  </div>
                  <p className="hidden sm:block text-slate-500 text-xs mt-1">
                    {ad
                      ? "Modifiez et optimisez votre campagne publicitaire."
                      : "Créez une campagne publicitaire claire et professionnelle."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                aria-label="Fermer"
                className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-violet-700 hover:border-violet-300 hover:bg-violet-50 transition disabled:opacity-50 text-lg"
              >
                ✕
              </button>
            </div>

            {/* MOBILE STEP INDICATOR */}
            <div className="mt-4 flex xl:hidden items-center gap-2 overflow-x-auto pb-1">
              {[
                ["01", "Contenu"],
                ["02", "Média"],
                ["03", "Diffusion"],
                ["04", "Options"],
              ].map(([number, label]) => (
                <span
                  key={number}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 px-3 py-1.5 text-[11px] font-bold text-violet-700"
                >
                  <span>{number}</span>
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </header>

          {/* MAIN — une seule zone de défilement maîtrisée */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto overscroll-contain scroll-smooth [scrollbar-gutter:stable]">
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)]">

              {/* FORM */}
              <main className="min-w-0 p-4 sm:p-6 lg:p-8">
                {error && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 flex items-start gap-3">
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">!</span>
                    <div className="min-w-0">
                      <p className="text-red-800 text-sm font-extrabold">Impossible de continuer</p>
                      <p className="text-red-700 text-xs mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 flex items-start gap-3">
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">✓</span>
                    <div>
                      <p className="text-emerald-800 text-sm font-extrabold">Opération réussie</p>
                      <p className="text-emerald-700 text-xs mt-0.5">{success}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 pb-24">

                  <Section
                    number="01"
                    icon="✍️"
                    title="Informations générales"
                    description="Présentez votre campagne et son message."
                  >
                    <div className="space-y-5">
                      <Field label="Titre de la publicité" required hint={`${form.title.length}/120`}>
                        <input
                          type="text"
                          name="title"
                          value={form.title}
                          onChange={handleChange}
                          maxLength={120}
                          placeholder="Ex. Bonus Champions League"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Description" required hint={`${form.description.length}/1000`}>
                        <textarea
                          name="description"
                          rows={5}
                          maxLength={1000}
                          value={form.description}
                          onChange={handleChange}
                          placeholder="Présentez clairement votre offre, votre événement ou votre message..."
                          className={`${inputClass} min-h-[130px] py-3.5 resize-y`}
                        />
                      </Field>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Annonceur" hint="Optionnel">
                          <div className="relative">
                            <span className={fieldIcon}>🏢</span>
                            <input
                              type="text"
                              name="advertiser"
                              value={form.advertiser}
                              onChange={handleChange}
                              placeholder="Nom de l'entreprise"
                              className={`${inputClass} pl-11`}
                            />
                          </div>
                        </Field>

                        <Field label="Contact" hint="Optionnel">
                          <div className="relative">
                            <span className={fieldIcon}>📞</span>
                            <input
                              type="text"
                              name="contact"
                              value={form.contact}
                              onChange={handleChange}
                              placeholder="Téléphone ou email"
                              className={`${inputClass} pl-11`}
                            />
                          </div>
                        </Field>
                      </div>

                      <Field label="Lien de destination" hint="Optionnel">
                        <div className="relative">
                          <span className={fieldIcon}>🔗</span>
                          <input
                            type="url"
                            name="link"
                            value={form.link}
                            onChange={handleChange}
                            placeholder="https://exemple.com"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </Field>
                    </div>
                  </Section>

                  <Section
                    number="02"
                    icon="🖼️"
                    title="Média publicitaire"
                    description="Ajoutez le visuel qui sera présenté aux utilisateurs."
                  >
                    {!preview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="group cursor-pointer rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-b from-violet-50/70 to-blue-50/40 hover:border-violet-400 hover:bg-violet-50 transition-all p-5 sm:p-8 lg:p-10 text-center focus-within:ring-4 focus-within:ring-violet-500/10"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />

                        <div className="mx-auto w-16 h-16 rounded-2xl bg-white border border-violet-200 text-violet-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                          <span className="text-3xl">☁️</span>
                        </div>

                        <h3 className="mt-5 text-slate-900 font-extrabold text-base">
                          Importez votre média
                        </h3>
                        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
                          Glissez-déposez un fichier ici ou cliquez pour parcourir
                        </p>

                        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                          <MediaBadge text="JPG" />
                          <MediaBadge text="PNG" />
                          <MediaBadge text="WEBP" />
                          <MediaBadge text="MP4" />
                          <MediaBadge text="WEBM" />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                        <div className="relative min-h-[220px] max-h-[min(58vh,560px)] bg-slate-950 overflow-hidden flex items-center justify-center">
                          {mediaType === "video" ? (
                            <video
                              src={preview}
                              controls
                              preload="metadata"
                              className="w-full h-full max-h-[min(58vh,560px)] object-contain"
                            />
                          ) : (
                            <img
                              src={preview}
                              alt="Aperçu du fichier importé"
                              className="w-full h-full max-h-[min(58vh,560px)] object-contain"
                            />
                          )}

                          <div className="absolute top-3 left-3 rounded-lg bg-slate-950/80 text-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide backdrop-blur">
                            {mediaType === "video" ? "Vidéo" : "Image"}
                          </div>

                          {mediaFile && (
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                              <span className="min-w-0 max-w-[72%] truncate rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur">
                                {mediaFile.name}
                              </span>
                              <span className="shrink-0 rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur">
                                {mediaSize}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-slate-900 text-sm font-bold truncate">
                                {mediaName}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                <span>{mediaType === "video" ? "Vidéo" : "Image"}</span>
                                {mediaSize && <span>• {mediaSize}</span>}
                                {mediaFile?.type && (
                                  <span className="uppercase">
                                    • {mediaFile.type.split("/")[1]}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 text-xs font-extrabold transition"
                              >
                                Remplacer
                              </button>
                              <button
                                type="button"
                                onClick={removeMedia}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-extrabold transition"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </Section>

                  <Section
                    number="03"
                    icon="📍"
                    title="Placement & diffusion"
                    description="Définissez où et comment la publicité sera affichée."
                  >
                    <div className="space-y-5">
                      <Field label="Emplacement" required>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {categories.map((category) => {
                            const active = form.category === category.value;

                            return (
                              <button
                                key={category.value}
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    category: category.value,
                                  }))
                                }
                                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                                  active
                                    ? "border-violet-500 bg-violet-50 shadow-sm shadow-violet-100"
                                    : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                                    active ? "bg-violet-600 text-white" : "bg-slate-100 text-violet-600"
                                  }`}>
                                    <span>{category.icon}</span>
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-slate-900 text-sm font-extrabold">
                                      {category.label}
                                    </p>
                                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                      {category.description}
                                    </p>
                                  </div>

                                  {active && (
                                    <span className="text-violet-600 font-black">✓</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </Field>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Date de lancement" required>
                          <input
                            type="datetime-local"
                            name="start_date"
                            value={form.start_date}
                            onChange={handleChange}
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Durée de diffusion" required>
                          <div className="relative">
                            <input
                              type="number"
                              name="duration_hours"
                              min="1"
                              max="8760"
                              value={form.duration_hours}
                              onChange={handleChange}
                              className={`${inputClass} pr-20`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                              heures
                            </span>
                          </div>
                        </Field>
                      </div>

                      <Field label="Date de fin" hint="Calculée automatiquement">
                        <input
                          type="datetime-local"
                          name="end_date"
                          value={form.end_date}
                          readOnly
                          className={`${inputClass} bg-slate-50 text-violet-700 font-bold cursor-not-allowed`}
                        />
                      </Field>

                      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          🕐
                        </div>
                        <div>
                          <p className="text-blue-800 text-sm font-extrabold">
                            Planification automatique
                          </p>
                          <p className="text-blue-700/70 text-xs mt-0.5 leading-relaxed">
                            La date de fin est recalculée automatiquement selon la date de lancement et la durée.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section
                    number="04"
                    icon="⚙️"
                    title="Options de campagne"
                    description="Contrôlez le comportement et la visibilité de votre publicité."
                  >
                    <div className="space-y-3">
                      <Toggle
                        label="Publication sponsorisée"
                        description="Identifie cette publicité comme contenu sponsorisé."
                        checked={form.is_sponsored}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, is_sponsored: value }))
                        }
                        icon="💎"
                      />

                      <Toggle
                        label="Commentaires activés"
                        description="Autorise les utilisateurs à commenter la publication."
                        checked={form.comments_enabled}
                        onChange={(value) =>
                          setForm((prev) => ({ ...prev, comments_enabled: value }))
                        }
                        icon="💬"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                      <Field label="Priorité" hint="1 = standard">
                        <div className="relative">
                          <span className={fieldIcon}>⭐</span>
                          <input
                            type="number"
                            name="priority"
                            min="1"
                            max="100"
                            value={form.priority}
                            onChange={handleChange}
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </Field>

                      <Field label="Statut">
                        <select
                          name="status"
                          value={form.status}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          <option value="active">Active — visible</option>
                          <option value="inactive">Inactive — masquée</option>
                        </select>
                      </Field>
                    </div>
                  </Section>

                  {/* ACTIONS */}
                  <div className="sticky bottom-0 z-30 pt-5 pb-2 -mx-1 px-1 bg-gradient-to-t from-white via-white to-transparent">

                    <div className="p-3 sm:p-4 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-8px_25px_rgba(15,23,42,.08)] flex flex-col-reverse sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-full sm:w-40 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-extrabold text-sm transition disabled:opacity-50"
                      >
                        Annuler
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-black text-sm shadow-lg shadow-violet-200 transition active:scale-[.99] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Spinner />
                            Enregistrement...
                          </span>
                        ) : (
                          <span>{ad ? "💾 Enregistrer les modifications" : "🚀 Publier la publicité"}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </main>

              {/* PREVIEW */}
              <aside className="min-w-0 bg-slate-50 border-t xl:border-t-0 xl:border-l border-slate-200 p-4 sm:p-6 lg:p-8">
                <div className="xl:sticky xl:top-6">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-violet-600">👀</span>
                        <h2 className="text-slate-900 font-black text-lg">Aperçu en direct</h2>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        Visualisez votre publicité comme une véritable publication.
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                      Live
                    </span>
                  </div>

                  {/* PUBLICATION CARD */}
                  <div className="rounded-[24px] overflow-hidden border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,.10)]">
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-black shadow-md">
                            6B
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-slate-900 text-sm font-extrabold truncate">
                                {form.advertiser || "6BetBall Ads"}
                              </h3>
                              <span className="text-blue-600 text-xs">✓</span>
                            </div>
                            <p className="text-slate-500 text-xs mt-0.5">Sponsorisé</p>
                          </div>
                        </div>

                        <span className="text-slate-400 text-lg">•••</span>
                      </div>

                      <h3 className="mt-5 text-slate-950 text-xl sm:text-2xl font-black leading-tight">
                        {form.title || "Titre de votre publicité"}
                      </h3>

                      <p className="mt-3 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                        {form.description ||
                          "La description de votre publicité apparaîtra ici. Présentez votre offre de manière claire et attractive."}
                      </p>
                    </div>

                    {preview ? (
                      <div className="relative bg-slate-100 aspect-[4/3]">
                        {mediaType === "video" ? (
                          <video src={preview} controls className="w-full h-full object-contain" />
                        ) : (
                          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gradient-to-br from-violet-50 to-blue-50 flex flex-col items-center justify-center border-y border-slate-100">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-violet-100 text-violet-500 flex items-center justify-center shadow-sm">
                          🖼️
                        </div>
                        <p className="text-slate-500 text-sm mt-3">
                          Aucun média sélectionné
                        </p>
                      </div>
                    )}

                    {form.link && (
                      <div className="px-5 pt-4">
                        <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-violet-700 text-xs font-black">En savoir plus</p>
                            <p className="text-slate-500 text-[11px] truncate mt-0.5">{form.link}</p>
                          </div>
                          <span className="text-violet-600 shrink-0">→</span>
                        </div>
                      </div>
                    )}

                    <div className="p-5 mt-1">
                      <div className="grid grid-cols-3 gap-2">
                        <PreviewButton icon="♡" label="J'aime" />
                        <PreviewButton icon="💬" label="Commenter" disabled={!form.comments_enabled} />
                        <PreviewButton icon="↗" label="Partager" />
                      </div>
                    </div>
                  </div>

                  {/* SUMMARY */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <SummaryCard icon={selectedCategory.icon} label="Placement" value={selectedCategory.label} />
                    <SummaryCard
                      icon="⚡"
                      label="Statut"
                      value={form.status === "active" ? "Active" : "Inactive"}
                    />
                    <SummaryCard icon="⏱️" label="Durée" value={`${form.duration_hours || 0} h`} />
                    <SummaryCard icon="⭐" label="Priorité" value={form.priority || 1} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-violet-100 bg-white p-4">
                    <p className="text-violet-700 text-xs font-black uppercase tracking-wide">Conseil de lisibilité</p>
                    <p className="text-slate-500 text-xs leading-relaxed mt-1">
                      Gardez un titre court, une description claire et un visuel de bonne qualité pour une publication facilement lisible sur mobile.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

  // ============================================================
  // SECTION
  // ============================================================

function Section({
  number,
  icon,
  title,
  description,
  children,
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,.045)] overflow-hidden">
      <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 border border-violet-100 text-violet-700 flex items-center justify-center">
          <span>{icon}</span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-violet-600 tracking-widest">{number}</span>
            <h2 className="text-slate-900 font-black text-sm sm:text-base">{title}</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

  // ============================================================
  // FIELD
  // ============================================================

function Field({
  label: fieldLabel,
  required = false,
  hint = "",
  children,
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="text-slate-700 text-xs sm:text-sm font-extrabold">
          {fieldLabel}
          {required && <span className="text-violet-600 ml-1">*</span>}
        </label>

        {hint && (
          <span className="text-slate-400 text-[10px] font-semibold">
            {hint}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

  // ============================================================
  // TOGGLE
  // ============================================================

function Toggle({
  label: toggleLabel,
  description,
  checked,
  onChange,
  icon,
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full text-left flex items-center justify-between gap-4 p-4 rounded-2xl border-2 transition-all ${
        checked
          ? "bg-violet-50 border-violet-200"
          : "bg-white border-slate-200 hover:border-violet-200 hover:bg-violet-50/30"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
          checked ? "bg-violet-600 text-white" : "bg-slate-100 text-violet-600"
        }`}>
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-slate-900 text-sm font-extrabold">{toggleLabel}</p>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${
        checked ? "bg-violet-600" : "bg-slate-300"
      }`}>
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`} />
      </div>
    </button>
  );
}

  // ============================================================
  // MEDIA BADGE
  // ============================================================

function MediaBadge({ text }) {
  return (
    <span className="px-2.5 py-1 rounded-lg bg-white border border-violet-100 text-violet-700 text-[9px] font-extrabold">
      {text}
    </span>
  );
}

  // ============================================================
  // PREVIEW BUTTON
  // ============================================================

function PreviewButton({
  icon,
  label,
  disabled = false,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`py-3 rounded-xl text-xs font-bold transition border ${
        disabled
          ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
          : "bg-white border-slate-200 hover:border-violet-200 hover:bg-violet-50 text-slate-600 hover:text-violet-700"
      }`}
    >
      <span className="mr-1.5">{icon}</span>
      {label}
    </button>
  );
}

  // ============================================================
  // SUMMARY CARD
  // ============================================================

function SummaryCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-violet-600 text-[10px] font-black uppercase tracking-wide">{label}</span>
      </div>

      <p className="mt-2 text-slate-900 text-xs sm:text-sm font-extrabold truncate">
        {value}
      </p>
    </div>
  );
}

  // ============================================================
  // SPINNER
  // ============================================================

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
  );
}

  // ============================================================
  // HELPERS
  // ============================================================

function formatDateTimeLocal(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toDateTimeLocal(date);
}

function toDateTimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") +
    "T" +
    [
      pad(date.getHours()),
      pad(date.getMinutes()),
    ].join(":");
}

function formatFileSize(bytes) {
  if (!bytes) return "0 Ko";

  const units = ["octets", "Ko", "Mo", "Go"];

  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

// ============================================================
// SHARED CLASSES
// ============================================================

const inputClass = `
  w-full
  min-h-12
  bg-white
  border-2
  border-slate-200
  hover:border-violet-200
  focus:border-violet-500
  focus:ring-4
  focus:ring-violet-500/10
  rounded-xl
  px-4
  py-2.5
  text-sm
  text-slate-900
  font-medium
  placeholder:text-slate-400
  outline-none
  transition-all
`;

const fieldIcon = `
  absolute
  left-4
  top-1/2
  -translate-y-1/2
  text-sm
  pointer-events-none
`;
