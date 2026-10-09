/** Sofortige Rückmeldung beim Seitenwechsel, solange der Server die Seite lädt. */
export default function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
      lädt …
    </div>
  );
}
