export type CurrencyOption = { code: string; label: string };

/** MENA currencies, listed roughly by market size. */
export const MENA_CURRENCIES: CurrencyOption[] = [
  { code: "AED", label: "UAE Dirham" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "QAR", label: "Qatari Riyal" },
  { code: "KWD", label: "Kuwaiti Dinar" },
  { code: "BHD", label: "Bahraini Dinar" },
  { code: "OMR", label: "Omani Rial" },
  { code: "EGP", label: "Egyptian Pound" },
  { code: "JOD", label: "Jordanian Dinar" },
  { code: "LBP", label: "Lebanese Pound" },
  { code: "IQD", label: "Iraqi Dinar" },
  { code: "ILS", label: "Israeli New Shekel" },
  { code: "MAD", label: "Moroccan Dirham" },
  { code: "TND", label: "Tunisian Dinar" },
  { code: "DZD", label: "Algerian Dinar" },
  { code: "LYD", label: "Libyan Dinar" },
  { code: "YER", label: "Yemeni Rial" },
  { code: "SDG", label: "Sudanese Pound" },
];

/** Major global currencies, for shoppers outside the MENA region. */
export const GLOBAL_CURRENCIES: CurrencyOption[] = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "INR", label: "Indian Rupee" },
  { code: "TRY", label: "Turkish Lira" },
];

export const ALL_CURRENCIES: CurrencyOption[] = [...MENA_CURRENCIES, ...GLOBAL_CURRENCIES];
export const CURRENCY_CODES: string[] = ALL_CURRENCIES.map((c) => c.code);

/** Sentinel meaning "no preference" — every offer is shown, none highlighted. */
export const ANY_CURRENCY = "ALL";
