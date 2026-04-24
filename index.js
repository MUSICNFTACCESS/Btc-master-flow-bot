const axios = require("axios");

// ===== HELPERS =====
function nowET() {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

async function fetchPrice(id) {
  try {
    const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    return res.data[id].usd;
  } catch {
    return null;
  }
}

async function fetchWTI() {
  try {
    const res = await axios.get("https://query1.finance.yahoo.com/v8/finance/chart/CL=F");
    return res.data.chart.result[0].meta.regularMarketPrice;
  } catch {
    return null;
  }
}

// ===== ETF FLOWS (REAL SCRAPE LIGHT) =====
async function fetchETF() {
  try {
    const res = await axios.get("https://farside.co.uk/btc/");
    const text = res.data;

    const match = text.match(/(\+\$|\-\$)(\d+\.\d+)m/);
    if (!match) return "not final";

    return `BTC ${match[1]}${match[2]}m`;
  } catch {
    return "not final";
  }
}

// ===== OI + LIQUIDATIONS =====
async function fetchDerivatives() {
  try {
    const res = await axios.get("https://fapi.binance.com/fapi/v1/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1");
    const ratio = parseFloat(res.data[0].longShortRatio);

    const oiRes = await axios.get("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT");
    const oi = parseFloat(oiRes.data.openInterest);

    return { ratio, oi };
  } catch {
    return { ratio: null, oi: null };
  }
}

// ===== RSI =====
function calcRSI(prices) {
  let gains = 0, losses = 0;
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / (losses || 1);
  return 100 - (100 / (1 + rs));
}

async function fetchRSI() {
  try {
    const res = await axios.get("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=50");
    const closes = res.data.map(c => parseFloat(c[4]));
    return calcRSI(closes);
  } catch {
    return null;
  }
}

// ===== SQUEEZE ENGINE =====
function detectSqueeze(btc, oi, ratio) {

  if (!oi || !ratio) return "NONE";

  // HIGH OI + skewed longs = trap risk
  if (oi > 100000 && ratio > 1.5 && btc < 79400) {
    return "SHORT SQUEEZE RISK";
  }

  // HIGH OI + longs trapped above resistance
  if (oi > 100000 && ratio > 1.5 && btc >= 78000) {
    return "LONG TRAP";
  }

  // heavy shorts + low ratio = squeeze up
  if (ratio < 0.6) {
    return "SHORTS STACKED";
  }

  return "NEUTRAL";
}

// ===== CORE LOGIC =====
function structure(btc) {
  if (btc >= 79400) return "trend shift confirmed";
  if (btc >= 76700) return "trend shift risk";
  if (btc >= 75500) return "lower high forming";
  return "lower high confirmed";
}

function sfp(btc) {
  if (btc >= 79400) return "weekly SFP failed";
  if (btc >= 78000) return "weekly SFP forming";
  return "still valid below 79.4k";
}

function oilState(wti) {
  if (!wti) return "MIXED";
  if (wti > 95) return "HEADWIND";
  if (wti < 85) return "TAILWIND";
  return "MIXED";
}

function action(btc, squeeze) {

  if (btc > 79400) return "BUY BTC";

  if (btc >= 78000 && squeeze !== "SHORTS STACKED") {
    return "ADD BTC SHORT";
  }

  if (btc < 75500) {
    return "ADD BTC SHORT";
  }

  return "HOLD BTC SHORT";
}

// ===== MAIN LOOP =====
async function run() {

  const btc = await fetchPrice("bitcoin");
  const sol = await fetchPrice("solana");
  const wti = await fetchWTI();
  const etf = await fetchETF();
  const { ratio, oi } = await fetchDerivatives();
  const rsi = await fetchRSI();

  const squeeze = detectSqueeze(btc, oi, ratio);

  const output =
`BTC STRUCTURE ALERT | TIME: ${nowET()} ET | BTC $${btc} | STRUCTURE: ${structure(btc)} | SFP: ${sfp(btc)} | ETF FLOW: ${etf} | WTI $${wti} | OIL STATE: ${oilState(wti)} | SHIFT NEUTRAL | BTC: ${action(btc, squeeze)} | OIL: NO TRADE OIL | SPOT: HOLD SPOT | SOL: $${sol} | MEDIUM | ETF bid cushioning downside, but crypto lagging beta + Parrot ACTIVE while BTC below resistance; RSI ${rsi?.toFixed(0) || "N/A"}; ${squeeze}; NEXT bull 76.93k → 77.69k → 78.33k → 79.4k, NEXT bear 75.5k → 74.17k, BW:1/3`;

  console.log(output);
}

setInterval(run, 900000);
run();

