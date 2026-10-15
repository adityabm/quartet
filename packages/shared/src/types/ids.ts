/**
 * Branded ID types — mencegah salah-pakai antara string ID yang beda domain
 * (mis. PlayerId dipakai di tempat RoomCode) di compile time.
 * `_brand` sengaja tidak di-export → type opaque di luar modul ini.
 */
declare const _brand: unique symbol;
type Brand<T, B> = T & { readonly [_brand]: B };

export type PlayerId = Brand<string, 'PlayerId'>;
export type GameId = Brand<string, 'GameId'>;
export type RoomCode = Brand<string, 'RoomCode'>; // 6 char alphanumeric uppercase
export type ActionId = Brand<string, 'ActionId'>;

/**
 * Helper casting — satu-satunya tempat `as` brand cast diizinkan.
 * Selalu dipakai saat boundary parsing (WS payload / DB row).
 */
export const asPlayerId = (s: string): PlayerId => s as PlayerId;
export const asGameId = (s: string): GameId => s as GameId;
export const asRoomCode = (s: string): RoomCode => s as RoomCode;
export const asActionId = (s: string): ActionId => s as ActionId;
