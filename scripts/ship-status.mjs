// scripts/ship-status.mjs
const [,, phase, tag, commit] = process.argv;
console.log(`[SHIP] Status ping: phase=${phase}, tag=${tag}, commit=${commit}`);