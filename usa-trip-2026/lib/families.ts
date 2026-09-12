export const FAMILY_CODES = ["SERINO", "GIANNELLA", "DICUONZO", "CAFAGNA"] as const;
export type FamilyCode = (typeof FAMILY_CODES)[number];
