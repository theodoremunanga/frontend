import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createAd,
  updateAd,
} from "../../services/adService";

export default function AdsEditor({
  ad = null,
  onClose,
}) {
  // ======================================================
  // STATES
  // ======================================================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [preview, setPreview] =
    useState("");

  const [mediaType, setMediaType] =
    useState("image");

  // ✅ VRAI FICHIER
  const [mediaFile, setMediaFile] =
    useState(null);

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

  // ======================================================
  // LOAD EXISTING AD
  // ======================================================

  useEffect(() => {
    if (!ad) return;

    setForm({
      title: ad.title || "",
      description:
        ad.description || "",
      image: ad.image || "",
      video: ad.video || "",
      link: ad.link || "",
      advertiser:
        ad.advertiser || "",
      contact: ad.contact || "",
      category:
        ad.category ||
        "home_feed",
      status:
        ad.status || "active",
      is_sponsored:
        ad.is_sponsored ?? true,
      comments_enabled:
        ad.comments_enabled ??
        true,
      priority:
        ad.priority || 1,
      duration_hours:
        ad.duration_hours || 24,

      start_date:
        ad.start_date
          ? new Date(
              ad.start_date
            )
              .toISOString()
              .slice(0, 16)
          : "",

      end_date:
        ad.end_date
          ? new Date(
              ad.end_date
            )
              .toISOString()
              .slice(0, 16)
          : "",
    });

    // =========================
    // PREVIEW EXISTANT
    // =========================
    const BACKEND_URL =
      import.meta.env.VITE_API_URL?.replace("/api", "");

        if (ad.video) {

          setMediaType("video");

          setPreview(ad.video);

        } else if (ad.image) {

          setMediaType("image");

          setPreview(ad.image);

        }
      }, [ad]);

  // ======================================================
  // AUTO CALCULATE END DATE
  // ======================================================

  useEffect(() => {
    if (!form.start_date) return;

    const start =
      new Date(form.start_date);

    start.setHours(
      start.getHours() +
        Number(form.duration_hours)
    );

    const formatted =
      start.toISOString().slice(0, 16);

    setForm((prev) => ({
      ...prev,
      end_date: formatted,
    }));
  }, [
    form.start_date,
    form.duration_hours,
  ]);

  // ======================================================
  // HANDLE INPUT CHANGE
  // ======================================================

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
  }

  // ======================================================
  // HANDLE FILE UPLOAD
  // ======================================================

  function handleFileUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    // =========================
    // SUPPRIMER ANCIEN PREVIEW
    // =========================

    if (
      preview &&
      preview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(preview);
    }

    // =========================
    // PREVIEW LOCAL
    // =========================

    const previewUrl =
      URL.createObjectURL(file);

    const isVideo =
      file.type.startsWith("video");

    setMediaFile(file);

    if (isVideo) {
      setMediaType("video");

      setForm((prev) => ({
        ...prev,
        video: "",
        image: "",
      }));
    } else {
      setMediaType("image");

      setForm((prev) => ({
        ...prev,
        image: "",
        video: "",
      }));
    }

    setPreview(previewUrl);
  }

  // ======================================================
  // VALIDATION
  // ======================================================

  function validateForm() {
    if (!form.title.trim()) {
      setError(
        "Le titre est obligatoire."
      );

      return false;
    }

    if (
      !form.description.trim()
    ) {
      setError(
        "La description est obligatoire."
      );

      return false;
    }

    // ✅ CHECK MEDIA
    if (!mediaFile && !preview) {
      setError(
        "Ajoutez une image ou une vidéo."
      );

      return false;
    }

    if (!form.start_date) {
      setError(
        "Ajoutez une date de lancement."
      );

      return false;
    }

    return true;
  }

  // ======================================================
  // SUBMIT
  // ======================================================

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) return;

    try {
      setLoading(true);

      // =========================
      // FORMDATA
      // =========================

      const formData =
        new FormData();

      formData.append(
        "title",
        form.title
      );

      formData.append(
        "description",
        form.description
      );

      formData.append(
        "link",
        form.link
      );

      formData.append(
        "advertiser",
        form.advertiser
      );

      formData.append(
        "contact",
        form.contact
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

      // =========================
      // FILE
      // =========================

      if (mediaFile) {
        formData.append(
          "media",
          mediaFile
        );
      }

      // =========================
      // UPDATE
      // =========================

      if (ad?.id) {
        await updateAd(
          ad.id,
          formData
        );

        setSuccess(
          "✅ Publicité mise à jour avec succès"
        );

      } else {
        await createAd(formData);

        setSuccess(
          "🚀 Publicité publiée avec succès"
        );
      }

      setTimeout(() => {
        onClose?.();
      }, 1200);

    } catch (err) {
      console.error(err);

      setError(
        "Erreur lors de la sauvegarde."
      );

    } finally {
      setLoading(false);
    }
  }

  // ======================================================
  // CATEGORIES
  // ======================================================

  const categories = useMemo(
  () => [

    {
      value: "home_feed",
      label: "Fil d'accueil",
    },

    {
      value: "home_banner",
      label: "Bannière d'accueil",
    },

    {
      value: "carousel",
      label: "Carousel",
    },

    {
      value: "pre_match",
      label: "Avant match",
    },

    {
      value: "post_match",
      label: "Après match",
    },

    {
      value: "sponsored_post",
      label: "Publication sponsorisée",
    },

  ],
  []
);

  // ======================================================
  // CLEANUP
  // ======================================================

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

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/70
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-2
        md:p-5
      "
    >
      <div
        className="
          w-full
          max-w-7xl
          h-[95vh]
          bg-[#0B1120]
          border
          border-slate-800
          rounded-[30px]
          overflow-hidden
          shadow-2xl
          flex
          flex-col
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            px-4
            md:px-8
            py-5
            border-b
            border-slate-800
            bg-[#0F172A]
            shrink-0
          "
        >
          <div>
            <h1
              className="
                text-2xl
                md:text-3xl
                font-black
                text-white
              "
            >
              📢 Ads Editor SaaS
            </h1>

            <p className="text-slate-400 mt-1">
              Créez des publicités
              sociales professionnelles
              pour 6BetBall
            </p>
          </div>

          <button
            onClick={onClose}
            className="
              bg-red-500
              hover:bg-red-600
              transition
              w-12
              h-12
              rounded-2xl
              text-white
              text-xl
              font-black
            "
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}

        <div
          className="
            flex-1
            overflow-y-auto
          "
        >
          <div
            className="
              grid
              grid-cols-1
              xl:grid-cols-2
            "
          >
            {/* LEFT */}

            <div className="p-4 md:p-8">

              {error && (
                <div
                  className="
                    mb-5
                    bg-red-500/20
                    border
                    border-red-500/40
                    text-red-300
                    rounded-2xl
                    p-4
                  "
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="
                    mb-5
                    bg-green-500/20
                    border
                    border-green-500/40
                    text-green-300
                    rounded-2xl
                    p-4
                  "
                >
                  {success}
                </div>
              )}

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >
                <Input
                  label="Titre"
                  name="title"
                  value={form.title}
                  onChange={
                    handleChange
                  }
                  placeholder="Ex: Bonus Champions League"
                />

                <div>
                  <label
                    className={label}
                  >
                    Description
                  </label>

                  <textarea
                    name="description"
                    rows={6}
                    value={
                      form.description
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      textarea
                    }
                    placeholder="Description complète de la publication..."
                  />
                </div>

                {/* MEDIA */}

                <div>
                  <label
                    className={label}
                  >
                    Upload Photo / Vidéo
                  </label>

                  <div
                    className="
                      bg-[#111827]
                      border-2
                      border-dashed
                      border-slate-700
                      rounded-3xl
                      p-8
                      text-center
                    "
                  >
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={
                        handleFileUpload
                      }
                      className="
                        text-white
                        w-full
                      "
                    />

                    <p className="text-slate-500 text-sm mt-3">
                      JPG, PNG, MP4,
                      WEBM...
                    </p>
                  </div>
                </div>

                {/* DATES */}

                <div
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    gap-4
                  "
                >
                  <Input
                    type="datetime-local"
                    label="Date lancement"
                    name="start_date"
                    value={
                      form.start_date
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <Input
                    type="number"
                    label="Durée (heures)"
                    name="duration_hours"
                    value={
                      form.duration_hours
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

                <Input
                  type="datetime-local"
                  label="Date fin"
                  name="end_date"
                  value={form.end_date}
                  onChange={
                    handleChange
                  }
                />

                {/* CATEGORY */}

                <div>
                  <label
                    className={label}
                  >
                    Catégorie
                  </label>

                  <select
                    name="category"
                    value={
                      form.category
                    }
                    onChange={
                      handleChange
                    }
                    className={input}
                  >
                    {categories.map(
                      (cat) => (
                        <option
                          key={
                            cat.value
                          }
                          value={
                            cat.value
                          }
                        >
                          {cat.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* EXTRA */}

                <div
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    gap-4
                  "
                >
                  <Input
                    label="Lien externe"
                    name="link"
                    value={form.link}
                    onChange={
                      handleChange
                    }
                    placeholder="https://..."
                  />

                  <Input
                    label="Annonceur"
                    name="advertiser"
                    value={
                      form.advertiser
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Entreprise..."
                  />
                </div>

                {/* OPTIONS */}

                <div
                  className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    gap-4
                  "
                >
                  <Checkbox
                    label="Commentaires activés"
                    name="comments_enabled"
                    checked={
                      form.comments_enabled
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <Checkbox
                    label="Sponsorisé"
                    name="is_sponsored"
                    checked={
                      form.is_sponsored
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

                {/* STATUS */}

                <div>
                  <label
                    className={label}
                  >
                    Statut
                  </label>

                  <select
                    name="status"
                    value={
                      form.status
                    }
                    onChange={
                      handleChange
                    }
                    className={input}
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </div>

                {/* ACTIONS */}

                <div
                  className="
                    sticky
                    bottom-0
                    left-0
                    bg-[#0B1120]
                    border-t
                    border-slate-800
                    mt-8
                    pt-5
                    pb-2
                    flex
                    flex-col
                    sm:flex-row
                    gap-4
                    z-20
                  "
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      flex-1
                      bg-gradient-to-r
                      from-blue-500
                      to-cyan-500
                      hover:scale-[1.02]
                      active:scale-[0.98]
                      disabled:opacity-50
                      transition-all
                      duration-300
                      py-4
                      rounded-2xl
                      font-black
                      text-white
                      text-lg
                      shadow-2xl
                      border
                      border-blue-400/20
                    "
                  >
                    {loading
                      ? "⏳ Publication..."
                      : ad
                      ? "💾 VALIDER LES MODIFICATIONS"
                      : "🚀 PUBLIER LA PUBLICITÉ"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      onClose
                    }
                    className="
                      sm:w-[220px]
                      bg-[#1E293B]
                      hover:bg-[#334155]
                      transition-all
                      duration-300
                      py-4
                      rounded-2xl
                      font-bold
                      text-white
                      border
                      border-slate-700
                    "
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT */}

            <div
              className="
                bg-[#111827]
                border-l
                border-slate-800
                p-4
                md:p-8
              "
            >
              <h2
                className="
                  text-2xl
                  font-black
                  text-white
                  mb-6
                "
              >
                👀 Aperçu Publication
              </h2>

              <div
                className="
                  bg-[#0F172A]
                  border
                  border-slate-700
                  rounded-3xl
                  overflow-hidden
                "
              >
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="
                        w-12
                        h-12
                        rounded-full
                        bg-blue-500
                        flex
                        items-center
                        justify-center
                        text-white
                        font-black
                      "
                    >
                      6B
                    </div>

                    <div>
                      <h3 className="text-white font-bold">
                        6BetBall Ads
                      </h3>

                      <p className="text-slate-400 text-sm">
                        Sponsorisé
                      </p>
                    </div>
                  </div>

                  <h1
                    className="
                      mt-5
                      text-2xl
                      font-black
                      text-white
                    "
                  >
                    {form.title ||
                      "Titre publicité"}
                  </h1>

                  <p
                    className="
                      mt-4
                      text-slate-300
                      whitespace-pre-wrap
                    "
                  >
                    {form.description ||
                      "Votre publication apparaîtra ici."}
                  </p>
                </div>

                {/* MEDIA */}

                {preview && (
                  <>
                    {mediaType ===
                    "video" ? (
                      <video
                        src={preview}
                        controls
                        className="
                          w-full
                          max-h-[500px]
                          object-cover
                          bg-black
                        "
                      />
                    ) : (
                      <img
                        src={preview}
                        alt="preview"
                        className="
                          w-full
                          max-h-[500px]
                          object-cover
                        "
                      />
                    )}
                  </>
                )}

                <div
                  className="
                    border-t
                    border-slate-800
                    p-5
                  "
                >
                  <div
                    className="
                      grid
                      grid-cols-3
                      gap-3
                    "
                  >
                    <button
                      className={
                        socialBtn
                      }
                    >
                      ❤️ Like
                    </button>

                    <button
                      className={
                        socialBtn
                      }
                    >
                      💬 Commenter
                    </button>

                    <button
                      className={
                        socialBtn
                      }
                    >
                      🔗 Partager
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// INPUT
// ======================================================

function Input({
  label: inputLabel,
  type = "text",
  name,
  value,
  onChange,
  placeholder = "",
}) {
  return (
    <div>
      <label className={label}>
        {inputLabel}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={input}
      />
    </div>
  );
}

// ======================================================
// CHECKBOX
// ======================================================

function Checkbox({
  label: checkboxLabel,
  name,
  checked,
  onChange,
}) {
  return (
    <label
      className="
        flex
        items-center
        gap-3
        bg-[#111827]
        border
        border-slate-700
        rounded-2xl
        p-4
        cursor-pointer
      "
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
      />

      <span className="text-white font-medium">
        {checkboxLabel}
      </span>
    </label>
  );
}

// ======================================================
// STYLES
// ======================================================

const label = `
  block
  mb-2
  text-sm
  font-bold
  text-slate-300
`;

const input = `
  w-full
  bg-[#111827]
  border
  border-slate-700
  rounded-2xl
  px-4
  py-4
  text-white
  outline-none
  focus:border-blue-500
`;

const textarea = `
  w-full
  bg-[#111827]
  border
  border-slate-700
  rounded-2xl
  px-4
  py-4
  text-white
  outline-none
  focus:border-blue-500
`;

const socialBtn = `
  bg-[#1E293B]
  hover:bg-[#334155]
  transition
  py-3
  rounded-xl
  text-white
  font-semibold
`;