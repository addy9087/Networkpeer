-- Revision 5 Migration 041: Add email_otp_challenges and eligible_roles for correctionist gating
-- Enforces §12 (email OTP challenges), §21 (mandatory identity fields), §22 (correctionist gating)

ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS eligible_roles TEXT[] NOT NULL DEFAULT ARRAY['collectionist']::TEXT[];

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.email_otp_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_challenges_email
  ON public.email_otp_challenges(email);

CREATE INDEX IF NOT EXISTS idx_email_otp_challenges_active
  ON public.email_otp_challenges(email, expires_at)
  WHERE consumed_at IS NULL;
