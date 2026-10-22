/**
 * pdf.js 6.x calls a few ES2026 Uint8Array helpers (`toHex`, `fromBase64`,
 * `toBase64`) that older embed runtimes (Electron/Chromium < 133) do not ship
 * yet. Without them every PDF parse fails inside the worker with
 * "a.toHex is not a function" during document fingerprinting.
 *
 * This dependency-free shim installs only the helpers pdf.js actually uses,
 * and only when the runtime lacks them. The same source string runs on the
 * main thread and is prepended to the pdf.js worker script, because a Worker
 * has its own global realm that window-side polyfills never reach.
 *
 * Keep this a plain string: it must stay valid as both JavaScript source and
 * worker concatenation input.
 */
export const PDFJS_COMPAT_SHIM = `(function () {
  'use strict';
  var U8 = Uint8Array;
  if (typeof U8.prototype.toHex !== 'function') {
    Object.defineProperty(U8.prototype, 'toHex', {
      value: function () {
        var out = '';
        for (var i = 0; i < this.length; i++) {
          out += this[i].toString(16).padStart(2, '0');
        }
        return out;
      },
      writable: true,
      configurable: true
    });
  }
  if (typeof U8.fromBase64 !== 'function') {
    U8.fromBase64 = function (input) {
      var binary = atob(input);
      var bytes = new U8(binary.length);
      for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    };
  }
  if (typeof U8.prototype.toBase64 !== 'function') {
    Object.defineProperty(U8.prototype, 'toBase64', {
      value: function () {
        var binary = '';
        for (var i = 0; i < this.length; i++) {
          binary += String.fromCharCode(this[i]);
        }
        return btoa(binary);
      },
      writable: true,
      configurable: true
    });
  }
})();`;

/** Installs the compat helpers in the current realm (main thread). */
export function ensurePdfjsCompat(): void {
  new Function(PDFJS_COMPAT_SHIM)();
}
