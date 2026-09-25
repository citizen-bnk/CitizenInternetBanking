# Citizen Bank — Internet Banking

AI-first web banking for Citizen Bank, designed from the *Internet Banking and Mobile App* UI guide, with live data from
[Citizen Bank Core](https://github.com/citizen-bnk/CitizenBankCore).

- **Citizen AI mode** (`/`): the orb assistant centre stage, with voice or text input, suggestion cards and a
  My Accounts panel. Actions the AI prepares open the matching form, pre-filled, for you to review.
- **Classic Banking** (`/dashboard`): balance cards, quick actions, accounts, recent transactions, feature tiles and a
  docked Citizen Bank AI chat.
- **Collapsible sidebar**: collapses to icons (remembered per browser). On small screens it becomes a slide-out drawer.
- **Transfers**: Citizen to Citizen, Local Bank, International and Own Account, with a Review Transfer step, fees,
  optional scheduling and a receipt.
- **Payments Hub**: bill categories, billers, airtime, recent payments, and scheduled/recurring payments.
- **Cards**: freeze/unfreeze, limits, details, lost/stolen blocking, and card orders.
- **Insights, Loans** (calculator for all five products), **Settings** (language, theme, security, branch finder),
  and printable/CSV **statements**.

## Deploy on Vercel

1. Deploy **CitizenBankCore** first.
2. Import this repo in Vercel and set `CORE_API_URL=https://<your-core>.vercel.app`.
3. Deploy, then add this site's URL to Core's `ALLOWED_ORIGINS`.

## Local development

```bash
npm install
CORE_API_URL=http://localhost:4000 npm run dev    # opens on :3001
```

> Pre-licensing demonstration by Citizen Digital Ltd (Reg. 99073). Not a licensed bank.
