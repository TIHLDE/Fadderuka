/**
 * Allergies are owned by TIHLDE (Lepton), not our DB. Self-registration collects
 * the allergy while the account is still pending (no TIHLDE token), so we buffer
 * it in the browser under this key and flush it to Lepton on a later
 * authenticated load — see `AllergySync` and `POST /api/profile/allergy`.
 */
export const PENDING_ALLERGY_KEY = "fadderuke.pending_allergy";
