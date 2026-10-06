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

## Where this fits in the Citizen Bank ecosystem

Citizen Bank is four hosts backed by six repositories, all deployed on Vercel. A person signs in once on the website; the website hands them to banking with a one-time signed token, so the banking apps never see the website's session. The full map is in [`docs/ECOSYSTEM.md`](https://github.com/citizen-bnk/CitizenBankWebsite/blob/claude/practical-volta-tqe0qk/docs/ECOSYSTEM.md) in the website repository.

| Host | Role | Repository |
|---|---|---|
| `citizenbank.co.ls` | Website, and for now the Citizen Hub for investors, board and back office | [CitizenBankWebsite](https://github.com/citizen-bnk/CitizenBankWebsite) |
| `hub.citizenbank.co.ls` | Citizen Hub frontend (to be split from the website) | [citizen-hub](https://github.com/citizen-bnk/citizen-hub) |
| `banking.citizenbank.co.ls` | Internet banking, desktop | [CitizenInternetBanking](https://github.com/citizen-bnk/CitizenInternetBanking) **(this repository)** |
| `app.citizenbank.co.ls` | Mobile banking app (PWA) | [CitizenBankApp](https://github.com/citizen-bnk/CitizenBankApp) |
| `(API only)` | Bank Core: the ledger and the rules | [CitizenBankCore](https://github.com/citizen-bnk/CitizenBankCore) |
| `(shared code)` | Person model, token handling, shared types | [citizen-platform](https://github.com/citizen-bnk/citizen-platform) |

_Status: the sign-in handoff between the website and banking is on the `claude/demo-sso` branches (and the website's pull request) and is not on `main` yet._

## Deploy on Vercel

1. Deploy **CitizenBankCore** first.
2. Import this repo in Vercel and set `CORE_API_URL=https://<your-core>.vercel.app`.
3. Deploy, then add this site's URL to Core's `ALLOWED_ORIGINS`.

## Sign-in through the Citizen Bank website

People can enter three ways: **explore** with one tap (a limited experience; products and payments ask only for the missing verification), **unlock with a passkey**, or **sign in with their Citizen account** on the website. Set `NEXT_PUBLIC_SIGN_IN_URL` to the website's sign-in page to show the third option. After signing in
there, the website's "Open Internet Banking" button opens `/sso?code=...&next=/dashboard`: this server passes the
one-time code to Core (`POST /api/auth/sso`), forwards Core's session cookie and continues to `next` (a path on this
site only). A refused or expired code returns to `/login` with an explanation. The code is valid once for 60 seconds.
Core must have `PLATFORM_JWKS_URL` and `PLATFORM_ISSUER` set. The call to Core is server to server, so this host does
not need to be in Core's `ALLOWED_ORIGINS` for it. `NEXT_PUBLIC_DEMO_BANNER` shows a small label on every page.
Run `npm test` for the tests.

## Local development

On Windows PowerShell, run against the existing demo backend:

```powershell
npm ci
$env:CORE_API_URL = 'https://citizenbankcore.vercel.app'
npm run dev
```

Citizen AI displays replies and reads them aloud for both typed and spoken requests. Use the speaker
button to mute or enable spoken replies. The speaking animation lasts until audio completes; a new
request interrupts the old reply. ElevenLabs is used when Core is configured, with browser speech as fallback.
Browser voice availability varies by device and language.

`npm test`, `npm run typecheck`, and `npm run build` verify changes. GitHub Actions runs these checks
on pushes and pull requests. The existing Vercel Git integration publishes branch previews and deploys `main`.
Full conversation requires a working `ANTHROPIC_API_KEY` on Core. ElevenLabs requires
`ELEVENLABS_API_KEY` and the appropriate `ELEVENLABS_VOICE_EN`, `_ST`, or `_ZU` voice ID.

```bash
npm install
CORE_API_URL=http://localhost:4000 npm run dev    # opens on :3001
```

> Pre-licensing demonstration by Citizen Digital Ltd (Reg. 99073). Not a licensed bank.
