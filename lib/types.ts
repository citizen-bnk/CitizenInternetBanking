export type Account = {
  id: string; name: string; type: "CURRENT" | "SAVINGS" | "FIXED_DEPOSIT"; number: string; last4: string;
  currency: string; balance: string; status: string; interestRate: string | null; maturesAt: string | null;
};
export type Card = {
  id: string; label: string; last4: string; brand: string; kind: "DEBIT" | "CREDIT" | "CRYPTO"; form: "VIRTUAL" | "PHYSICAL";
  expiry: string; status: "ACTIVE" | "FROZEN" | "BLOCKED" | "ORDERED"; dailyLimit: string; monthlyLimit: string; accountId: string | null;
};
export type Beneficiary = { id: string; name: string; type: "CITIZEN" | "LOCAL" | "INTERNATIONAL"; bankName: string; accountLast4: string; country: string | null };
export type Biller = { id: string; code: string; name: string; category: string; refLabel: string; isAirtime: boolean };
export type Scheduled = {
  id: string; description: string; amount: string; frequency: string; nextRunAt: string; active: boolean;
  fromAccountId: string; beneficiaryId: string | null; billerId: string | null; lastError: string | null;
};
export type Loan = {
  id: string; type: string; principal: string; interestRate: string; termMonths: number; outstanding: string;
  monthlyPayment: string; nextPaymentDate: string; status: string;
};
export type Entry = {
  id: string; amount: string; balanceAfter: string; narrative: string; createdAt: string; accountId: string;
  accountName: string; type: string; reference: string; status: string;
};
export type Country = { code: string; name: string; currency: string; rate: number };
export type Overview = {
  user: { id: string; firstName: string; lastName: string; email: string; phone: string | null; preferredLanguage: string; preferredTheme: string; roles: string[] };
  accounts: Account[]; cards: Card[]; beneficiaries: Beneficiary[]; billers: Biller[]; scheduled: Scheduled[]; loans: Loan[];
  recent: Entry[]; unreadNotifications: number;
  fees: { localTransferCents: number; intlPercent: number; intlMinCents: number };
  localBanks: string[]; crossBorderCountries: Country[]; dailyLimit: number;
  locale: { country: string; localCurrency: string; rate: number | null };
};
