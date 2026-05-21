/** Expense category values (stored in `villageName` on API), same as web Expenses.jsx. */
export const EXPENSE_CATEGORY_KEYS = [
  "venue",
  "catering",
  "decoration",
  "photography",
  "videography",
  "bridal_wear",
  "groom_wear",
  "jewelry",
  "transportation",
  "accommodation",
  "gifts",
  "invitation_cards",
  "makeup",
  "music_entertainment",
  "wedding_favors",
  "floral_arrangements",
  "mehndi_artist",
  "priest",
  "honeymoon",
  "miscellaneous",
] as const;

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORY_KEYS)[number];
