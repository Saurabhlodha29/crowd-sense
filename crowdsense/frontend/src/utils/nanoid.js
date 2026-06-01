// frontend/src/utils/nanoid.js
export const nanoid = (n = 10) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => b.toString(36))
    .join("")
    .slice(0, n);