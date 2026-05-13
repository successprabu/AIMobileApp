import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function rowsToHtmlTable(
  rows: Record<string, unknown>[],
  title: string
): string {
  if (!rows.length) {
    return `<html><head><meta charset="utf-8"/></head><body><p>No data</p></body></html>`;
  }
  const keys = Object.keys(rows[0]);
  const header = keys.map((k) => `<th>${escapeHtml(k)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${keys
          .map((k) => `<td>${escapeHtml(String(row[k] ?? ""))}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<html><head><meta charset="utf-8"/><style>
    body{font-family:system-ui,sans-serif;font-size:11px;padding:12px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #ccc;padding:6px;text-align:left}
    h2{font-size:16px}
  </style></head><body><h2>${escapeHtml(title)}</h2>
  <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export async function shareExcel(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName: string
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ note: "No data" }]);
  const safeSheet = sheetName.replace(/[[\]:*?/\\]/g, "_").slice(0, 31) || "Sheet1";
  XLSX.utils.book_append_sheet(wb, ws, safeSheet);
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const path = `${FileSystem.cacheDirectory ?? ""}${fileName}`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(path, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: fileName,
  });
}

export async function sharePdfFromHtml(html: string, dialogTitle: string) {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle,
    UTI: "com.adobe.pdf",
  });
}
