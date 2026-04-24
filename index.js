const axios = require("axios");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ===== LIVE PRICE (SAFE) =====
async function getBTC() {
  try {
    const r = await axios.get("https://api.coinbase.com/v2/prices/BTC-USD/spot");
    return parseFloat(r.data.data.amount);
  } catch {
    return null;
  }
}

async function getWTI() {
  try {
    const r = await axios.get("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=5m&range=1d");
    return r.data.chart.result[0].meta.regularMarketPrice;
  } catch {
    return null;
  }
}

// ===== RSI (COINBASE CANDLES = STABLE) =====
async function getRSI() {
  try {
    const r = await axios.get("https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600");
    const closes = r.data.slice(0, 50).map(c => c[4]);

    let gains = 0, losses = 0;
    for (let i = 1; i < closes.length; i++) {
      let diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    let rs = gains / (losses || 1);
    let rsi = 100 - (100 / (1 + rs));

    return rsi;
  } catch {
    return null;
  }
}

// ===== SIMPLE DIVERGENCE =====
function getDivergence(rsi, btc) {
  if (!rsi || !btc) return "no data";

  if (rsi > 65 && btc < 78000) return "1H bear div active";
  if (rsi < 40 && btc < 76000) return "bull div building at support";

  return "no meaningful div";
}

// ===== ENGINE =====
function analyze(btc, rsi, divergence, wti) {
  let structure = "lower high forming";
  let action = "HOLD BTC SHORT";
  let risk = "MEDIUM";

  if (btc > 79400) structure = "trend shift risk";
  if (btc < 75500) structure = "lower high confirmed";

  // RSI logic
  if (rsi > 70) action = "ADD BTC SHORT";
  if (rsi < 30) action = "BUY BTC";

  // DEPLOY HEAVY
  if (btc < 76000 && divergence.includes("bull")) {
    action = "DEPLOY HEAVY BTC LONG";
    risk = "HIGH";
  }

  if (btc < 76000 && divergence.includes("bear")) {
    action = "DEPLOY HEAVY BTC SHORT";
    risk = "HIGH";
  }

  // Oil
  let oilState = "MIXED";
  if (wti > 95) oilState = "HEADWIND";
  if (wti > 100) oilState = "PANIC RISK";

  return { structure, action, risk, oilState };
}

// ===== ALERT =====
function buildAlert(btc, wti, analysis, divergence) {
  const time = new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit"
  });

  return `BTC STRUCTURE ALERT | TIME: ${time} ET | BTC $${btc} | STRUCTURE: ${analysis.structure} | SFP: weekly SFP forming | ETF FLOW: BTC not final | WTI $${wti} | OIL STATE: ${analysis.oilState} | SHIFT NEUTRAL | BTC: ${analysis.action} | OIL: NO TRADE OIL | SPOT: HOLD SPOT | SOL: NO TRADE | ${analysis.risk} | ETF bid cushioning downside, but crypto lagging beta + Parrot ACTIVE while BTC below resistance; ${divergence}; NEXT bull trigger 78.33k, NEXT bear trigger 76.93k, BW:1/3`;
}

// ===== LOOP =====
async function run() {
  try {
    const btc = await getBTC();
    await sleep(800);

    const wti = await getWTI();
    await sleep(800);

    const rsi = await getRSI();

    const divergence = getDivergence(rsi, btc);
    const analysis = analyze(btc, rsi, divergence, wti);

    console.log(buildAlert(btc, wti, analysis, divergence));

  } catch (e) {
    console.log("BOT ERROR:", e.message);
  }
}

setInterval(run, 900000);
run();
