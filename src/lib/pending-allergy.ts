/**
 * Self-registration collects the allergy before the session exists, so we buffer
 * it in the browser under this key and flush it on a later authenticated load —
 * see `AllergySync` and `POST /api/profile/allergy`.
 *
 * The allergy used to be owned by TIHLDE and written back over the API. It is
 * kept in our own DB now: Photon models allergies as a fixed list of slugs, and
 * free text like "laktose, litt nøtter" has nowhere to go in that.
 */
export const PENDING_ALLERGY_KEY = "fadderuke.pending_allergy";
