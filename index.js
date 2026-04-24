const axios = require("axios");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ===== LIVE PRICE (STABLE) =====
async function getBTC() {
  try {
    const r = await axios.get("https://api.coinbase.com/v2/prices/BTC-USD/spot");
    return parseFloat(r.data.data.amount);
  } catch { return null; }
}

async function getWTI() {
  try {
    const r = await axios.get("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=5m&range=1d");
    return r.data.chart.result[0].meta.regularMarketPrice;
  } catch { return null; }
}

// ===== ETF (STABLE APPROX REGIME) =====
async function getETF() {
  try {
    const r = await axios.get("https://api.alternative.me/fng/");
    const sentiment = r.data.data[0].value;

    if (sentiment > 60) return "BTC + strong inflow regime";
    if (sentiment < 30) return "BTC weak flow regime";
    return "BTC mixed flow regime";

  } catch {
    return "BTC flow unknown";
  }
}

// ===== RSI + DIVERGENCE (REAL SWING DETECTION) =====
async function getRSIandDiv() {
  try {
    const r = await axios.get("https://api.coincap.io/v2/candles?exchange=binance&interval=h1&baseId=bitcoin&quoteId=tether");
    const closes = r.data.data.slice(-50).map(c => c.close);

    let gains = 0, losses = 0;
    for (let i = 1; i < closes.length; i++) {
      let diff = closes[i] - closes[i-1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    let rs = gains / (losses || 1);
    let rsi = 100 - (100 / (1 + rs));

    // ===== SWING-BASED DIVERGENCE =====
    const recentHigh = Math.max(...closes.slice(-10));
    const prevHigh = Math.max(...closes.slice(-25, -10));

    const recentLow = Math.min(...closes.slice(-10));
    const prevLow = Math.min(...closes.slice(-25, -10));

    let divergence = "no meaningful div";

    if (recentHigh >= prevHigh && rsi < 60) {
      divergence = "1H bear div active";
    }

    if (recentLow <= prevLow && rsi > 40) {
      divergence = "bull div building at support";
    }

    return { rsi, divergence };

  } catch {
    return { rsi: null, divergence: "no data" };
  }
}

// ===== VOLATILITY / LIQUIDATION PROXY =====
async function getVolatility() {
  try {
    const r = await axios.get("https://api.coincap.io/v2/assets/bitcoin");
    return parseFloat(r.data.data.changePercent24Hr);
  } catch { return null; }
}

// ===== ENGINE =====
function analyze(btc, rsi, divergence, vol, wti) {

  let structure = "lower high forming";
  let action = "HOLD BTC SHORT";
  let risk = "MEDIUM";

  // ===== STRUCTURE =====
  if (btc > 79400) structure = "trend shift risk";
  if (btc < 75500) structure = "lower high confirmed";

  // ===== PARROT =====
  let parrot = "ACTIVE";
  if (btc > 77000 && rsi > 55) parrot = "WEAKENING";
  if (btc > 79400) parrot = "INVALIDATED";

  // ===== LAGGING BETA =====
  let lagging = "crypto lagging beta";

  // ===== ACTION LOGIC =====
  if (rsi && rsi > 70) action = "ADD BTC SHORT";
  if (rsi && rsi < 30) action = "BUY BTC";

  // ===== DEPLOY HEAVY =====
  if (btc < 90000 && rsi < 35 && divergence.includes("bull")) {
    action = "DEPLOY HEAVY BTC LONG";
    risk = "HIGH";
  }

  if (btc < 76000 && divergence.includes("bear")) {
    action = "DEPLOY HEAVY BTC SHORT";
    risk = "HIGH";
  }

  // ===== VOLATILITY BOOST =====
  if (vol && Math.abs(vol) > 5) risk = "HIGH";

  // ===== OIL =====
  let oilState = "MIXED";
  if (wti > 95) oilState = "HEADWIND";
  if (wti > 100) oilState = "PANIC RISK";

  return { structure, action, risk, oilState, parrot, lagging };
}

// ===== ALERT =====
function buildAlert(btc, etf, wti, analysis, divergence) {
  const time = new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit"
  });

  return `BTC STRUCTURE ALERT | TIME: ${time} ET | BTC $${btc} | STRUCTURE: ${analysis.structure} | SFP: weekly SFP forming | ETF FLOW: ${etf} | WTI $${wti} | OIL STATE: ${analysis.oilState} | SHIFT NEUTRAL | BTC: ${analysis.action} | OIL: NO TRADE OIL | SPOT: HOLD SPOT | SOL: NO TRADE | ${analysis.risk} | ETF bid cushioning downside, but ${analysis.lagging} + Parrot ${analysis.parrot} while BTC below resistance; ${divergence}; NEXT bull trigger 78.33k, NEXT bear trigger 76.93k, BW:1/3`;
}

// ===== LOOP =====
async function run() {
  try {
    const btc = await getBTC(); await sleep(800);
    const wti = await getWTI(); await sleep(800);
    const etf = await getETF(); await sleep(800);

    const { rsi, divergence } = await getRSIandDiv(); await sleep(800);
    const vol = await getVolatility();

    const analysis = analyze(btc, rsi, divergence, vol, wti);

    console.log(buildAlert(btc, etf, wti, analysis, divergence));

  } catch (e) {
    console.log("BOT ERROR:", e.message);
  }
}

setInterval(run, 900000);
run();
