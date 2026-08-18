/**
 * Fit per-number popularity weights from the winner-count archive.
 *
 * Model: each player's board is 5 distinct whites picked roughly proportional
 * to popularity weights w (mean 1) plus one special ball with weights v.
 * For a draw with winning whites W, the expected count in tier "match k" is
 *
 *   E[count] = sales × p_tier × specialFactor × A_k(W)
 *
 * where p_tier is the uniform hypergeometric tier probability and A_k(W) is
 * the popularity multiplier: the average, over k-subsets K of W, of
 * (prod of w in K) × (prod over W\K of the chance that number stayed OFF the
 * board), normalized so uniform weights give exactly 1.
 *
 * Per-draw sales are free exposure parameters (closed-form MLE given weights).
 * Weights are fit by damped diagonal-Newton ascent on the Poisson
 * log-likelihood with a quadratic prior on log w (shrinkage toward uniform).
 * Numbers that were never drawn keep weight 1 — this model only learns from
 * drawn numbers, which is exactly the information winner counts carry.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const inPath = join(ROOT, "src/data/winnerCounts.json");
const outPath = join(ROOT, "src/data/popularity.json");

const MATRICES = {
  powerball: { whiteMax: 69, specialMax: 26 },
  megamillions: { whiteMax: 70, specialMax: 24 },
};

// Tier order must match popularity-scrape.mjs: [whites, needsSpecial].
const TIERS = [
  [5, true],
  [5, false],
  [4, true],
  [4, false],
  [3, true],
  [3, false],
  [2, true],
  [1, true],
  [0, true],
];

const SHRINK = 300; // quadratic prior on log-weights, in curvature units

function choose(n, k) {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

function subsetsOfSize(k) {
  const out = [];
  const pick = (start, acc) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < 5; i++) {
      acc.push(i);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}
const SUBSETS = [0, 1, 2, 3, 4, 5].map(subsetsOfSize);

/** Uniform probability of matching exactly k of 5 whites, N-ball matrix. */
function hyper(k, N) {
  return (choose(5, k) * choose(N - 5, 5 - k)) / choose(N, 5);
}

/**
 * Popularity multiplier A_k and d(log A_k)/d(log w_i) for the 5 drawn whites.
 * q = 5/N is the uniform per-number inclusion rate.
 */
function tierMultiplier(k, drawnW, q) {
  const r = drawnW.map((w) => 1 - q * w); // chance number stayed off the board
  let total = 0;
  const gradIn = [0, 0, 0, 0, 0];
  const gradOut = [0, 0, 0, 0, 0];
  for (const K of SUBSETS[k]) {
    let f = 1;
    const inSet = [false, false, false, false, false];
    for (const i of K) inSet[i] = true;
    for (let i = 0; i < 5; i++) f *= inSet[i] ? drawnW[i] : r[i];
    total += f;
    for (let i = 0; i < 5; i++) {
      if (inSet[i]) gradIn[i] += f;
      else gradOut[i] += f;
    }
  }
  const norm = choose(5, k) * (1 - q) ** (5 - k);
  const grad = drawnW.map(
    (w, i) => (gradIn[i] - ((q * w) / (1 - q * w)) * gradOut[i]) / total,
  );
  return { value: total / norm, grad };
}

function prepareDraws(game, whiteMax, specialMax) {
  const draws = [];
  for (const [date, d] of Object.entries(game.draws)) {
    if (d.n.some((n) => n < 1 || n > whiteMax)) continue;
    if (d.s < 1 || d.s > specialMax) continue;
    draws.push({ date, whites: d.n.map((n) => n - 1), special: d.s - 1, counts: d.c });
  }
  draws.sort((a, b) => (a.date < b.date ? -1 : 1));
  return draws;
}

/**
 * Fit weights on a set of draws. Returns { white, special, logLik } where
 * logLik is the Poisson log-likelihood (up to the c! constant) with per-draw
 * exposures at their MLE.
 */
