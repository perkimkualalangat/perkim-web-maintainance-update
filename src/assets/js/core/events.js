/* ============================================================
   EVENTS.JS — Simple Event Bus
   ============================================================ */

const listeners = new Map();

/**
 * Daftar pendengar acara
 * @param {string} event - Nama acara
 * @param {Function} callback - Fungsi callback
 * @returns {Function} Fungsi untuk membatalkan pendaftaran
 */
export function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  // Return unsubscribe function
  return () => off(event, callback);
}

/**
 * Batalkan pendaftaran pendengar
 */
export function off(event, callback) {
  if (listeners.has(event)) {
    listeners.get(event).delete(callback);
  }
}

/**
 * Emit acara ke semua pendengar
 */
export function emit(event, data) {
  if (listeners.has(event)) {
    listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[Events] Ralat dalam pendengar ${event}:`, error);
      }
    });
  }
}

/**
 * Emit sekali sahaja (auto-unsubscribe)
 */
export function once(event, callback) {
  const wrapper = (data) => {
    off(event, wrapper);
    callback(data);
  };
  return on(event, wrapper);
}

/**
 * Clear semua pendengar untuk acara
 */
export function clear(event) {
  if (event) {
    listeners.delete(event);
  } else {
    listeners.clear();
  }
}

/* ============================================================
   EKSPORT
   ============================================================ */
export const events = { on, off, emit, once, clear };