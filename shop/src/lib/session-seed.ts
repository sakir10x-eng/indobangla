// A random seed created once per full page load. It survives SPA navigation
// (module state persists) so going into a product and pressing Back shows the
// SAME shuffled set, but a real browser reload starts a fresh JS context and a
// new seed — so every reload feels fresh.
let SEED = 0;

export function sessionSeed(): number {
  if (!SEED) {
    SEED = Math.floor(Math.random() * 100000) + 1;
  }
  return SEED;
}
