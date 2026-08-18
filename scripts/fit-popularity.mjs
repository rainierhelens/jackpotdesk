/**
 * Fit per-number popularity weights from the winner-count archives.
 *
 * Model: each player's board is `pick` distinct numbers chosen roughly
 * proportional to popularity weights w (mean 1), plus — for national games —
 * one special ball with weights v. For a draw with winning numbers W, the
 * expected count in tier "match k" is
 *
 *   E[count] = sales × p_tier × specialFactor × A_k(W)
 *
 * where p_tier is the uniform hypergeometric tier probability and A_k(W) is
 * the popularity multiplier: the average, over k-subsets K of W, of
 * (prod of w in K) × (prod over W\K of the chance that number stayed OFF the
 * board), normalized so uniform weights give exactly 1.
 *
 * Per-draw sales are free exposure parameters (closed-form MLE given weights).
 * Weights are fit by damped diagonal-Newton ascent on a quasi-Poisson
 * log-likelihood (dispersion estimated from a pilot fit, because player-mix
 * noise between draws far exceeds counting noise) with a quadratic prior on
 * log w (shrinkage toward uniform).
 *
 * Cash Pop (1 number from 15) needs no model: the winner total per draw is a
 * direct read of how many players picked the drawn number.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const nationalPath = join(ROOT, "src/data/winnerCounts.json");
const waPath = join(ROOT, "src/data/waWinnerCounts.json");
const outPath = join(ROOT, "src/data/popularity.json");

const SHRINK = 300; // quadratic prior on log-weights, in curvature units

// National tier order matches popularity-scrape.mjs.
const NATIONAL_TIERS = [
  { k: 5, needS: true },
  { k: 5, needS: false },
  { k: 4, needS: true },
  { k: 4, needS: false },
  { k: 3, needS: true },
  { k: 3, needS: false },
  { k: 2, needS: true },
  { k: 1, needS: true },
  { k: 0, needS: true },
];

const NATIONAL = {
  powerball: { poolMax: 69, pick: 5, specialMax: 26, tiers: NATIONAL_TIERS },
  megamillions: { poolMax: 70, pick: 5, specialMax: 24, tiers: NATIONAL_TIERS },
};

const WA_MATRIX = {
  hit5: { poolMax: 42, pick: 5, tiers: [5, 4, 3, 2] },
  lotto: { poolMax: 49, pick: 6, tiers: [6, 5, 4, 3] },
  match4: { poolMax: 24, pick: 4, tiers: [4, 3, 2] },
};

function choose(n, k) {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

const subsetCache = new Map();
function subsetsOfSize(k, m) {
  const key = `${m}:${k}`;
  const hit = subsetCache.get(key);
  if (hit) return hit;
  const out = [];
  const pick = (start, acc) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < m; i++) {
      acc.push(i);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  subsetCache.set(key, out);
  return out;
}

/** Uniform probability that a `pick`-board matches exactly k of the draw. */
function hyper(k, N, pick) {
  return (choose(pick, k) * choose(N - pick, pick - k)) / choose(N, pick);
}

/**
 * Popularity multiplier A_k and d(log A_k)/d(log w_i) for the drawn numbers.
 * q = pick/N is the uniform per-number inclusion rate.
 */
function tierMultiplier(k, drawnW, q, pick) {
  const r = drawnW.map((w) => 1 - q * w); // chance number stayed off the board
  let total = 0;
  const gradIn = new Array(pick).fill(0);
  const gradOut = new Array(pick).fill(0);
  const inSet = new Array(pick);
  for (const K of subsetsOfSize(k, pick)) {
    inSet.fill(false);
    for (const i of K) inSet[i] = true;
    let f = 1;
    for (let i = 0; i < pick; i++) f *= inSet[i] ? drawnW[i] : r[i];
    total += f;
    for (let i = 0; i < pick; i++) {
      if (inSet[i]) gradIn[i] += f;
      else gradOut[i] += f;
    }
  }
  const norm = choose(pick, k) * (1 - q) ** (pick - k);
  const grad = drawnW.map(
    (w, i) => (gradIn[i] - ((q * w) / (1 - q * w)) * gradOut[i]) / total,
  );
  return { value: total / norm, grad };
}

/**
 * Fit weights on prepared draws ({ whites: 0-based, special: 0-based | -1,
 * counts }). cfg = { poolMax, pick, specialMax (0 = none), tiers }.
 */
