import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import {
  Heart,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  Reply,
  MoreHorizontal,
  Smile,
} from "lucide-react";

// ======================================================
// HELPERS
// ======================================================

function formatTime(date) {
  if (!date) return "À l’instant";

  try {
    const now = new Date();
    const d = new Date(date);

    const diff = Math.floor(
      (now - d) / 1000
    );

    if (diff < 60)
      return "À l’instant";

    if (diff < 3600)
      return `${Math.floor(
        diff / 60
      )} min`;

    if (diff < 86400)
      return `${Math.floor(
        diff / 3600
      )} h`;

    if (diff < 604800)
      return `${Math.floor(
        diff / 86400
      )} j`;

    return d.toLocaleDateString();
  } catch {
    return "Maintenant";
  }
}

function getCommentText(comment) {
  return (
    comment?.text ||
    comment?.comment ||
    comment?.content ||
    comment?.message ||
    ""
  );
}

function getCommentUser(comment) {
  return (
    comment?.user?.username ||
    comment?.username ||
    comment?.author ||
    comment?.name ||
    "Utilisateur"
  );
}

function getAvatar(name = "") {
  return name
    ?.charAt(0)
    ?.toUpperCase();
}

// ======================================================
// COMMENT ITEM
// ======================================================

function CommentItem({
  comment,
  currentUser,
  onLike,
  onReply,
  replyingTo,
  replyText,
  setReplyText,
  submitReply,
  sendingReply,
}) {
  const username =
    getCommentUser(comment);

  const text =
    getCommentText(comment);

  const likes =
    comment?.likes_count || 0;

  const liked =
    comment?.liked || false;

  const replies =
    comment?.replies || [];

  return (
    <div className="flex gap-3">
      {/* AVATAR */}
      <div
        className="
          w-10
          h-10
          rounded-full
          bg-gradient-to-br
          from-blue-500
          to-purple-600
          flex
          items-center
          justify-center
          text-white
          font-bold
          shrink-0
          shadow-lg
        "
      >
        {getAvatar(username)}
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        {/* BUBBLE */}
        <div
          className="
            bg-[#1E293B]
            hover:bg-[#243244]
            transition-all
            rounded-[22px]
            px-4
            py-3
            border
            border-white/5
            relative
            shadow-lg
          "
        >
          {/* HEADER */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4
                className="
                  text-white
                  font-semibold
                  text-sm
                "
              >
                {username}
              </h4>

              <span
                className="
                  text-[11px]
                  text-gray-400
                "
              >
                {formatTime(
                  comment?.created_at
                )}
              </span>
            </div>

            <button
              className="
                text-gray-500
                hover:text-white
                transition
              "
            >
              <MoreHorizontal
                size={17}
              />
            </button>
          </div>

          {/* TEXT */}
          <p
            className="
              text-gray-100
              text-[15px]
              leading-relaxed
              mt-2
              whitespace-pre-wrap
              break-words
            "
          >
            {text}
          </p>

          {/* REACTION BADGE */}
          {likes > 0 && (
            <div
              className="
                absolute
                -bottom-3
                right-4
                bg-[#0F172A]
                border
                border-white/10
                rounded-full
                px-2.5
                py-1
                flex
                items-center
                gap-1
                shadow-xl
              "
            >
              <Heart
                size={12}
                className="
                  text-pink-500
                  fill-pink-500
                "
              />

              <span
                className="
                  text-xs
                  text-white
                  font-medium
                "
              >
                {likes}
              </span>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div
          className="
            flex
            items-center
            gap-5
            px-3
            mt-3
          "
        >
          <button
            onClick={() =>
              onLike(comment)
            }
            className={`
              flex items-center gap-1.5 text-sm font-medium transition
              ${
                liked
                  ? "text-pink-500"
                  : "text-gray-400 hover:text-white"
              }
            `}
          >
            <Heart
              size={15}
              className={
                liked
                  ? "fill-pink-500"
                  : ""
              }
            />

            J’aime
          </button>

          <button
            onClick={() =>
              onReply(comment)
            }
            className="
              flex items-center gap-1.5
              text-sm font-medium
              text-gray-400
              hover:text-white
              transition
            "
          >
            <Reply size={15} />
            Répondre
          </button>
        </div>

        {/* REPLY INPUT */}
        {replyingTo ===
          comment.id && (
          <div
            className="
              mt-4
              flex
              gap-2
              items-center
            "
          >
            <div
              className="
                w-8
                h-8
                rounded-full
                bg-gradient-to-br
                from-green-500
                to-emerald-600
                flex
                items-center
                justify-center
                text-white
                text-xs
                font-bold
                shrink-0
              "
            >
              {getAvatar(
                currentUser?.username
              )}
            </div>

            <input
              type="text"
              value={replyText}
              onChange={(e) =>
                setReplyText(
                  e.target.value
                )
              }
              placeholder="Écrire une réponse..."
              className="
                flex-1
                bg-[#111827]
                border
                border-white/10
                rounded-full
                px-4
                py-2.5
                text-sm
                text-white
                outline-none
                focus:border-blue-500
              "
            />

            <button
              onClick={() =>
                submitReply(
                  comment.id
                )
              }
              disabled={
                sendingReply ||
                !replyText.trim()
              }
              className="
                w-10
                h-10
                rounded-full
                bg-blue-500
                hover:bg-blue-600
                disabled:opacity-50
                flex
                items-center
                justify-center
                transition
              "
            >
              {sendingReply ? (
                <Loader2
                  size={16}
                  className="animate-spin text-white"
                />
              ) : (
                <Send
                  size={16}
                  className="text-white"
                />
              )}
            </button>
          </div>
        )}

        {/* REPLIES */}
        {replies.length > 0 && (
          <div
            className="
              mt-4
              ml-4
              border-l
              border-white/10
              pl-4
              space-y-4
            "
          >
            {replies.map(
              (
                reply,
                index
              ) => (
                <div
                  key={
                    reply?.id ||
                    index
                  }
                  className="flex gap-2"
                >
                  <div
                    className="
                      w-8
                      h-8
                      rounded-full
                      bg-gradient-to-br
                      from-pink-500
                      to-orange-500
                      flex
                      items-center
                      justify-center
                      text-white
                      text-xs
                      font-bold
                      shrink-0
                    "
                  >
                    {getAvatar(
                      getCommentUser(
                        reply
                      )
                    )}
                  </div>

                  <div
                    className="
                      bg-[#172033]
                      rounded-2xl
                      px-3
                      py-2
                      flex-1
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        mb-1
                      "
                    >
                      <span
                        className="
                          text-sm
                          font-semibold
                          text-white
                        "
                      >
                        {getCommentUser(
                          reply
                        )}
                      </span>

                      <span
                        className="
                          text-[11px]
                          text-gray-500
                        "
                      >
                        {formatTime(
                          reply?.created_at
                        )}
                      </span>
                    </div>

                    <p
                      className="
                        text-sm
                        text-gray-200
                        whitespace-pre-wrap
                      "
                    >
                      {getCommentText(
                        reply
                      )}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function AdComments({
  ad,
  currentUser,
}) {
  // ======================================================
  // STATES
  // ======================================================

  const [comments, setComments] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [text, setText] =
    useState("");

  const [showComments, setShowComments] =
    useState(false);

  const [replyingTo, setReplyingTo] =
    useState(null);

  const [replyText, setReplyText] =
    useState("");

  const [
    sendingReply,
    setSendingReply,
  ] = useState(false);

  // ======================================================
  // API
  // ======================================================

  const API = useMemo(
    () =>
      (
        import.meta.env
          .VITE_API_URL ||
        "http://localhost:3000/api"
      ).replace(/\/+$/, ""),
    []
  );

  // ======================================================
  // LOAD COMMENTS
  // ======================================================

  const loadComments =
    useCallback(async () => {
      if (!ad?.id) return;

      try {
        setLoading(true);

        const res = await fetch(
          `${API}/ads/${ad.id}/comments`
        );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Erreur chargement commentaires"
          );
        }

        const list =
          Array.isArray(data)
            ? data
            : data?.comments ||
              [];

        setComments(
          list.map((c) => ({
            ...c,

            text:
              c?.text ||
              c?.comment ||
              c?.content ||
              "",

            username:
              c?.username ||
              c?.user
                ?.username ||
              "Utilisateur",

            likes_count:
              c?.likes_count ||
              c?.likes ||
              0,

            replies:
              c?.replies || [],
          }))
        );
      } catch (err) {
        console.error(err);

        setError(
          err?.message ||
            "Erreur commentaires"
        );
      } finally {
        setLoading(false);
      }
    }, [API, ad?.id]);

  // ======================================================
  // EFFECT
  // ======================================================

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // ======================================================
  // ADD COMMENT
  // ======================================================

  async function handleAddComment() {
    if (!text.trim()) return;

    try {
      setSending(true);

      const token =
        localStorage.getItem(
          "token"
        );

      const res = await fetch(
        `${API}/ads/${ad.id}/comments`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            comment:
              text.trim(),
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Erreur commentaire"
        );
      }

      const newComment = {
        ...data,

        text:
          data?.text ||
          text.trim(),

        username:
          currentUser
            ?.username ||
          "Vous",

        likes_count: 0,

        replies: [],
      };

      setComments((prev) => [
        newComment,
        ...prev,
      ]);

      setText("");
      setShowComments(true);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Impossible d’envoyer"
      );
    } finally {
      setSending(false);
    }
  }

  // ======================================================
  // LIKE
  // ======================================================

  function handleLike(comment) {
    setComments((prev) =>
      prev.map((c) => {
        if (
          c.id !== comment.id
        )
          return c;

        const liked =
          !c.liked;

        return {
          ...c,

          liked,

          likes_count:
            liked
              ? c.likes_count +
                1
              : Math.max(
                  0,
                  c.likes_count -
                    1
                ),
        };
      })
    );
  }

  // ======================================================
  // REPLY
  // ======================================================

  async function submitReply(
    commentId
  ) {
    if (!replyText.trim())
      return;

    try {
      setSendingReply(true);

      const newReply = {
        id: Date.now(),

        text: replyText,

        username:
          currentUser
            ?.username ||
          "Vous",

        created_at:
          new Date().toISOString(),
      };

      setComments((prev) =>
        prev.map((c) => {
          if (
            c.id !== commentId
          )
            return c;

          return {
            ...c,

            replies: [
              ...c.replies,
              newReply,
            ],
          };
        })
      );

      setReplyText("");
      setReplyingTo(null);
    } finally {
      setSendingReply(false);
    }
  }

  // ======================================================
  // TOTAL REACTIONS
  // ======================================================

  const totalLikes =
    comments.reduce(
      (
        acc,
        comment
      ) =>
        acc +
        (comment.likes_count ||
          0),
      0
    );

  // ======================================================
  // DISABLED
  // ======================================================

  if (!ad?.comments_enabled)
    return null;

  // ======================================================
  // UI
  // ======================================================

  return (
    <div
      className="
        mt-5
        bg-[#0B1120]
        border
        border-white/10
        rounded-[30px]
        overflow-hidden
        shadow-[0_10px_50px_rgba(0,0,0,0.45)]
      "
    >
      {/* TOP REACTIONS BAR */}
      <div
        className="
          px-5
          py-4
          border-b
          border-white/5
          flex
          items-center
          justify-between
        "
      >
        {/* LEFT */}
        <div className="flex items-center gap-2">
          <div
            className="
              w-7
              h-7
              rounded-full
              bg-pink-500
              flex
              items-center
              justify-center
              shadow-lg
            "
          >
            <Heart
              size={14}
              className="
                text-white
                fill-white
              "
            />
          </div>

          <span
            className="
              text-gray-200
              text-sm
              font-medium
            "
          >
            {totalLikes} réactions
          </span>
        </div>

        {/* RIGHT */}
        <button
          onClick={() =>
            setShowComments(
              !showComments
            )
          }
          className="
            flex
            items-center
            gap-2
            text-gray-300
            hover:text-white
            transition
            text-sm
            font-medium
          "
        >
          <MessageCircle
            size={16}
          />

          {comments.length} commentaires
          disponibles

          {showComments ? (
            <ChevronUp
              size={16}
            />
          ) : (
            <ChevronDown
              size={16}
            />
          )}
        </button>
      </div>

      {/* COMMENTS SECTION */}
      {showComments && (
        <div
          className="
            p-5
            space-y-6
            max-h-[650px]
            overflow-y-auto
          "
        >
          {loading ? (
            <div
              className="
                flex
                items-center
                justify-center
                py-10
                text-gray-400
                gap-3
              "
            >
              <Loader2 className="animate-spin" />
              Chargement...
            </div>
          ) : comments.length ===
            0 ? (
            <div
              className="
                text-center
                py-12
              "
            >
              <MessageCircle
                size={40}
                className="
                  mx-auto
                  text-gray-600
                  mb-3
                "
              />

              <p className="text-gray-400">
                Aucun commentaire
              </p>
            </div>
          ) : (
            comments.map(
              (
                comment,
                index
              ) => (
                <CommentItem
                  key={
                    comment?.id ||
                    index
                  }
                  comment={
                    comment
                  }
                  currentUser={
                    currentUser
                  }
                  onLike={
                    handleLike
                  }
                  onReply={(
                    c
                  ) =>
                    setReplyingTo(
                      c.id
                    )
                  }
                  replyingTo={
                    replyingTo
                  }
                  replyText={
                    replyText
                  }
                  setReplyText={
                    setReplyText
                  }
                  submitReply={
                    submitReply
                  }
                  sendingReply={
                    sendingReply
                  }
                />
              )
            )
          )}
        </div>
      )}

      {/* COMMENT INPUT */}
      <div
        className="
          border-t
          border-white/5
          p-4
          bg-[#0F172A]
        "
      >
        {error && (
          <div
            className="
              mb-3
              bg-red-500/10
              border
              border-red-500/20
              text-red-300
              text-sm
              rounded-2xl
              px-4
              py-3
            "
          >
            {error}
          </div>
        )}

        <div className="flex gap-3 items-end">
          {/* AVATAR */}
          <div
            className="
              w-11
              h-11
              rounded-full
              bg-gradient-to-br
              from-green-500
              to-emerald-600
              flex
              items-center
              justify-center
              text-white
              font-bold
              shrink-0
              shadow-lg
            "
          >
            {getAvatar(
              currentUser?.username
            )}
          </div>

          {/* INPUT */}
          <div className="flex-1">
            <div
              className="
                bg-[#111827]
                border
                border-white/10
                rounded-[24px]
                px-4
                py-3
                focus-within:border-blue-500
                transition-all
              "
            >
              <textarea
                rows={1}
                placeholder="Écrire un commentaire..."
                value={text}
                onChange={(e) =>
                  setText(
                    e.target.value
                  )
                }
                className="
                  w-full
                  bg-transparent
                  resize-none
                  outline-none
                  text-white
                  placeholder:text-gray-500
                  text-sm
                "
              />

              <div
                className="
                  mt-3
                  flex
                  items-center
                  justify-between
                "
              >
                <button
                  className="
                    text-gray-500
                    hover:text-white
                    transition
                  "
                >
                  <Smile size={18} />
                </button>

                <button
                  onClick={
                    handleAddComment
                  }
                  disabled={
                    sending ||
                    !text.trim()
                  }
                  className="
                    bg-gradient-to-r
                    from-blue-500
                    to-indigo-600
                    hover:scale-[1.03]
                    active:scale-100
                    transition-all
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    px-5
                    py-2.5
                    rounded-full
                    font-semibold
                    flex
                    items-center
                    gap-2
                    shadow-lg
                  "
                >
                  {sending ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send
                        size={16}
                      />
                      Publier
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}