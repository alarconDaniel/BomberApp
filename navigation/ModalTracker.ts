// navigation/ModalTracker.ts
let dismissedAt = 0;

export function markModalClosed() {
    dismissedAt = Date.now();
}

/** true si se cerró un modal hace muy poco (gesto/back/botón). */
export function wasModalClosedRecently(windowMs = 400) {
    return Date.now() - dismissedAt < windowMs;
}
