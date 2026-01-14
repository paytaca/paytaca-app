// Named exports
export { cardApi } from "./api";
export { createCard, fetchCard, getCardBalance } from "./card";
export { getChallenge, verifyChallenge } from "./auth";
export { createNFTs, mutateNFTs, fetchAuthNFTs } from "./nft";

// Default export as object for convenience (import cardBackend from './backend')
import { cardApi } from "./api";
import { createCard, fetchCard, getCardBalance } from "./card";
import { getChallenge, verifyChallenge } from "./auth";
import { createNFTs, mutateNFTs, fetchAuthNFTs } from "./nft";

export default {
  cardApi,
  createCard,
  fetchCard,
  getCardBalance,
  getChallenge,
  verifyChallenge,
  createNFTs,
  mutateNFTs,
  fetchAuthNFTs
};