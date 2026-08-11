# NetworkPeer — Linux Laptop Quickstart (Tomorrow, 30 min total)

**Status (verified Aug 11 ~06:06 on the Mac):** backend `typecheck` / `lint` / `build` ✅,
21 unit tests ✅, funded atomic-acceptance E2E ✅ (create → fund → signed webhook → POSTED →
two workers race → exactly one 200 / one 409), live boot on port 3000 ✅
(`/live`, `/health` → database + postgis true), real OTP → login → protected route ✅,
frontend dev server serves on 8080 ✅, S3 bucket `networkpeer-v1` reachable with versioning ✅
(presigned POST signs correctly; one-time IAM fix below).

The Linux laptop **never runs the app** — it only opens URLs in a browser. Nothing to install.

---

## Step 0 — Pick your path (30 seconds)

| Situation | Path |
| --- | --- |
| Mac can be online tomorrow (at home or office) | **Path A** — tunnel from Mac, browser on Linux. 15 min prep tonight, zero cloud accounts |
| Mac cannot be present/online in the office | **Path B** — full cloud deploy (`docs/DEPLOY_CLOUD_LINUX_ONLY.md`), 2–4 h, tonight |

> If in doubt: do **Path A tonight**. If the tunnel gets blocked tomorrow, fall back to the
> phone-hotspot trick (§5) — still zero Linux setup.

---

## Step 1 — Tonight on the Mac (15 min)

### 1a. One-time S3 fix (2 min, only if you want the evidence step to work)
The demo IAM user is missing 3 actions and the docs had 2 wrong names. **Where to make the
change:** AWS Console → IAM → Users → `networkpeer-demo` → **Permissions** → **Add
permissions** → **Create inline policy** → **JSON** tab → paste the policy below → Next →
Create policy. (Can't be done from the Mac — no aws CLI, and this user can't edit its own
policy. Bucket name is `networkpeer-v1`.)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:PutObjectTagging",
        "s3:GetBucketVersioning",
        "s3:GetBucketPublicAccessBlock",
        "s3:GetEncryptionConfiguration",
        "s3:PutBucketCORS"
      ],
      "Resource": ["arn:aws:s3:::networkpeer-v1", "arn:aws:s3:::networkpeer-v1/*"]
    }
  ]
}
```

Then verify everything (sets CORS for `http://localhost:8080` too):

```sh
cd /Users/adityasharma/Desktop/NETWORKPEER/NetworkPeer-main
node scripts/verify-s3-setup.mjs
```