function fit(
  draws,
  whiteMax,
  specialMax,
  { learn = true, white, special, dispersion = 1 } = {},
) {
  const q = 5 / whiteMax;
  const w = white ? [...white] : new Array(whiteMax).fill(1);
  const v = special ? [...special] : new Array(specialMax).fill(1);
  const pTier = TIERS.map(
    ([k, needS]) => hyper(k, whiteMax) * (needS ? 1 / specialMax : 1 - 1 / specialMax),
  );
  const exposure = new Array(draws.length).fill(0);

  const evaluate = () => {
    // mu per draw/tier, with exposure at closed-form MLE
    let logLik = 0;
    let pearson = 0;
    let cells = 0;
    const details = draws.map((draw, di) => {
      const drawnW = draw.whites.map((i) => w[i]);
      const tiers = TIERS.map(([k, needS], ti) => {
        const { value, grad } = tierMultiplier(k, drawnW, q);
        const sFactor = needS
          ? v[draw.special]
          : (specialMax - v[draw.special]) / (specialMax - 1);
        return { base: pTier[ti] * value * sFactor, grad, needS };
      });
      const totalCounts = draw.counts.reduce((a, b) => a + b, 0);
      const totalBase = tiers.reduce((a, t) => a + t.base, 0);
      exposure[di] = totalCounts / totalBase;
      tiers.forEach((t, ti) => {
        const mu = exposure[di] * t.base;
        const c = draw.counts[ti];
        logLik += c * Math.log(mu) - mu;
        if (mu > 5) {
          pearson += (c - mu) ** 2 / mu;
          cells++;
        }
      });
      return tiers;
    });
    return { logLik, details, pearsonPerDof: cells ? pearson / cells : 1 };
  };

  let result = evaluate();
  if (!learn) {
    return {
      white: w,
      special: v,
      logLik: result.logLik,
      pearsonPerDof: result.pearsonPerDof,
    };
  }

  for (let iter = 0; iter < 250; iter++) {
    // accumulate gradient and curvature in log-weight space
    const gW = new Array(whiteMax).fill(0);
    const hW = new Array(whiteMax).fill(0);
    const gV = new Array(specialMax).fill(0);
    const hV = new Array(specialMax).fill(0);

    draws.forEach((draw, di) => {
      result.details[di].forEach((t, ti) => {
        const mu = exposure[di] * t.base;
        const resid = draw.counts[ti] - mu;
        draw.whites.forEach((wi, pos) => {
          const g = t.grad[pos];
          gW[wi] += (resid * g) / dispersion;
          hW[wi] += (mu * g * g) / dispersion;
        });
        const s = draw.special;
        const gs = t.needS ? 1 : -v[s] / (specialMax - v[s]);
        gV[s] += (resid * gs) / dispersion;
        hV[s] += (mu * gs * gs) / dispersion;
      });
    });

    let maxStep = 0;
    for (let i = 0; i < whiteMax; i++) {
      const prior = -SHRINK * Math.log(w[i]);
      const step = (gW[i] + prior) / (hW[i] + SHRINK + 1);
      const damped = Math.max(-0.2, Math.min(0.2, 0.5 * step));
      w[i] *= Math.exp(damped);
      maxStep = Math.max(maxStep, Math.abs(damped));
    }
    for (let s = 0; s < specialMax; s++) {
      const prior = -SHRINK * Math.log(v[s]);
      const step = (gV[s] + prior) / (hV[s] + SHRINK + 1);
      const damped = Math.max(-0.2, Math.min(0.2, 0.5 * step));
      v[s] = Math.min(specialMax - 0.5, v[s] * Math.exp(damped));
      maxStep = Math.max(maxStep, Math.abs(damped));
    }

    // keep mean weight at 1; overall scale lives in the exposures
    const mw = w.reduce((a, b) => a + b, 0) / whiteMax;
    for (let i = 0; i < whiteMax; i++) w[i] /= mw;
    const mv = v.reduce((a, b) => a + b, 0) / specialMax;
    for (let s = 0; s < specialMax; s++) v[s] /= mv;

    result = evaluate();
    if (maxStep < 1e-5) break;
  }
  return {
    white: w,
    special: v,
    logLik: result.logLik,
    pearsonPerDof: result.pearsonPerDof,
  };
}

const archive = JSON.parse(readFileSync(inPath, "utf8"));
const payload = {
  updated: new Date().toISOString(),
  source: "fit from src/data/winnerCounts.json (California tier winner counts)",
  method:
    "Poisson MLE of per-number pick weights vs observed tier counts; per-draw sales as free exposure; shrinkage toward uniform. Weight 1 = picked at the random-play rate; 1.3 = picked 30% more than random.",
  games: {},
};

for (const [key, { whiteMax, specialMax }] of Object.entries(MATRICES)) {
  const game = archive.games?.[key];
  if (!game) continue;
  const draws = prepareDraws(game, whiteMax, specialMax);
  if (draws.length < 30) {
    console.error(`${key}: only ${draws.length} draws, skipping fit`);
    continue;
  }

  // Two passes: the first estimates overdispersion (player-mix noise draw to
  // draw far exceeds Poisson noise at these counts), the second fits with the
  // evidence scaled down accordingly (quasi-Poisson).
  const pilot = fit(draws, whiteMax, specialMax);
  const dispersion = Math.max(1, pilot.pearsonPerDof);
  const full = fit(draws, whiteMax, specialMax, { dispersion });

  // Temporal holdout: fit on the first 75% of draws, score the last 25%.
  const cut = Math.floor(draws.length * 0.75);
  const train = draws.slice(0, cut);
  const test = draws.slice(cut);
  const model = fit(train, whiteMax, specialMax, { dispersion });
  const testFit = fit(test, whiteMax, specialMax, {
    learn: false,
    white: model.white,
    special: model.special,
  });
  const testUniform = fit(test, whiteMax, specialMax, { learn: false });
  // scale by dispersion so the number reads in "effective" log-lik units
  const gain = (testFit.logLik - testUniform.logLik) / dispersion;

  const round = (x) => Math.round(x * 10000) / 10000;
  payload.games[key] = {
    draws: draws.length,
    from: draws[0].date,
    to: draws[draws.length - 1].date,
    whiteMax,
    specialMax,
    white: full.white.map(round),
    special: full.special.map(round),
    diagnostics: {
      dispersion: Math.round(dispersion * 10) / 10,
      holdoutLogLikGain: Math.round(gain * 10) / 10,
      holdoutDraws: test.length,
    },
  };

  const ranked = full.white
    .map((w, i) => ({ n: i + 1, w }))
    .sort((a, b) => b.w - a.w);
  const show = (list) => list.map((x) => `${x.n}:${x.w.toFixed(3)}`).join(" ");
  console.error(
    `${key}: ${draws.length} draws, dispersion ${dispersion.toFixed(1)}, holdout gain ${gain.toFixed(1)} (positive = beats uniform)`,
  );
  console.error(`  most picked:  ${show(ranked.slice(0, 8))}`);
  console.error(`  least picked: ${show(ranked.slice(-8).reverse())}`);
  const bday = full.white.slice(0, 31).reduce((a, b) => a + b, 0) / 31;
  const high = full.white.slice(31).reduce((a, b) => a + b, 0) / (whiteMax - 31);
  console.error(`  avg weight 1-31: ${bday.toFixed(3)}  |  32-${whiteMax}: ${high.toFixed(3)}`);
}

writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
console.error(`wrote ${outPath}`);
