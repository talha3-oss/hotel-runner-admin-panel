// Every price in the dashboard goes through here. Amounts are stored as plain
// numbers with no currency attached and there is no conversion anywhere, so the
// code below is a label, not a conversion — changing it would misstate prices
// rather than convert them.
export const CURRENCY = "JOD";

// Whole dinars. Rates are quoted and charged in round numbers.
export const formatMoney = (value: number | null | undefined) =>
  `${CURRENCY} ${Math.round(Number(value || 0))}`;

// Two decimals, for figures read against a bank statement — revenue totals and
// payment records.
export const formatMoneyExact = (value: number | null | undefined) =>
  `${CURRENCY} ${new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))}`;

// Compact, for chart axis ticks where space is tight.
export const formatMoneyAxis = (value: number) =>
  `${CURRENCY} ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`;
