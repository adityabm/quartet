import type { Suit, Rank, CardId } from '../constants.js';

export interface Card {
  readonly id: CardId;
  readonly rank: Rank;
  readonly suit: Suit;
}

export const createCardId = (rank: Rank, suit: Suit): CardId => `${rank}-${suit}`;