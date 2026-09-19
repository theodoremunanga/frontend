import { memo } from "react";

// ================= CONSTANTES =================

const PLAYER_1 = 1;
const PLAYER_2 = 2;
const KING_1 = 3;
const KING_2 = 4;
const BOARD_SIZE = 10;

// ================= VALID BOARD =================

function isValidBoard(board) {
  if (!Array.isArray(board)) return false;
  if (board.length !== BOARD_SIZE) return false;

  return board.every(
    (row) =>
      Array.isArray(row) &&
      row.length === BOARD_SIZE &&
      row.every((cell) =>
        [0, 1, 2, 3, 4].includes(cell)
      )
  );
}

// ================= CELL =================

const Cell = memo(function Cell({ cell, size }) {
  const isDark = false; // on simplifie visuellement (optionnel)
  const isWhite =
    cell === PLAYER_1 || cell === KING_1;
  const isKing =
    cell === KING_1 || cell === KING_2;

  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#7c4a2d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(0,0,0,0.2)",
      }}
    >
      {cell !== 0 && (
        <div
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: "50%",
            background: isWhite
              ? "#e5e7eb"
              : "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isKing && <span>👑</span>}
        </div>
      )}
    </div>
  );
});

// ================= BOARD PREVIEW =================

export default function BoardPreview({
  board,
  size = 40,
}) {
  if (!isValidBoard(board)) {
    return (
      <div style={{ color: "red" }}>
        Plateau invalide
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-block",
        padding: 10,
        background: "#111827",
        borderRadius: 10,
      }}
    >
      {board.map((row, r) => (
        <div key={r} style={{ display: "flex" }}>
          {row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              cell={cell}
              size={size}
            />
          ))}
        </div>
      ))}
    </div>
  );
}