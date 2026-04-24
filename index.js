const axios = require("axios");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let lastPrice = null;

// ===== FORMAT =====
function format(n) {
  if (!n) return "N/A";
  return Math.round(n).toLocaleString("en-US");
}

// ===== BTC =====
async function getBTC() {
  try {
    const r = await axios.get("https://api.coinbase.com/v2/prices/BTC-USD/spot");
    return parseFloat(r.data.data.amount);
  } catch { return null; }
}

// ===== SOL =====
async function getSOL() {
  try {
    const r = await axios.get("https://api.coinbase.com/v2/prices/SOL-USD/spot");
    return parseFloat(r.data.data.amount);
  } catch { return null; }
}

// ===== WTI =====
async function getWTI() {
  try {
    const r = await axios.get("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=5m&range=1d");
    return r.data.chart.result[0].meta.regularMarketPrice;
  } catch { return null; }
}

// ===== ETF (SAFE FARSIDE) =====
async function getETF() {
  try {
    const r = await axios.get("https://farside.co.uk/btc/");
    const html = r.data;

    const match = html.match(/Total[^>]*>\s*([-+0-9.,]+)/i);

    if (match) {
      const val = match[1].replace(/,/g, '');
      const num = parseFloat(val);
      return `BTC ${num > 0 ? "+" : ""}${num.toFixed(1)}m`;
    }

    return "not final";
  } catch {
    return "not final";
  }
}

// ===== RSI =====
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
    return 100 - (100 / (1 + rs));

  } catch { return null; }
}

// ===== DIVERGENCE =====
function getDiv(rsi, btc) {
  if (!rsi || !btc) return "no data";

  if (rsi > 65 && btc < 78000) return "1H bear div active";
  if (rsi < 40 && btc < 76000) return "bull div building at support";

  return "no meaningful div";
}

// ===== ENGINE =====
function analyze(btc, rsi, div, wti) {

  let structure = "lower high forming";
  let action = "HOLD BTC SHORT";
  let risk = "MEDIUM";

  if (btc > 79400) structure = "trend shift risk";
  if (btc < 75500) structure = "lower high confirmed";

  if (rsi > 70) action = "ADD BTC SHORT";
  if (rsi < 30) action = "BUY BTC";

  if (btc < 76000 && div.includes("bull")) {
    action = "DEPLOY HEAVY BTC LONG";
    risk = "HIGH";
  }

  if (btc < 76000 && div.includes("bear")) {
    action = "DEPLOY HEAVY BTC SHORT";
    risk = "HIGH";
  }

  let oilState = "MIXED";
  if (wti > 95) oilState = "HEADWIND";
  if (wti > 100) oilState = "PANIC RISK";

  return { structure, action, risk, oilState };
}

// ===== SHIFT =====
function getShift(btc) {
  if (!lastPrice) {
    lastPrice = btc;
    return "NEUTRAL";
  }

  let shift = "NEUTRAL";

  if (btc > lastPrice) shift = "MORE BULLISH";
  if (btc < lastPrice) shift = "MORE BEARISH";

  lastPrice = btc;
  return shift;
}

// ===== ALERT =====
function buildAlert(btc, sol, etf, wti, analysis, div, shift) {

  const time = new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit"
  });

  return `BTC STRUCTURE ALERT | TIME: ${time} ET | BTC $${format(btc)} | STRUCTURE: ${analysis.structure} | SFP: weekly SFP forming | ETF FLOW: ${etf} | WTI $${format(wti)} | OIL STATE: ${analysis.oilState} | SHIFT ${shift} | BTC: ${analysis.action} | OIL: NO TRADE OIL | SPOT: HOLD SPOT | SOL: $${format(sol)} | ${analysis.risk} | ETF bid cushioning downside, but crypto lagging beta + Parrot ACTIVE while BTC below resistance; ${div}; NEXT bull trigger 78.33k, NEXT bear trigger 76.93k, BW:1/3`;
}

// ===== LOOP =====
async function run() {
  try {
    const btc = await getBTC(); await sleep(500);
    const sol = await getSOL(); await sleep(500);
    const wti = await getWTI(); await sleep(500);
    const etf = await getETF(); await sleep(500);
    const rsi = await getRSI();

    const div = getDiv(rsi, btc);
    const analysis = analyze(btc, rsi, div, wti);
    const shift = getShift(btc);

    console.log(buildAlert(btc, sol, etf, wti, analysis, div, shift));

  } catch (e) {
    console.log("BOT ERROR:", e.message);
  }
}

setInterval(run, 900000);
run();
