/** Others type values (same as web OtherReceipt.jsx). */
export const OTHERS_TYPE_KEYS = [
  "ring",
  "jain",
  "coin",
  "pattam",
  "others",
] as const;

export type OthersTypeKey = (typeof OTHERS_TYPE_KEYS)[number];
