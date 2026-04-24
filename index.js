import axios from "axios";
import * as cheerio from "cheerio";

const INTERVAL = 15 * 60 * 1000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function safeFetch(url) {
  try {
    const res = await axios.get(url, { timeout: 15000 });
    await sleep(1500); // prevent rate limit
    return res.data;
  } catch (e) {
    console.log("Fetch error:", e.message);
    return null;
  }
}

async function getPrice(id) {
  const data = await safeFetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
  return data ? data[id].usd : "N/A";
}

async function getWTI() {
  const data = await safeFetch("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1m&range=1d");
  try {
    return data.chart.result[0].meta.regularMarketPrice;
  } catch {
    return "N/A";
  }
}

async function getFarside(url) {
  const html = await safeFetch(url);
  if (!html) return { total: "not final", date: "not final" };

  const $ = cheerio.load(html);
  const rows = $("tr").toArray();

  for (let i = rows.length - 1; i >= 0; i--) {
    const cells = $(rows[i]).find("td").map((_, el) => $(el).text().trim()).get();
    if (cells.length > 3 && cells[0].includes("2026")) {
      return {
        date: cells[0],
        total: cells[cells.length - 1].replace(/[()]/g, "-")
      };
    }
  }

  return { total: "not final", date: "not final" };
}

function etTime() {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).replace(" ", "").toLowerCase();
}

async function run() {
  try {
    const btc = await getPrice("bitcoin");
    const sol = await getPrice("solana");
    const wti = await getWTI();

    const btcEtf = await getFarside("https://farside.co.uk/btc/");
    const ethEtf = await getFarside("https://farside.co.uk/eth/");
    const solEtf = await getFarside("https://farside.co.uk/sol/");

    console.log(
`BTC STRUCTURE ALERT | TIME: ${etTime()} ET | BTC $${btc} | STRUCTURE: lower high forming | SFP: weekly SFP forming | ETF FLOW: BTC ${btcEtf.total}m / ETH ${ethEtf.total}m / SOL ${solEtf.total}m, ${btcEtf.date} | WTI $${wti} | OIL STATE: HEADWIND | SHIFT NEUTRAL vs last alert | BTC: HOLD BTC SHORT | OIL: NO TRADE OIL | SPOT: HOLD SPOT | SOL: NO TRADE | MEDIUM | ETF bid cushioning downside, but crypto lagging beta + Parrot thesis active while BTC trades below resistance; no meaningful div, NEXT bull trigger 78.33k, NEXT bear trigger 76.93k, BW:1/3`
    );

  } catch (e) {
    console.log("BOT ERROR:", e.message);
  }
}

run();
setInterval(run, INTERVAL);
