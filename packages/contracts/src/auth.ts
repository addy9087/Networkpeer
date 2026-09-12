export interface EmailOtpChallenge {
  id: string;
  email: string;
  codeHash: string;        // never store the raw code
  expiresAt: string;       // issuedAt + 5–10 minutes
  attempts: number;        // for rate limiting / lockout
  consumedAt?: string;
}

export interface EmailOtpRequestInput {
  email: string;
  role?: "CLIENT" | "WORKER";
}

export interface EmailOtpVerifyInput {
  email: string;
  otp: string;
  challenge_id?: string;
  full_name?: string;
  mobile_number?: string;
}
