# Private draw-night digest

Operator-only email. There is no public signup. The list is one address: yours. It is stored only in GitHub Actions secrets, never in this repo.

The same Resend API key can also send [Write the desk](DESK.md) mail from the Worker (`DESK_TO_EMAIL`). That is a different inbox path. This file is the private draw-night letter only.

The job builds the same Ladder #1–#3 the site shows (Powerball, Mega Millions, Hit 5, Lotto), plus the national EV call (skip / entertain / rare plus) using 37% federal tax, 0% Washington state tax, and a 20% birthday-share sketch. Copy follows [CLAIMS.md](CLAIMS.md) and [STYLE.md](STYLE.md): scored replay of the past, same hit odds, no em dashes.

The public sibling is [`/recap`](https://www.jackpotdesk.com/recap). Latest recap is the default page. Dated copies live at `/recap/YYYY-MM-DD`. The recap publishes at 5:00 a.m. Pacific daily (`deploy.yml`, 12:00 UTC while PDT). This digest stays at 10:00 a.m. Pacific. Same official data libraries (`scripts/lib/deskLetter.ts`), not the same cron. The digest is tonight’s #1–#3 in one inbox. The recap is last night’s official results versus last night’s Ladder #1–#3, plus tonight’s EV call, plus a link to the live Ladder. It does not publish tonight’s #1. `deploy.yml` generates the page during the Pages build and writes it into the live site. No human merge per morning. If the letter and the site disagree, the site is source of truth.

## You are subscriber #1

1. Create a free [Resend](https://resend.com) account with the inbox you want the digest in.
2. Copy an API key.
3. In this GitHub repo: **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
| --- | --- |
| `RESEND_API_KEY` | `re_...` |
| `DIGEST_TO_EMAIL` | the inbox from step 1 |
| `DIGEST_FROM` | optional. Leave unset to use Resend’s test sender `JackpotDesk <beth.t@example.com>`, which can only deliver to the Resend account email. After you verify `jackpotdesk.com`, set this to `JackpotDesk <desk@jackpotdesk.com>`. |

4. **Actions → Draw-night digest → Run workflow** once. You should get the first letter the same morning.
5. After that it runs daily at 10:00 a.m. Pacific.

Local preview (no send):

```bash
npm run digest:dry
```

Local send, after you export the same secrets in your shell:

```bash
npm run digest
```

## What the letter is (and is not)

Is: a write-up of what the desk would show you if you opened the site before the evening draws. Boards, scores, crowd chips, EV call, links back to the live ladder.

Is not: winning numbers, a forecast, or a second ranking. If #1 on the email disagrees with #1 on the site, the site is source of truth (live NY / CA feeds vs the commit the Action checked out).

Do not forward the letter as a tip sheet. The ladder is public; blasting #1 is how you manufacture the crowded ticket Desk pick exists to avoid.

## Later

A public signup is a Phase 1 product (see [BUSINESS.md](BUSINESS.md)), not this file. Until then do not add a form, a Mailchimp embed, or a second address in the workflow. Extra recipients mean extra crowded #1s.
