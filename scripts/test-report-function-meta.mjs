/**
 * Parse sample GetFunction response (same shape as API).
 * Run: node scripts/test-report-function-meta.mjs
 */

const sample = {
  result: true,
  data: {
    totalRecords: 1,
    functions: [
      {
        id: 3,
        customerId: 1,
        functionName: "AutoTest 46385",
        functionDate: "2026-05-21T00:00:00",
        mahalName: "Auto Mahal",
        funPersionNames: "Auto Person",
      },
    ],
  },
};

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function pick(json, functionId) {
  if (!json.result || !json.data?.functions?.length) return null;
  const targetId = Number(functionId);
  const fn =
    json.data.functions.find((f) => Number(f.id) === targetId) ??
    json.data.functions[0];
  return {
    functionName: fn.functionName,
    functionDate: formatDisplayDate(fn.functionDate),
    mahalName: fn.mahalName,
    funPersionNames: fn.funPersionNames,
  };
}

const meta = pick(sample, 3);
if (meta.functionName !== "AutoTest 46385" || meta.mahalName !== "Auto Mahal") {
  console.error("FAIL", meta);
  process.exit(1);
}
console.log("Report function meta parse OK:", meta);
