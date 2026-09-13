# NetworkPeer Production Mass Rollout & Live Email Delivery Playbook

This document provides the definitive, end-to-end engineering procedures to transition NetworkPeer from development/staging to mass-scale public production.

---

## 1. Live Email OTP Delivery (Zero Simulation, 100% Inbox Delivery)

### A. Provider Options

| Feature | Resend (Recommended for Fast Launch) | AWS SES (Enterprise Scale) |
| :--- | :--- | :--- |
| **Setup Time** | 3 minutes | 15–30 minutes (AWS console + sandbox exit) |
| **Free Tier** | 3,000 emails/month (or 50,000 on Pro) | 62,000/month if sent from EC2 |
| **Cost at Scale** | \$20/month for 50k, \$0.0008/email | \$0.10 per 10,000 emails |
| **DKIM / SPF** | Automatic DNS verification via CNAME | Easy DKIM via Route 53 or external DNS |
| **Region Co-location**| Global CDN | AWS `eu-north-1` (same as ALB) |

---

### B. Option 1: Activating Resend (Fastest, 3 Minutes)

1. **Sign Up & Get API Key**:
   - Navigate to [https://resend.com](https://resend.com) and create an account.
   - Go to **API Keys** -> Click **Create API Key** -> Name it `networkpeer-prod` -> Copy key (`re_...`).

2. **Add & Verify Domain**:
   - Go to **Domains** -> Click **Add Domain** (e.g. `networkpeer.io` or `mail.networkpeer.io`).
   - Add the DNS records provided by Resend to your DNS provider (Cloudflare, Route 53, GoDaddy):
     - **SPF**: `TXT` record `@` with value `v=spf1 include:resend.com ~all`
     - **DKIM**: `CNAME` records (provided in dashboard)
     - **Return-Path / MX**: `feedback-smtp.resend.com`

3. **Configure Environment Variables**:
   In your production environment (`.env` or AWS ECS Task Definition):
   ```bash
   EMAIL_PROVIDER="resend"
   RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxx"
   EMAIL_FROM="NetworkPeers <auth@networkpeer.io>"
   NODE_ENV="production"
   ```
   *Note: In production mode, random 6-digit cryptographic OTPs are dispatched directly to the user's inbox with 10-minute expiry and zero simulation code returned in the API payload.*

---

### C. Option 2: Activating AWS SES (Enterprise Hyper-Scale)

1. **Verify Identity in AWS SES**:
   - Open AWS Console -> Region `eu-north-1` (Stockholm).
   - Go to **Amazon Simple Email Service (SES)** -> **Identities** -> **Create Identity**.
   - Select **Domain** -> Enter `networkpeer.io`.
   - Enable **Easy DKIM** with 2048-bit key size.
   - Click **Create Identity**.

2. **Publish DNS Records**:
   - SES will display 3 `CNAME` records for DKIM. Add them to your DNS manager.
   - Add SPF: `TXT` `@` `v=spf1 include:amazonses.com ~all`.

3. **Exit SES Sandbox (Crucial for Mass Deployment)**:
   - By default, SES accounts are in a sandbox and can only send to verified recipient addresses.
   - Click **Request Production Access** -> State use case (Transactional OTP codes for field worker authentication) -> Response time is usually 2–12 hours.

4. **Configure Environment Variables**:
   ```bash
   EMAIL_PROVIDER="ses"
   AWS_REGION="eu-north-1"
   AWS_SES_FROM_EMAIL="auth@networkpeer.io"
   EMAIL_FROM="NetworkPeers <auth@networkpeer.io>"
   NODE_ENV="production"
   ```

---

### D. Crucial DNS Records for 100% Inbox Deliverability (Avoid Spam Box)

Add the following 3 records to ensure DMARC/SPF/DKIM compliance across Gmail, Apple Mail, and Microsoft Outlook:

1. **SPF (Sender Policy Framework)**:
   - Type: `TXT`
   - Name / Host: `@` (or `networkpeer.io`)
   - Value: `v=spf1 include:resend.com ~all` (or `include:amazonses.com ~all`)

2. **DKIM (DomainKeys Identified Mail)**:
   - Type: `CNAME` (3 records as specified in Resend or SES console)
   - TTL: Auto / 300s

3. **DMARC (Domain-based Message Authentication, Reporting, and Conformance)**:
   - Type: `TXT`
   - Name / Host: `_dmarc`
   - Value: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@networkpeer.io; sp=quarantine; aspf=r; adkim=r`

---

## 2. Mass Production Infrastructure Rollout

### Tier 1: Backend API & Database (AWS ECS Fargate & ALB)

1. **Production Docker Build**:
   ```bash
   cd NetworkPeer-main
   docker build -t 969746120.dkr.ecr.eu-north-1.amazonaws.com/networkpeer-api:latest .
   ```

2. **Push to Amazon ECR**:
   ```bash
   aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 969746120.dkr.ecr.eu-north-1.amazonaws.com
   docker push 969746120.dkr.ecr.eu-north-1.amazonaws.com/networkpeer-api:latest
   ```

3. **Database Migration (PostGIS)**:
   Run the database migration task against your AWS RDS PostgreSQL instance:
   ```bash
   DATABASE_URL="postgresql://db_user:password@prod-db.xxxx.eu-north-1.rds.amazonaws.com:5432/networkpeer?sslmode=require" \
   npm run migrate
   ```

4. **ALB HTTPS / SSL Certificate**:
   - Request a free public certificate in **AWS Certificate Manager (ACM)** for `api.networkpeer.io`.
   - On the Application Load Balancer (`networkpeer-staging-api-alb-969746120.eu-north-1.elb.amazonaws.com`), add an **HTTPS:443 Listener** using this certificate.
   - In Route 53, create an `A` record (Alias to ALB) for `api.networkpeer.io`.

---

### Tier 2: Web Platform Deployment (Vercel)

1. **Prebuilt Production Build**:
   ```bash
   NITRO_PRESET=vercel npx vite build
   vercel deploy --prebuilt --prod --yes
   ```

2. **Custom Domain**:
   - In Vercel Project Settings -> Domains: Add `app.networkpeer.io` or `platform.networkpeer.io`.
   - Vercel automatically issues an SSL certificate via Let's Encrypt.

3. **Environment Variables**:
   Set in Vercel Project Settings:
   - `VITE_API_URL`: `https://api.networkpeer.io/api/v1`
   - `VITE_REALTIME_URL`: `wss://api.networkpeer.io`
   - `NODE_ENV`: `production`

---

### Tier 3: Android Native App (Google Play Store Release Bundle)

1. **Generate Upload Keystore (One-time)**:
   ```bash
   keytool -genkeypair -v -keystore apps/android/networkpeer-release.jks \
     -alias networkpeer -keyalg RSA -keysize 2048 -validity 10000 \
     -dname "CN=NetworkPeer, OU=Mobile, O=NetworkPeer Inc, L=Stockholm, C=SE"
   ```

2. **Generate Release App Bundle (`.aab`)**:
   ```bash
   cd apps/android
   JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=/Users/adityasharma/Library/Android/sdk \
     ./gradlew bundleProductionRelease
   ```
   - Target bundle output: `apps/android/app/build/outputs/bundle/productionRelease/app-production-release.aab`

3. **Google Play Console Release Workflow**:
   - Go to [Google Play Console](https://play.google.com/console).
   - Create Application -> **NetworkPeer: Field Operations & Evidence Verification**.
   - Setup App Integrity (let Google manage app signing keys).
   - Upload `app-production-release.aab` to **Production Track** or **Internal Testing Track**.
   - Complete store listing (Screenshots, Privacy Policy, Categorization: Business/Productivity).
