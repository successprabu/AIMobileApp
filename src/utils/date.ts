/** Today as yyyy-MM-dd (same as HTML `<input type="date">`). */
export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Display dd/MM/yyyy for labels and list rows. */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const slash = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const d = dateStr.includes("T")
      ? new Date(dateStr)
      : slash
        ? new Date(`${slash[3]}-${slash[2]}-${slash[1]}`)
        : /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
          ? new Date(`${dateStr}T12:00:00`)
          : new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/** Normalize user typing to yyyy-MM-dd when possible. */
export function normalizeDateInput(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const d = slash[1].padStart(2, "0");
    const m = slash[2].padStart(2, "0");
    return `${slash[3]}-${m}-${d}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }

  return trimmed;
}

export function parsePickerToIso(selected: Date): string {
  const y = selected.getFullYear();
  const m = String(selected.getMonth() + 1).padStart(2, "0");
  const d = String(selected.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoToDate(isoDate: string): Date {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return new Date();
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = parseIsoToDate(iso);
  return !Number.isNaN(d.getTime());
}
