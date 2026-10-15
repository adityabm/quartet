/**
 * Phase state machine — sesuai PROJECT_OVERVIEW §6.
 * Enforceable via discriminated union sehingga transisi invalid error di compile time.
 */
export const GAME_PHASES = [
  'lobby',
  'dealing',
  'turn',
  'bluff_window',
  'resolve',
  'game_over',
] as const;
export type GamePhase = (typeof GAME_PHASES)[number];
