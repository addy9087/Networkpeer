// packages/contracts/src/profile.ts — extends WorkerProfile / ClientProfile
export interface IdentityFields {
  fullName: string;      // required, min length 2, no longer nullable
  mobileNumber: string;  // required, format-validated (E.164-ish), still unverified
  mobileVerified: false; // always false in this revision — see §12
}

export interface UserProfileResponse {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  mobileNumber: string;
  mobileVerified: false;
  role: "CLIENT" | "WORKER" | "ADMIN";
  avatarUrl?: string | null;
  isActive: boolean;
  isVerified: boolean;
  eligibleRoles?: string[];
}
