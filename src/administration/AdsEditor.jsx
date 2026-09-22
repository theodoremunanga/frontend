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

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4">

      <div className="
        w-full
        h-full
        sm:h-[96vh]
        max-w-[1500px]
        bg-[#080D19]
        sm:rounded-[28px]
        border
        border-white/[0.08]
        shadow-[0_30px_100px_rgba(0,0,0,0.65)]
        overflow-hidden
        flex
        flex-col
      ">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="
          shrink-0
          h-[76px]
          px-4
          sm:px-7
          flex
          items-center
          justify-between
          border-b
          border-white/[0.07]
          bg-[#0B1120]
        ">

          <div className="flex items-center gap-4 min-w-0">

            <div className="
              w-11
              h-11
              shrink-0
              rounded-2xl
              bg-gradient-to-br
              from-blue-500
              via-cyan-500
              to-indigo-600
              flex
              items-center
              justify-center
              shadow-lg
              shadow-blue-500/20
            ">
              <span className="text-xl">
                📢
              </span>
            </div>

            <div className="min-w-0">

              <div className="flex items-center gap-2 flex-wrap">

                <h1 className="
                  text-white
                  font-black
                  text-lg
                  sm:text-xl
                  tracking-tight
                ">
                  {ad
                    ? "Modifier la publicité"
                    : "Créer une publicité"}
                </h1>

                <span className="
                  px-2.5
                  py-1
                  rounded-full
                  bg-blue-500/10
                  border
                  border-blue-400/20
                  text-blue-300
                  text-[10px]
                  sm:text-xs
                  font-bold
                  uppercase
                  tracking-wider
                ">
                  6BetBall Ads
                </span>

              </div>

              <p className="
                hidden
                sm:block
                text-slate-500
                text-xs
                mt-1
              ">
                {ad
                  ? "Modifiez et optimisez votre campagne publicitaire."
                  : "Créez une campagne publicitaire professionnelle."}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              w-10
              h-10
              sm:w-11
              sm:h-11
              shrink-0
              rounded-xl
              bg-white/[0.05]
              hover:bg-red-500/15
              border
              border-white/[0.08]
              hover:border-red-400/30
              text-slate-400
              hover:text-red-300
              transition-all
              flex
              items-center
              justify-center
              text-lg
            "
            aria-label="Fermer"
          >
            ✕
          </button>

        </header>

        {/* ==================================================
            MAIN
        ================================================== */}

        <div className="
          flex-1
          min-h-0
          overflow-y-auto
        ">

          <div className="
            grid
            grid-cols-1
            xl:grid-cols-[minmax(0,1.1fr)_minmax(400px,0.9fr)]
            min-h-full
          ">

            {/* =================================================
                LEFT — FORM
            ================================================= */}

            <main className="
              p-4
              sm:p-6
              lg:p-8
              xl:border-r
              border-white/[0.07]
            ">

              {/* ALERTS */}

              {error && (
                <div className="
                  mb-5
                  rounded-2xl
                  border
                  border-red-400/20
                  bg-red-500/[0.08]
                  px-4
                  py-3.5
                  flex
                  items-start
                  gap-3
                ">
                  <span className="text-red-400">
                    ⚠️
                  </span>

                  <div className="min-w-0">
                    <p className="
                      text-red-200
                      text-sm
                      font-semibold
                    ">
                      Impossible de continuer
                    </p>

                    <p className="
                      text-red-300/80
                      text-xs
                      mt-0.5
                    ">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {success && (
                <div className="
                  mb-5
                  rounded-2xl
                  border
                  border-emerald-400/20
                  bg-emerald-500/[0.08]
                  px-4
                  py-3.5
                  flex
                  items-start
                  gap-3
                ">
                  <span className="text-emerald-400">
                    ✓
                  </span>

                  <div>
                    <p className="
                      text-emerald-200
                      text-sm
                      font-semibold
                    ">
                      Opération réussie
                    </p>

                    <p className="
                      text-emerald-300/80
                      text-xs
                      mt-0.5
                    ">
                      {success}
                    </p>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* =================================================
                    SECTION 1 — INFORMATIONS
                ================================================= */}

                <Section
                  number="01"
                  icon="✍️"
                  title="Informations générales"
                  description="Présentez votre campagne et son message."
                >

                  <div className="space-y-5">

                    <Field
                      label="Titre de la publicité"
                      required
                      hint={`${form.title.length}/120`}
                    >
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

                    <Field
                      label="Description"
                      required
                      hint={`${form.description.length}/1000`}
                    >
                      <textarea
                        name="description"
                        rows={5}
                        maxLength={1000}
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Présentez clairement votre offre, votre événement ou votre message..."
                        className={`${inputClass} resize-none`}
                      />
                    </Field>

                    <div className="
                      grid
                      grid-cols-1
                      md:grid-cols-2
                      gap-4
                    ">

                      <Field
                        label="Annonceur"
                        hint="Optionnel"
                      >
                        <div className="relative">
                          <span className={fieldIcon}>
                            🏢
                          </span>

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

                      <Field
                        label="Contact"
                        hint="Optionnel"
                      >
                        <div className="relative">
                          <span className={fieldIcon}>
                            📞
                          </span>

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

                    <Field
                      label="Lien de destination"
                      hint="Optionnel"
                    >
                      <div className="relative">
                        <span className={fieldIcon}>
                          🔗
                        </span>

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

                {/* =================================================
                    SECTION 2 — MEDIA
                ================================================= */}

                <Section
                  number="02"
                  icon="🎨"
                  title="Média publicitaire"
                  description="Ajoutez le visuel qui sera présenté aux utilisateurs."
                >

                  {!preview ? (

                    <div
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className="
                        group
                        cursor-pointer
                        rounded-3xl
                        border-2
                        border-dashed
                        border-slate-700
                        hover:border-blue-500/60
                        bg-[#0B1220]
                        hover:bg-blue-500/[0.03]
                        transition-all
                        p-8
                        sm:p-10
                        text-center
                      "
                    >

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <div className="
                        mx-auto
                        w-16
                        h-16
                        rounded-2xl
                        bg-blue-500/10
                        border
                        border-blue-400/10
                        flex
                        items-center
                        justify-center
                        group-hover:scale-105
                        transition-transform
                      ">
                        <span className="text-3xl">
                          ☁️
                        </span>
                      </div>

                      <h3 className="
                        mt-5
                        text-white
                        font-bold
                        text-base
                      ">
                        Importez votre média
                      </h3>

                      <p className="
                        mt-2
                        text-slate-500
                        text-sm
                      ">
                        Glissez-déposez un fichier ici
                        <br />
                        ou cliquez pour parcourir
                      </p>

                      <div className="
                        mt-5
                        flex
                        items-center
                        justify-center
                        gap-2
                        flex-wrap
                      ">
                        <MediaBadge text="JPG" />
                        <MediaBadge text="PNG" />
                        <MediaBadge text="WEBP" />
                        <MediaBadge text="MP4" />
                        <MediaBadge text="WEBM" />
                      </div>

                    </div>

                  ) : (

                    <div className="
                      rounded-3xl
                      overflow-hidden
                      border
                      border-white/[0.08]
                      bg-[#080D18]
                    ">

                      <div className="
                        relative
                        aspect-video
                        bg-black
                        overflow-hidden
                      ">

                        {mediaType === "video" ? (
                          <video
                            src={preview}
                            controls
                            className="
                              w-full
                              h-full
                              object-contain
                            "
                          />
                        ) : (
                          <img
                            src={preview}
                            alt="Aperçu publicité"
                            className="
                              w-full
                              h-full
                              object-contain
                            "
                          />
                        )}

                        <div className="
                          absolute
                          top-3
                          left-3
                          px-2.5
                          py-1
                          rounded-lg
                          bg-black/60
                          backdrop-blur
                          border
                          border-white/10
                          text-white
                          text-[10px]
                          font-bold
                          uppercase
                        ">
                          {mediaType === "video"
                            ? "Vidéo"
                            : "Image"}
                        </div>

                      </div>

                      <div className="
                        p-4
                        flex
                        flex-col
                        sm:flex-row
                        sm:items-center
                        justify-between
                        gap-3
                      ">

                        <div className="min-w-0">

                          <p className="
                            text-white
                            text-sm
                            font-semibold
                            truncate
                          ">
                            {mediaFile?.name ||
                              "Média existant"}
                          </p>

                          <p className="
                            text-slate-500
                            text-xs
                            mt-1
                          ">
                            {mediaFile
                              ? `${mediaType === "video" ? "Vidéo" : "Image"} • ${mediaSize}`
                              : "Média actuellement utilisé"}
                          </p>

                        </div>

                        <div className="
                          flex
                          gap-2
                          shrink-0
                        ">

                          <button
                            type="button"
                            onClick={() =>
                              fileInputRef.current?.click()
                            }
                            className="
                              px-4
                              py-2.5
                              rounded-xl
                              bg-blue-500/10
                              hover:bg-blue-500/20
                              border
                              border-blue-400/20
                              text-blue-300
                              text-xs
                              font-bold
                              transition
                            "
                          >
                            Remplacer
                          </button>

                          <button
                            type="button"
                            onClick={removeMedia}
                            className="
                              px-4
                              py-2.5
                              rounded-xl
                              bg-red-500/10
                              hover:bg-red-500/20
                              border
                              border-red-400/20
                              text-red-300
                              text-xs
                              font-bold
                              transition
                            "
                          >
                            Supprimer
                          </button>

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

                {/* =================================================
                    SECTION 3 — DIFFUSION
                ================================================= */}

                <Section
                  number="03"
                  icon="📍"
                  title="Placement & diffusion"
                  description="Définissez où et comment la publicité sera affichée."
                >

                  <div className="space-y-5">

                    <Field
                      label="Emplacement"
                      required
                    >

                      <div className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-3
                      ">

                        {categories.map((category) => (
                          <button
                            key={category.value}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                category:
                                  category.value,
                              }))
                            }
                            className={`
                              text-left
                              p-4
                              rounded-2xl
                              border
                              transition-all
                              ${
                                form.category ===
                                category.value
                                  ? "border-blue-500/60 bg-blue-500/[0.08] shadow-lg shadow-blue-500/5"
                                  : "border-white/[0.07] bg-[#0B1220] hover:border-white/[0.14] hover:bg-white/[0.025]"
                              }
                            `}
                          >

                            <div className="
                              flex
                              items-start
                              gap-3
                            ">

                              <div className={`
                                w-10
                                h-10
                                shrink-0
                                rounded-xl
                                flex
                                items-center
                                justify-center
                                ${
                                  form.category ===
                                  category.value
                                    ? "bg-blue-500/15"
                                    : "bg-white/[0.04]"
                                }
                              `}>
                                <span>
                                  {category.icon}
                                </span>
                              </div>

                              <div className="min-w-0">

                                <p className="
                                  text-white
                                  text-sm
                                  font-bold
                                ">
                                  {category.label}
                                </p>

                                <p className="
                                  text-slate-500
                                  text-xs
                                  mt-1
                                  leading-relaxed
                                ">
                                  {category.description}
                                </p>

                              </div>

                              {form.category ===
                                category.value && (
                                <span className="
                                  ml-auto
                                  text-blue-400
                                ">
                                  ✓
                                </span>
                              )}

                            </div>

                          </button>
                        ))}

                      </div>

                    </Field>

                    <div className="
                      grid
                      grid-cols-1
                      md:grid-cols-2
                      gap-4
                    ">

                      <Field
                        label="Date de lancement"
                        required
                      >
                        <input
                          type="datetime-local"
                          name="start_date"
                          value={form.start_date}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </Field>

                      <Field
                        label="Durée de diffusion"
                        required
                      >
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

                          <span className="
                            absolute
                            right-4
                            top-1/2
                            -translate-y-1/2
                            text-slate-500
                            text-sm
                            pointer-events-none
                          ">
                            heures
                          </span>
                        </div>
                      </Field>

                    </div>

                    <Field
                      label="Date de fin"
                      hint="Calculée automatiquement"
                    >
                      <input
                        type="datetime-local"
                        name="end_date"
                        value={form.end_date}
                        readOnly
                        className={`${inputClass} opacity-70 cursor-not-allowed`}
                      />
                    </Field>

                    <div className="
                      flex
                      items-center
                      gap-3
                      rounded-2xl
                      border
                      border-blue-400/10
                      bg-blue-500/[0.04]
                      p-4
                    ">

                      <div className="
                        w-10
                        h-10
                        rounded-xl
                        bg-blue-500/10
                        flex
                        items-center
                        justify-center
                        shrink-0
                      ">
                        🕐
                      </div>

                      <div>
                        <p className="
                          text-blue-200
                          text-sm
                          font-semibold
                        ">
                          Planification automatique
                        </p>

                        <p className="
                          text-slate-500
                          text-xs
                          mt-0.5
                        ">
                          La date de fin est recalculée
                          automatiquement selon la durée.
                        </p>
                      </div>

                    </div>

                  </div>

                </Section>

                {/* =================================================
                    SECTION 4 — OPTIONS
                ================================================= */}

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
                        setForm((prev) => ({
                          ...prev,
                          is_sponsored: value,
                        }))
                      }
                      icon="💎"
                    />

                    <Toggle
                      label="Commentaires activés"
                      description="Autorise les utilisateurs à commenter la publication."
                      checked={form.comments_enabled}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          comments_enabled: value,
                        }))
                      }
                      icon="💬"
                    />

                  </div>

                  <div className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    gap-4
                    mt-5
                  ">

                    <Field
                      label="Priorité"
                      hint="1 = standard"
                    >
                      <div className="relative">

                        <span className={fieldIcon}>
                          ⭐
                        </span>

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
                        <option value="active">
                          Active — visible
                        </option>

                        <option value="inactive">
                          Inactive — masquée
                        </option>
                      </select>
                    </Field>

                  </div>

                </Section>

                {/* =================================================
                    ACTIONS
                ================================================= */}

                <div className="
                  sticky
                  bottom-0
                  z-30
                  pt-5
                  pb-2
                  bg-gradient-to-t
                  from-[#080D19]
                  via-[#080D19]
                  to-transparent
                ">

                  <div className="
                    p-3
                    sm:p-4
                    rounded-2xl
                    border
                    border-white/[0.08]
                    bg-[#0B1120]/95
                    backdrop-blur-xl
                    flex
                    flex-col-reverse
                    sm:flex-row
                    gap-3
                  ">

                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="
                        sm:w-40
                        h-12
                        rounded-xl
                        border
                        border-white/[0.08]
                        bg-white/[0.04]
                        hover:bg-white/[0.07]
                        text-slate-300
                        hover:text-white
                        font-bold
                        text-sm
                        transition
                        disabled:opacity-50
                      "
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="
                        flex-1
                        h-12
                        rounded-xl
                        bg-gradient-to-r
                        from-blue-600
                        via-blue-500
                        to-cyan-500
                        hover:from-blue-500
                        hover:to-cyan-400
                        text-white
                        font-black
                        text-sm
                        shadow-lg
                        shadow-blue-500/20
                        transition-all
                        active:scale-[0.99]
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                      "
                    >

                      {loading ? (
                        <span className="
                          flex
                          items-center
                          justify-center
                          gap-2
                        ">
                          <Spinner />
                          Enregistrement...
                        </span>
                      ) : (
                        <span>
                          {ad
                            ? "💾 Enregistrer les modifications"
                            : "🚀 Publier la publicité"}
                        </span>
                      )}

                    </button>

                  </div>

                </div>

              </form>

            </main>

            {/* =================================================
                RIGHT — PREVIEW
            ================================================= */}

            <aside className="
              bg-[#060B15]
              p-4
              sm:p-6
              lg:p-8
              xl:sticky
              xl:top-0
              xl:h-full
            ">

              <div className="
                h-full
                flex
                flex-col
              ">

                <div className="
                  flex
                  items-start
                  justify-between
                  mb-5
                ">

                  <div>

                    <div className="
                      flex
                      items-center
                      gap-2
                    ">
                      <span className="text-lg">
                        👀
                      </span>

                      <h2 className="
                        text-white
                        font-black
                        text-lg
                      ">
                        Aperçu en direct
                      </h2>
                    </div>

                    <p className="
                      text-slate-500
                      text-xs
                      mt-1
                    ">
                      Visualisez votre publicité avant publication.
                    </p>

                  </div>

                  <span className="
                    px-2.5
                    py-1.5
                    rounded-lg
                    bg-emerald-500/10
                    border
                    border-emerald-400/10
                    text-emerald-400
                    text-[10px]
                    font-bold
                    uppercase
                  ">
                    Live Preview
                  </span>

                </div>

                {/* SOCIAL CARD */}

                <div className="
                  rounded-[26px]
                  overflow-hidden
                  border
                  border-white/[0.08]
                  bg-[#0B1120]
                  shadow-2xl
                ">

                  {/* PROFILE */}

                  <div className="p-5">

                    <div className="
                      flex
                      items-center
                      justify-between
                    ">

                      <div className="
                        flex
                        items-center
                        gap-3
                      ">

                        <div className="
                          w-11
                          h-11
                          rounded-full
                          bg-gradient-to-br
                          from-blue-500
                          to-cyan-400
                          flex
                          items-center
                          justify-center
                          text-white
                          font-black
                          shadow-lg
                          shadow-blue-500/20
                        ">
                          6B
                        </div>

                        <div>

                          <div className="
                            flex
                            items-center
                            gap-1.5
                          ">

                            <h3 className="
                              text-white
                              text-sm
                              font-bold
                            ">
                              {form.advertiser ||
                                "6BetBall Ads"}
                            </h3>

                            <span className="
                              text-blue-400
                              text-xs
                            ">
                              ✓
                            </span>

                          </div>

                          <p className="
                            text-slate-500
                            text-xs
                            mt-0.5
                          ">
                            Sponsorisé
                          </p>

                        </div>

                      </div>

                      <button
                        type="button"
                        className="
                          text-slate-500
                          text-lg
                        "
                      >
                        •••
                      </button>

                    </div>

                    {/* TITLE */}

                    <h3 className="
                      mt-5
                      text-white
                      text-xl
                      sm:text-2xl
                      font-black
                      leading-tight
                    ">
                      {form.title ||
                        "Titre de votre publicité"}
                    </h3>

                    {/* DESCRIPTION */}

                    <p className="
                      mt-3
                      text-slate-300
                      text-sm
                      leading-relaxed
                      whitespace-pre-wrap
                    ">
                      {form.description ||
                        "La description de votre publicité apparaîtra ici. Présentez votre offre de manière claire et attractive."}
                    </p>

                  </div>

                  {/* MEDIA */}

                  {preview ? (

                    <div className="
                      relative
                      bg-black
                      aspect-[4/3]
                    ">

                      {mediaType === "video" ? (
                        <video
                          src={preview}
                          controls
                          className="
                            w-full
                            h-full
                            object-contain
                          "
                        />
                      ) : (
                        <img
                          src={preview}
                          alt="Preview"
                          className="
                            w-full
                            h-full
                            object-cover
                          "
                        />
                      )}

                    </div>

                  ) : (

                    <div className="
                      aspect-[4/3]
                      bg-gradient-to-br
                      from-[#111827]
                      to-[#0B1120]
                      flex
                      flex-col
                      items-center
                      justify-center
                      border-y
                      border-white/[0.05]
                    ">

                      <div className="
                        w-16
                        h-16
                        rounded-2xl
                        bg-white/[0.04]
                        flex
                        items-center
                        justify-center
                      ">
                        🖼️
                      </div>

                      <p className="
                        text-slate-500
                        text-sm
                        mt-3
                      ">
                        Aucun média sélectionné
                      </p>

                    </div>

                  )}

                  {/* CTA */}

                  {form.link && (
                    <div className="
                      px-5
                      pt-4
                    ">

                      <div className="
                        rounded-xl
                        bg-blue-500/10
                        border
                        border-blue-400/10
                        px-4
                        py-3
                        flex
                        items-center
                        justify-between
                        gap-3
                      ">

                        <div className="min-w-0">

                          <p className="
                            text-blue-300
                            text-xs
                            font-bold
                          ">
                            En savoir plus
                          </p>

                          <p className="
                            text-slate-500
                            text-[11px]
                            truncate
                            mt-0.5
                          ">
                            {form.link}
                          </p>

                        </div>

                        <span className="
                          text-blue-400
                          shrink-0
                        ">
                          →
                        </span>

                      </div>

                    </div>
                  )}

                  {/* SOCIAL ACTIONS */}

                  <div className="
                    p-5
                    mt-1
                  ">

                    <div className="
                      grid
                      grid-cols-3
                      gap-2
                    ">

                      <PreviewButton
                        icon="♡"
                        label="J'aime"
                      />

                      <PreviewButton
                        icon="💬"
                        label="Commenter"
                        disabled={!form.comments_enabled}
                      />

                      <PreviewButton
                        icon="↗"
                        label="Partager"
                      />

                    </div>

                  </div>

                </div>

                {/* CAMPAIGN SUMMARY */}

                <div className="
                  mt-4
                  grid
                  grid-cols-2
                  gap-3
                ">

                  <SummaryCard
                    icon={selectedCategory.icon}
                    label="Placement"
                    value={selectedCategory.label}
                  />

                  <SummaryCard
                    icon="⚡"
                    label="Statut"
                    value={
                      form.status === "active"
                        ? "Active"
                        : "Inactive"
                    }
                  />

                  <SummaryCard
                    icon="⏱️"
                    label="Durée"
                    value={`${form.duration_hours || 0} h`}
                  />

                  <SummaryCard
                    icon="⭐"
                    label="Priorité"
                    value={form.priority || 1}
                  />

                </div>

              </div>

            </aside>

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
    <section className="
      rounded-3xl
      border
      border-white/[0.07]
      bg-[#0B1120]
      overflow-hidden
    ">

      <div className="
        px-5
        sm:px-6
        py-5
        border-b
        border-white/[0.06]
        flex
        items-start
        gap-3
      ">

        <div className="
          w-10
          h-10
          shrink-0
          rounded-xl
          bg-blue-500/10
          border
          border-blue-400/10
          flex
          items-center
          justify-center
        ">
          <span>{icon}</span>
        </div>

        <div className="min-w-0">

          <div className="
            flex
            items-center
            gap-2
          ">

            <span className="
              text-[10px]
              font-black
              text-blue-400
              tracking-widest
            ">
              {number}
            </span>

            <h2 className="
              text-white
              font-black
              text-sm
              sm:text-base
            ">
              {title}
            </h2>

          </div>

          <p className="
            text-slate-500
            text-xs
            mt-1
            leading-relaxed
          ">
            {description}
          </p>

        </div>

      </div>

      <div className="
        p-5
        sm:p-6
      ">
        {children}
      </div>

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

      <div className="
        flex
        items-center
        justify-between
        gap-3
        mb-2
      ">

        <label className="
          text-slate-300
          text-xs
          sm:text-sm
          font-bold
        ">
          {fieldLabel}

          {required && (
            <span className="
              text-blue-400
              ml-1
            ">
              *
            </span>
          )}
        </label>

        {hint && (
          <span className="
            text-slate-600
            text-[10px]
            font-medium
          ">
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
      onClick={() =>
        onChange(!checked)
      }
      className={`
        w-full
        text-left
        flex
        items-center
        justify-between
        gap-4
        p-4
        rounded-2xl
        border
        transition-all
        ${
          checked
            ? "bg-blue-500/[0.06] border-blue-400/20"
            : "bg-[#0B1220] border-white/[0.07]"
        }
      `}
    >

      <div className="
        flex
        items-center
        gap-3
        min-w-0
      ">

        <div className="
          w-10
          h-10
          shrink-0
          rounded-xl
          bg-white/[0.04]
          flex
          items-center
          justify-center
        ">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="
            text-white
            text-sm
            font-bold
          ">
            {toggleLabel}
          </p>

          <p className="
            text-slate-500
            text-xs
            mt-1
            leading-relaxed
          ">
            {description}
          </p>

        </div>

      </div>

      <div
        className={`
          relative
          w-11
          h-6
          rounded-full
          shrink-0
          transition-colors
          ${
            checked
              ? "bg-blue-500"
              : "bg-slate-700"
          }
        `}
      >

        <span
          className={`
            absolute
            top-1
            w-4
            h-4
            rounded-full
            bg-white
            shadow
            transition-transform
            ${
              checked
                ? "translate-x-6"
                : "translate-x-1"
            }
          `}
        />

      </div>

    </button>
  );
}

// ============================================================
// MEDIA BADGE
// ============================================================

function MediaBadge({ text }) {
  return (
    <span className="
      px-2.5
      py-1
      rounded-lg
      bg-white/[0.04]
      border
      border-white/[0.06]
      text-slate-500
      text-[9px]
      font-bold
    ">
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
      className={`
        py-3
        rounded-xl
        text-xs
        font-semibold
        transition
        ${
          disabled
            ? "bg-white/[0.02] text-slate-700 cursor-not-allowed"
            : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white"
        }
      `}
    >
      <span className="mr-1.5">
        {icon}
      </span>

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
    <div className="
      rounded-2xl
      border
      border-white/[0.06]
      bg-[#0B1120]
      p-3.5
    ">

      <div className="
        flex
        items-center
        gap-2
      ">

        <span className="text-sm">
          {icon}
        </span>

        <span className="
          text-slate-600
          text-[10px]
          font-bold
          uppercase
          tracking-wide
        ">
          {label}
        </span>

      </div>

      <p className="
        mt-2
        text-white
        text-xs
        sm:text-sm
        font-bold
        truncate
      ">
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
    <span className="
      inline-block
      w-4
      h-4
      border-2
      border-white/30
      border-t-white
      rounded-full
      animate-spin
    " />
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
  const pad = (value) =>
    String(value).padStart(2, "0");

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

  const units = [
    "octets",
    "Ko",
    "Mo",
    "Go",
  ];

  let size = bytes;
  let index = 0;

  while (
    size >= 1024 &&
    index < units.length - 1
  ) {
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
  h-12
  bg-[#080E1A]
  border
  border-white/[0.08]
  hover:border-white/[0.13]
  focus:border-blue-500/60
  focus:ring-4
  focus:ring-blue-500/[0.07]
  rounded-xl
  px-4
  text-sm
  text-white
  placeholder:text-slate-600
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