function fit(draws, cfg, { learn = true, white, special, dispersion = 1 } = {}) {
  const { poolMax, pick, specialMax, tiers } = cfg;
  const q = pick / poolMax;
  const w = white ? [...white] : new Array(poolMax).fill(1);
  const v = special ? [...special] : new Array(Math.max(specialMax, 1)).fill(1);
  const pTier = tiers.map(({ k, needS }) => {
    const base = hyper(k, poolMax, pick);
    if (!specialMax) return base;
    return base * (needS ? 1 / specialMax : 1 - 1 / specialMax);
  });
  const exposure = new Array(draws.length).fill(0);

  const evaluate = () => {
    let logLik = 0;
    let pearson = 0;
    let cells = 0;
    const details = draws.map((draw, di) => {
      const drawnW = draw.whites.map((i) => w[i]);
      const rows = tiers.map(({ k, needS }, ti) => {
        const { value, grad } = tierMultiplier(k, drawnW, q, pick);
        const sFactor = !specialMax
          ? 1
          : needS
            ? v[draw.special]
            : (specialMax - v[draw.special]) / (specialMax - 1);
        return { base: pTier[ti] * value * sFactor, grad, needS };
      });
      const totalCounts = draw.counts.reduce((a, b) => a + b, 0);
      const totalBase = rows.reduce((a, t) => a + t.base, 0);
      exposure[di] = totalCounts / totalBase;
      rows.forEach((t, ti) => {
        const mu = exposure[di] * t.base;
        const c = draw.counts[ti];
        logLik += c * Math.log(mu) - mu;
        if (mu > 5) {
          pearson += (c - mu) ** 2 / mu;
          cells++;
        }
      });
      return rows;
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
    const gW = new Array(poolMax).fill(0);
    const hW = new Array(poolMax).fill(0);
    const gV = new Array(v.length).fill(0);
    const hV = new Array(v.length).fill(0);

    draws.forEach((draw, di) => {
      result.details[di].forEach((t, ti) => {
        const mu = exposure[di] * t.base;
        const resid = draw.counts[ti] - mu;
        draw.whites.forEach((wi, pos) => {
          const g = t.grad[pos];
          gW[wi] += (resid * g) / dispersion;
          hW[wi] += (mu * g * g) / dispersion;
        });
        if (specialMax) {
          const s = draw.special;
          const gs = t.needS ? 1 : -v[s] / (specialMax - v[s]);
          gV[s] += (resid * gs) / dispersion;
          hV[s] += (mu * gs * gs) / dispersion;
        }
      });
    });

    let maxStep = 0;
    for (let i = 0; i < poolMax; i++) {
      const prior = -SHRINK * Math.log(w[i]);
      const step = (gW[i] + prior) / (hW[i] + SHRINK + 1);
      const damped = Math.max(-0.2, Math.min(0.2, 0.5 * step));
      w[i] *= Math.exp(damped);
      maxStep = Math.max(maxStep, Math.abs(damped));
    }
    if (specialMax) {
      for (let s = 0; s < specialMax; s++) {
        const prior = -SHRINK * Math.log(v[s]);
        const step = (gV[s] + prior) / (hV[s] + SHRINK + 1);
        const damped = Math.max(-0.2, Math.min(0.2, 0.5 * step));
        v[s] = Math.min(specialMax - 0.5, v[s] * Math.exp(damped));
        maxStep = Math.max(maxStep, Math.abs(damped));
      }
      const mv = v.reduce((a, b) => a + b, 0) / specialMax;
      for (let s = 0; s < specialMax; s++) v[s] /= mv;
    }

    // keep mean weight at 1; overall scale lives in the exposures
    const mw = w.reduce((a, b) => a + b, 0) / poolMax;
    for (let i = 0; i < poolMax; i++) w[i] /= mw;

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

const round = (x) => Math.round(x * 10000) / 10000;

/** Full pipeline for one game: pilot fit, dispersion, refit, temporal holdout. */
function fitGame(key, draws, cfg) {
  const pilot = fit(draws, cfg);
  const dispersion = Math.max(1, pilot.pearsonPerDof);
  const full = fit(draws, cfg, { dispersion });

  const cut = Math.floor(draws.length * 0.75);
  const model = fit(draws.slice(0, cut), cfg, { dispersion });
  const test = draws.slice(cut);
  const testFit = fit(test, cfg, {
    learn: false,
    white: model.white,
    special: model.special,
  });
  const testUniform = fit(test, cfg, { learn: false });
  const gain = (testFit.logLik - testUniform.logLik) / dispersion;

  console.error(
    `${key}: ${draws.length} draws, dispersion ${dispersion.toFixed(1)}, holdout gain ${gain.toFixed(1)} (positive = beats uniform)`,
  );
  const ranked = full.white.map((w, i) => ({ n: i + 1, w })).sort((a, b) => b.w - a.w);
  const show = (list) => list.map((x) => `${x.n}:${x.w.toFixed(3)}`).join(" ");
  console.error(`  most picked:  ${show(ranked.slice(0, 8))}`);
  console.error(`  least picked: ${show(ranked.slice(-8).reverse())}`);

  return {
    draws: draws.length,
    from: draws[0].date,
    to: draws[draws.length - 1].date,
    poolMax: cfg.poolMax,
    pick: cfg.pick,
    specialMax: cfg.specialMax || null,
    white: full.white.map(round),
    special: cfg.specialMax ? full.special.map(round) : null,
    diagnostics: {
      dispersion: Math.round(dispersion * 10) / 10,
      holdoutLogLikGain: Math.round(gain * 10) / 10,
      holdoutDraws: test.length,
    },
  };
}

function prepared(rawDraws, cfg, hasSpecial) {
  const draws = [];
  for (const [date, d] of Object.entries(rawDraws)) {
    if (d.n.length !== cfg.pick) continue;
    if (d.n.some((n) => n < 1 || n > cfg.poolMax)) continue;
    if (hasSpecial && (d.s < 1 || d.s > cfg.specialMax)) continue;
    draws.push({
      date,
      whites: d.n.map((n) => n - 1),
      special: hasSpecial ? d.s - 1 : -1,
      counts: d.c,
    });
  }
  draws.sort((a, b) => (a.date < b.date ? -1 : 1));
  return draws;
}

/** Cash Pop: winner totals per draw are a direct popularity read. */
function fitCashPop(rawDraws, poolMax) {
  const sums = new Array(poolMax).fill(0);
  const hits = new Array(poolMax).fill(0);
  const dates = Object.keys(rawDraws).sort();
  let grand = 0;
  let n = 0;
  for (const date of dates) {
    const d = rawDraws[date];
    const num = d.n[0];
    if (!num || num < 1 || num > poolMax) continue;
    sums[num - 1] += d.c[0];
    hits[num - 1]++;
    grand += d.c[0];
    n++;
  }
  if (n < 30) return null;
  const mean = grand / n;
  const LAMBDA = 5; // pseudo-draws of shrinkage toward the average
  const white = sums.map((sum, i) =>
    round((sum + LAMBDA * mean) / ((hits[i] + LAMBDA) * mean)),
  );
  const mw = white.reduce((a, b) => a + b, 0) / poolMax;
  const normalized = white.map((w) => round(w / mw));
  const ranked = normalized
    .map((w, i) => ({ n: i + 1, w }))
    .sort((a, b) => b.w - a.w);
  console.error(
    `cashpop: ${n} draws, direct read. most picked: ${ranked
      .slice(0, 5)
      .map((x) => `${x.n}:${x.w.toFixed(3)}`)
      .join(" ")} | least: ${ranked
      .slice(-3)
      .map((x) => `${x.n}:${x.w.toFixed(3)}`)
      .join(" ")}`,
  );
  return {
    draws: n,
    from: dates[0],
    to: dates[dates.length - 1],
    poolMax,
    pick: 1,
    specialMax: null,
    white: normalized,
    special: null,
    diagnostics: { method: "direct winner totals", shrinkDraws: LAMBDA },
  };
}

const payload = {
  updated: new Date().toISOString(),
  source:
    "fit from src/data/winnerCounts.json (CA) and src/data/waWinnerCounts.json (WA)",
  method:
    "Quasi-Poisson MLE of per-number pick weights vs observed tier counts; per-draw sales as free exposure; shrinkage toward uniform. Weight 1 = picked at the random-play rate; 1.3 = picked 30% more than random.",
  games: {},
};

// National games (CA counts, special ball)
try {
  const archive = JSON.parse(readFileSync(nationalPath, "utf8"));
  for (const [key, base] of Object.entries(NATIONAL)) {
    const raw = archive.games?.[key]?.draws;
    if (!raw) continue;
    const draws = prepared(raw, base, true);
    if (draws.length < 30) {
      console.error(`${key}: only ${draws.length} draws, skipping fit`);
      continue;
    }
    payload.games[key] = fitGame(key, draws, base);
  }
} catch (err) {
  console.error("national archive unavailable:", err.message ?? err);
}

// Washington games (full-population counts, no special ball)
try {
  const archive = JSON.parse(readFileSync(waPath, "utf8"));
  for (const [key, base] of Object.entries(WA_MATRIX)) {
    const raw = archive.games?.[key]?.draws;
    if (!raw) continue;
    const cfg = {
      poolMax: base.poolMax,
      pick: base.pick,
      specialMax: 0,
      tiers: base.tiers.map((k) => ({ k, needS: false })),
    };
    const draws = prepared(raw, cfg, false);
    if (draws.length < 30) {
      console.error(`${key}: only ${draws.length} draws, skipping fit`);
      continue;
    }
    payload.games[key] = fitGame(key, draws, cfg);
  }
  const popRaw = archive.games?.cashpop?.draws;
  if (popRaw) {
    const model = fitCashPop(popRaw, 15);
    if (model) payload.games.cashpop = model;
  }
} catch (err) {
  console.error("WA archive unavailable:", err.message ?? err);
}

writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
console.error(`wrote ${outPath}`);
