export const ERROR_CODES = [
  'invalid_action', // action shape invalid
  'not_your_turn', // action from non-current player
  'invalid_target', // targetId not in game / target self / etc
  'invalid_rank', // rank not valid or already quartet
  'no_bluff_window', // bluff.call when no window active
  'rate_limited', // too many actions
  'room_not_found', // code tidak ditemukan
  'room_full', // max players reached
  'room_already_started', // join saat game in progress
  'name_taken', // duplicate name in room
  'name_invalid', // empty / too long / contains blocked word
  'internal_error', // unexpected server error
  'unauthorized', // session invalid
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
