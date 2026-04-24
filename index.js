const axios = require("axios");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ===== LIVE DATA (NO RATE LIMIT ISSUES) =====
async function getBTC() {
  try {
    const res = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");
    return parseFloat(res.data.price);
  } catch { return "N/A"; }
}

async function getSOL() {
  try {
    const res = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
    return parseFloat(res.data.price);
  } catch { return "N/A"; }
}

async function getWTI() {
  try {
    const res = await axios.get("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1m&range=1d");
    return res.data.chart.result[0].meta.regularMarketPrice;
  } catch { return "N/A"; }
}

// TEMP ETF (no scraping = no errors)
async function getETF() {
  return {
    btc: "not final",
    eth: "not final",
    sol: "not final",
    date: "not final"
  };
}

// ===== ALERT ENGINE =====
function buildAlert(btc, wti, etf) {
  const time = new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });

  let structure = "lower high forming";
  let sfp = "weekly SFP forming";

  let oilState = wti > 95 ? "HEADWIND" : "TAILWIND";

  let reason = `ETF bid cushioning downside, but crypto lagging beta + Parrot thesis active while BTC trades below resistance; no meaningful div; NEXT bull trigger 78.33k, NEXT bear trigger 76.93k, BW:1/3`;

  return `BTC STRUCTURE ALERT | TIME: ${time} ET | BTC $${btc} | STRUCTURE: ${structure} | SFP: ${sfp} | ETF FLOW: BTC ${etf.btc} / ETH ${etf.eth} / SOL ${etf.sol}, ${etf.date} | WTI $${wti} | OIL STATE: ${oilState} | SHIFT NEUTRAL | BTC: HOLD BTC SHORT | OIL: NO TRADE OIL | SPOT: HOLD SPOT | SOL: NO TRADE | MEDIUM | ${reason}`;
}

// ===== MAIN LOOP =====
async function run() {
  try {
    const btc = await getBTC();
    await sleep(1200);

    const sol = await getSOL();
    await sleep(1200);

    const wti = await getWTI();
    await sleep(1200);

    const etf = await getETF();

    const alert = buildAlert(btc, wti, etf);
    console.log(alert);

  } catch (e) {
    console.log("BOT ERROR:", e.message);
  }
}

// Run every 15 min
setInterval(run, 900000);
run();
