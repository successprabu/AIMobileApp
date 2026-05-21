import type { ImportRecord } from "../types/transaction";

export function parseRecordsFromText(text: string): ImportRecord[] {
  const records: ImportRecord[] = [];
  const lines = text.split("\n").filter((line) => line.trim());

  const patterns = [
    /(.+?)\s*[-–—]\s*(.+?)\s*[-–—]\s*(\d+(?:\.\d+)?)/i,
    /(.+?)\s*:\s*(.+?)\s*:\s*(\d+(?:\.\d+)?)/i,
    /(.+?)\s*\|\s*(.+?)\s*\|\s*(\d+(?:\.\d+)?)/i,
    /(\w+(?:\s+\w+)*)\s+(\w+(?:\s+\w+)*)\s+(\d+(?:\.\d+)?)/i,
  ];

  for (const line of lines) {
    let parsed = false;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, name, village, amount] = match;
        records.push({
          id: Date.now() + Math.random() * 1000,
          name: name.trim(),
          villageName: village.trim(),
          amount: parseFloat(amount),
          oldAmount: 0,
          newAmount: 0,
          initial: "",
          phoneNo: "",
          remarks: "",
          isSelected: true,
          originalText: line,
        });
        parsed = true;
        break;
      }
    }

    if (!parsed && line.trim()) {
      records.push({
        id: Date.now() + Math.random() * 1000,
        name: line.trim().substring(0, 50),
        villageName: "",
        amount: 0,
        oldAmount: 0,
        newAmount: 0,
        initial: "",
        phoneNo: "",
        remarks: line.trim(),
        isSelected: true,
        originalText: line,
      });
    }
  }

  return records;
}

export function processAmountDistribution(records: ImportRecord[]): ImportRecord[] {
  return records.map((record) => {
    if (record.amount > 0) {
      return {
        ...record,
        newAmount: record.amount,
        oldAmount: 0,
        amount: record.amount,
      };
    }
    if (record.amount < 0) {
      return {
        ...record,
        oldAmount: Math.abs(record.amount),
        newAmount: 0,
        amount: 0,
      };
    }
    return record;
  });
}

export function importTemplateCsv(): string {
  const template = [
    ["Name", "Village", "Amount", "Old Amount", "New Amount", "Initial", "Phone No", "Remarks"],
    ["John Doe", "Main Street", "1000", "", "", "JD", "1234567890", "Sample remark"],
    ["Jane Smith", "Park Avenue", "", "500", "500", "JS", "0987654321", "Another sample"],
  ];
  return template.map((row) => row.join(",")).join("\n");
}
