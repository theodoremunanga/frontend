export default function GameCard({
  title,
  creator,
  bet,
  status = "En cours",
  players = 2,
  onClick,
}) {
  return (
    <div
      className="game-card"
      onClick={onClick}
    >
      {/* TOP */}
      <div className="game-card-top">
        <div className="game-badge">
          🎮 Partie Active
        </div>

        <div className="game-status">
          {status}
        </div>
      </div>

      {/* TITLE */}
      <h3 className="game-title">
        {title}
      </h3>

      {/* CONTENT */}
      <div className="game-content">
        <div className="game-info">
          <span className="label">
            👤 Créé par
          </span>

          <span className="value">
            {creator || "Joueur"}
          </span>
        </div>

        <div className="game-info">
          <span className="label">
            💰 Mise
          </span>

          <span className="bet-value">
            {Number(
              bet || 0
            ).toLocaleString()}{" "}
            CDF
          </span>
        </div>

        <div className="game-info">
          <span className="label">
            👥 Joueurs
          </span>

          <span className="value">
            {players}
          </span>
        </div>
      </div>

      {/* BUTTON */}
      <button
        className="play-btn"
      >
        ▶ Rejoindre
      </button>

      {/* STYLE */}
      <style jsx>{`
        .game-card {
          position: relative;
          background: linear-gradient(
            180deg,
            rgba(30, 41, 59, 0.96),
            rgba(15, 23, 42, 0.96)
          );

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius: 24px;

          padding: 22px;

          cursor: pointer;

          overflow: hidden;

          transition: all 0.25s
            ease;

          box-shadow: 0 12px 35px
            rgba(0, 0, 0, 0.25);

          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .game-card:hover {
          transform: translateY(
            -4px
          );

          border-color: rgba(
            59,
            130,
            246,
            0.5
          );

          box-shadow: 0 20px 45px
            rgba(
              37,
              99,
              235,
              0.2
            );
        }

        .game-card-top {
          display: flex;

          justify-content: space-between;

          align-items: center;
        }

        .game-badge {
          background: linear-gradient(
            to right,
            #2563eb,
            #1d4ed8
          );

          color: white;

          padding: 6px 12px;

          border-radius: 999px;

          font-size: 12px;

          font-weight: 700;
        }

        .game-status {
          background: rgba(
            34,
            197,
            94,
            0.15
          );

          color: #4ade80;

          padding: 6px 12px;

          border-radius: 999px;

          font-size: 12px;

          font-weight: 700;
        }

        .game-title {
          margin: 0;

          color: white;

          font-size: 24px;

          font-weight: 900;
        }

        .game-content {
          display: flex;

          flex-direction: column;

          gap: 14px;
        }

        .game-info {
          display: flex;

          justify-content: space-between;

          align-items: center;

          background: rgba(
            255,
            255,
            255,
            0.04
          );

          padding: 12px 14px;

          border-radius: 14px;
        }

        .label {
          color: #94a3b8;

          font-size: 14px;
        }

        .value {
          color: white;

          font-weight: 700;
        }

        .bet-value {
          color: #facc15;

          font-weight: 900;

          font-size: 16px;
        }

        .play-btn {
          margin-top: 6px;

          border: none;

          background: linear-gradient(
            to right,
            #22c55e,
            #16a34a
          );

          color: white;

          padding: 15px;

          border-radius: 16px;

          font-size: 15px;

          font-weight: 800;

          cursor: pointer;

          transition: 0.2s;
        }

        .play-btn:hover {
          transform: scale(
            1.02
          );
        }
      `}</style>
    </div>
  );
}