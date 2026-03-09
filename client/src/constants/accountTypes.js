export const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'emoney', label: 'e-money' },
  { value: 'crypto_wallet', label: 'Crypto Wallet' },
  { value: 'lend', label: 'Lend' },
  { value: 'loan', label: 'Loan' },
  { value: 'borrow', label: 'Borrow' },
];

export const accountTypeLabel = (value) =>
  ACCOUNT_TYPES.find((t) => t.value === value)?.label || value || '';