export type AdminActionResult<T = undefined> =
  { ok: true; message: string; data?: T } | { ok: false; code: string; message: string };
