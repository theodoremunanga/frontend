import { useEffect, useState } from "react";

import {
  getAllAds,
  deleteAd,
  toggleAdStatus,
} from "../../services/adService";

import AdsEditor from "./AdsEditor";

export default function AdsManager() {
  // ======================================================
  // STATES
  // ======================================================

  const [ads, setAds] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedAd, setSelectedAd] =
    useState(null);

  const [isEditing, setIsEditing] =
    useState(false);

  // ======================================================
  // LOAD ADS
  // ======================================================

  useEffect(() => {
    loadAds();
  }, []);

  async function loadAds() {
    try {
      setLoading(true);

      const data =
        await getAllAds();

      setAds(data || []);
    } catch (error) {
      console.error(
        "Load ads error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // ======================================================
  // DELETE
  // ======================================================

  async function handleDelete(id) {
    const ok = window.confirm(
      "Supprimer cette publicité ?"
    );

    if (!ok) return;

    try {
      await deleteAd(id);

      await loadAds();
    } catch (error) {
      console.error(
        "Delete ad error:",
        error
      );
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
      console.error(
        "Toggle ad error:",
        error
      );
    }
  }

  // ======================================================
  // EDIT
  // ======================================================

  function handleEdit(ad) {
    setSelectedAd(ad);

    setIsEditing(true);
  }

  // ======================================================
  // CREATE
  // ======================================================

  function handleCreate() {
    setSelectedAd(null);

    setIsEditing(true);
  }

  // ======================================================
  // CLOSE EDITOR
  // ======================================================

  function handleCloseEditor() {
    setSelectedAd(null);

    setIsEditing(false);

    loadAds();
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="p-6 min-h-screen bg-[#0B1120] text-white">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Ads Manager
          </h1>

          <p className="text-gray-400 mt-1">
            Gérez toutes les publicités
            de la plateforme
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="
            bg-green-500
            hover:bg-green-600
            transition
            px-5
            py-3
            rounded-2xl
            font-semibold
            shadow-lg
          "
        >
          + Nouvelle publicité
        </button>
      </div>

      {/* ====================================================== */}
      {/* LOADING */}
      {/* ====================================================== */}

      {loading && (
        <div
          className="
            bg-[#111827]
            border
            border-gray-800
            rounded-2xl
            p-6
            text-center
            text-gray-300
          "
        >
          Chargement des publicités...
        </div>
      )}

      {/* ====================================================== */}
      {/* EMPTY */}
      {/* ====================================================== */}

      {!loading &&
        ads.length === 0 && (
          <div
            className="
              bg-[#111827]
              border
              border-gray-800
              rounded-2xl
              p-10
              text-center
              text-gray-400
            "
          >
            Aucune publicité trouvée.
          </div>
        )}

      {/* ====================================================== */}
      {/* ADS LIST */}
      {/* ====================================================== */}

      {!loading &&
        ads.length > 0 && (
          <div className="grid gap-5">
            {ads.map((ad) => (
              <div
                key={
                  ad.id ||
                  ad._id
                }
                className="
                  bg-[#111827]
                  border
                  border-gray-800
                  rounded-2xl
                  p-5
                  flex
                  flex-col
                  lg:flex-row
                  lg:items-center
                  lg:justify-between
                  gap-5
                "
              >
                {/* ====================================================== */}
                {/* LEFT */}
                {/* ====================================================== */}

                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold">
                      {ad.title ||
                        "Sans titre"}
                    </h2>

                    <span
                      className={`
                        px-3
                        py-1
                        rounded-full
                        text-xs
                        font-bold
                        ${
                          ad.status ===
                            "active" ||
                          ad.active
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }
                      `}
                    >
                      {ad.status ===
                        "active" ||
                      ad.active
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </span>
                  </div>

                  <p className="text-gray-400 mt-2">
                    {ad.description ||
                      "Aucune description"}
                  </p>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                    <div>
                      📂{" "}
                      {ad.category ||
                        "general"}
                    </div>

                    <div>
                      👁{" "}
                      {ad.views || 0} vues
                    </div>

                    <div>
                      🖱{" "}
                      {ad.clicks || 0} clics
                    </div>
                  </div>
                </div>

                {/* ====================================================== */}
                {/* ACTIONS */}
                {/* ====================================================== */}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      handleEdit(ad)
                    }
                    className="
                      bg-blue-500
                      hover:bg-blue-600
                      transition
                      px-4
                      py-2
                      rounded-xl
                      font-semibold
                    "
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() =>
                      handleToggle(
                        ad.id ||
                          ad._id
                      )
                    }
                    className="
                      bg-yellow-500
                      hover:bg-yellow-600
                      transition
                      px-4
                      py-2
                      rounded-xl
                      font-semibold
                    "
                  >
                    Activer /
                    Désactiver
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(
                        ad.id ||
                          ad._id
                      )
                    }
                    className="
                      bg-red-500
                      hover:bg-red-600
                      transition
                      px-4
                      py-2
                      rounded-xl
                      font-semibold
                    "
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* ====================================================== */}
      {/* EDITOR */}
      {/* ====================================================== */}

      {isEditing && (
        <AdsEditor
          ad={selectedAd}
          onClose={
            handleCloseEditor
          }
        />
      )}
    </div>
  );
}