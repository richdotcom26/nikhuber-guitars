"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        fontSize: 13, padding: "6px 14px", borderRadius: 6, border: "1px solid #111",
        background: "#111", color: "#fff", cursor: "pointer",
      }}
    >
      Drucken / als PDF speichern
    </button>
  );
}