All checks should be ✅. (No AWS access? Skip — demo still works; just say "S3 is wired but
we skipped it for time" if evidence is asked about.)

### 1b. Start the public demo (keeps running until you stop it)
```sh
cd /Users/adityasharma/Desktop/NETWORKPEER/NetworkPeer-main
./scripts/start-demo.sh --public
```
It builds, migrates, starts the API on 3000 + frontend on 8080, and prints two public URLs:
- **API tunnel** (`https://…trycloudflare.com`) and **frontend tunnel**
  (copy BOTH — the script wires them together).

Keep the Mac awake, plugged in, on a network that allows HTTPS outbound.
**Do not restart the tunnels** — the URLs change every run.

### 1c. Test it once from the Mac first
Open the **frontend tunnel URL** in a normal + incognito window. If the boss-demo flow
(§3) works here, it works identically on the Linux laptop.

---

## Step 2 — Tomorrow on the Linux laptop (browser only, 5 min)

1. Open the **frontend tunnel URL** in a normal window (this is the *client*).
2. Open the **same URL in an incognito/private window** (this is the *worker*).
3. That's the whole install. No Node, no Docker, no accounts.

Corporate network notes: needs HTTPS outbound (normally allowed). If the page won't load,
see §5 fallbacks — do **not** spend meeting time debugging the corporate proxy.

---

## Step 3 — The boss demo (10 min, identical on Mac and Linux)

1. **Home** — animated gradient wordmark, drifting blobs, 3D-tilt demo card (hover it),
   scroll-reveal sections.
2. **Sign in** — client in the normal window, worker in incognito (`/auth`, role Worker).
   With Twilio on, the OTP arrives by **real SMS** (use numbers verified in the Twilio
   console; trial accounts only send to verified numbers). Console mode shows it on the
   verify screen instead.
3. **Verify the worker** (one time, on the Mac — incognito isn't admin-verifiable from Linux):
   ```sh
   cd /Users/adityasharma/Desktop/NETWORKPEER/NetworkPeer-main
   docker exec networkpeer-postgis psql -U postgres -d networkpeer -f scripts/provision-admin.sql
   docker exec networkpeer-postgis psql -U postgres -d networkpeer \
     --set=admin_phone="+1CLIENT-PHONE" --set=worker_phone="+1WORKER-PHONE" <<'SQL'
   SELECT public.admin_set_worker_verification(
     (SELECT id FROM public.users WHERE phone_number = :'admin_phone'),
     (SELECT id FROM public.users WHERE phone_number = :'worker_phone'),
     'VERIFIED', TRUE, 'Verified for live demonstration');
   SQL
   ```
4. **Client dashboard** — five stat cards with large labels/numbers.
5. **Create a job** (`/client/jobs/new`) — checklist count `3` → three task boxes appear;
   map-pick a location (search "Connaught Place, New Delhi" or tap the map); budget `500`;
   **Post job** (status `FUNDING`, hidden from workers).
6. **Fund escrow** — click it, copy `operationId` + `providerReference`, then on the Mac:
   ```sh
   cd /Users/adityasharma/Desktop/NETWORKPEER/NetworkPeer-main
   node scripts/simulate-payment-webhook.mjs <operationId> <providerReference>
   ```
   Refresh → job becomes **POSTED** (this is what Stripe's webhook does).
7. **Worker accepts** (incognito) — nearby list shows it (client identity hidden) → Accept →
   private details. Optional wow-factor: a second incognito window accepting simultaneously —
   exactly one succeeds.
8. **Live task** — EN ROUTE → AT LOCATION → IN PROGRESS.
9. **Evidence** — capture/select photos → uploads to S3 → confirmed → **Submit** (needs §1a).
10. **Client approves** → worker wallet shows full payout, **no platform fee**.
11. **Realtime** — with both windows open, watch the notification bell + toast in the other.

---

## Step 4 — Files to ship to the office laptop (final verdict)

Email or Teams-message **these three things** (nothing else — no code, no repos):

1. `docs/EXECUTIVE_PRESENTATION_AND_DEPLOYMENT_GUIDE.docx` — demo script + talking points
   (`.md` version too if email accepts it).
2. `docs/NETWORKPEER_COMPLETE_GUIDE.docx` — full technical breakdown for hard questions.
3. The two URLs from §1b (frontend tunnel + `/dev/settle-funding` note if on Path B).
4. Optional: this quickstart (`LINUX_TOMORROW_QUICKSTART.md` / `.docx`) so they can follow
   the demo script themselves.

**Never ship secrets:** Twilio SID/token, AWS keys, and `.env` stay on the Mac (or in the
cloud platform's env vars for Path B) — the office laptop only ever opens URLs.

**Do not ship:** the codebase, `.env`, Docker, npm packages, or any install instructions —
the office machine only opens links. Send the URLs in the same message as the meeting link.

---

## Step 5 — Fallbacks if the tunnel is blocked tomorrow

1. **Phone hotspot on the Mac** — switch the Mac to the phone's hotspot, re-run
   `./scripts/start-demo.sh --public`, use the new URLs. (URLs change — send again.)
2. **Mac is present in the office** — `./scripts/start-demo.sh` (no `--public`) and demo
   straight from the Mac's browser; Linux laptop not needed.
3. **Cloud path** — `docs/DEPLOY_CLOUD_LINUX_ONLY.md` (Railway + Vercel + browser
   funding-settler at `/dev/settle-funding`). Only if there's 2–4 h tonight.

---

## Quick reference

```sh
./scripts/start-demo.sh [--public]   # start everything (+ tunnels, prints URLs)
./scripts/stop-demo.sh               # stop everything
curl http://localhost:3000/api/v1/live      # API
curl http://localhost:3000/api/v1/health    # DB + PostGIS
node scripts/simulate-payment-webhook.mjs <operationId> <providerReference>  # settle funding
node scripts/verify-s3-setup.mjs     # S3 readiness + CORS (see §1a)
```

Known limits to be honest about: admin screens are prototypes; browser push (FCM) isn't
wired. OTP is real SMS via Twilio (trial accounts only deliver to verified numbers); in
console mode it's echoed on the verify screen instead.
