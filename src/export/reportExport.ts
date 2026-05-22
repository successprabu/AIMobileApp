import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import type { ReportFunctionMeta } from "../types/report";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function functionMetaHtmlSection(meta: ReportFunctionMeta | null): string {
  if (!meta) return "";
  return `
  <div class="cover">
    <h1>Function details</h1>
    <table class="meta">
      <tr><th>Function Name</th><td>${escapeHtml(meta.functionName)}</td></tr>
      <tr><th>Date</th><td>${escapeHtml(meta.functionDate)}</td></tr>
      <tr><th>Mahal Name</th><td>${escapeHtml(meta.mahalName)}</td></tr>
      <tr><th>Function Hero/Heroine</th><td>${escapeHtml(meta.funPersionNames)}</td></tr>
    </table>
  </div>
  <hr class="sep"/>`;
}

function tableHtmlFromRows(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "<p>No data</p>";
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
  return `<table class="data"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

const PDF_STYLES = `
  body{font-family:system-ui,sans-serif;font-size:11px;padding:12px;color:#222;
    background:#fff}
  .cover{border:2px solid #c2185b;border-radius:8px;padding:16px;margin-bottom:16px}
  .cover h1{color:#c2185b;font-size:18px;margin:0 0 12px}
  .meta{width:100%;border-collapse:collapse}
  .meta th,.meta td{
    border-top:1px solid #ccc;
    border-bottom:1px solid #ccc;
    border-left:none;
    border-right:none;
    padding:8px;text-align:left
  }
  .meta th{width:35%;background:#fce4ec}
  .sep{border:none;border-top:2px dashed #ccc;margin:20px 0}
  h2{font-size:16px;color:#c2185b;margin:16px 0 8px}
  table.data{border-collapse:collapse;width:100%}
  table.data th,table.data td{
    border-left:none;
    border-right:none;
    border-top:none;
    border-bottom:1px solid #bdbdbd;
    padding:8px 6px;
    text-align:left;
    vertical-align:top;
    word-wrap:break-word;
  }
  table.data thead th{
    background:#f5eef1;
    font-weight:700;
    border-bottom:2px solid #9e9e9e;
  }
  table.data tbody tr:nth-child(even) td{background-color:#fafafa}
`;

export function buildReportPdfHtml(
  sections: { title: string; rows: Record<string, unknown>[] }[],
  meta: ReportFunctionMeta | null
): string {
  const cover = functionMetaHtmlSection(meta);
  const bodies = sections
    .map(
      (s) =>
        `<h2>${escapeHtml(s.title)}</h2>${tableHtmlFromRows(s.rows)}`
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${PDF_STYLES}</style></head><body>${cover}${bodies}</body></html>`;
}

function metaSheetRows(meta: ReportFunctionMeta): Record<string, string>[] {
  return [
    { Field: "Function Name", Value: meta.functionName },
    { Field: "Date", Value: meta.functionDate },
    { Field: "Mahal Name", Value: meta.mahalName },
    { Field: "Function Hero/Heroine", Value: meta.funPersionNames },
  ];
}

export async function shareExcel(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName: string,
  meta?: ReportFunctionMeta | null
) {
  const wb = XLSX.utils.book_new();
  if (meta) {
    const metaWs = XLSX.utils.json_to_sheet(metaSheetRows(meta));
    XLSX.utils.book_append_sheet(wb, metaWs, "Function");
  }
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
    UTI: "org.openxmlformats.spreadsheetml.sheet",
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

export async function sharePdfReport(
  sections: { title: string; rows: Record<string, unknown>[] }[],
  dialogTitle: string,
  meta?: ReportFunctionMeta | null
) {
  const html = buildReportPdfHtml(sections, meta ?? null);
  await sharePdfFromHtml(html, dialogTitle);
}
