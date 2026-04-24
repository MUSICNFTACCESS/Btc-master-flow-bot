import axios from "axios";
import * as cheerio from "cheerio";

const INTERVAL = 15 * 60 * 1000;

const LEVELS = [74170,75500,75800,76100,76200,76700,76930,77690,78330,79360,79400];

async function getCoinGeckoPrice(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  const { data } = await axios.get(url, { timeout: 15000 });
  return Number(data[id].usd);
}

async function getYahooPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const { data } = await axios.get(url, { timeout: 15000 });
  return Number(data.chart.result[0].meta.regularMarketPrice);
}

async function getFarsideTotal(url) {
  try {
    const { data } = await axios.get(url, { timeout: 20000 });
    const $ = cheerio.load(data);
    const rows = $("tr").toArray();
    for (let i = rows.length - 1; i >= 0; i--) {
      const cells = $(rows[i]).find("td").map((_, el) => $(el).text().trim()).get();
      if (cells.length > 3 && /\d{2} .* 2026/.test(cells[0])) {
        const date = cells[0].replace(" Apr ", "/").replace(" 2026", "");
        const total = cells[cells.length - 1].replace(/[()]/g, "-");
        return { date: cells[0], total };
      }
    }
  } catch {}
  return { date: "not final", total: "not final" };
}

function nearestTriggers(btc) {
  const below = LEVELS.filter(x => x < btc).pop();
  const above = LEVELS.find(x => x > btc);
  return { bear: below, bull: above };
}

function classify(btc, wti) {
  const { bull, bear } = nearestTriggers(btc);

  let structure = "lower high forming";
  let sfp = "no weekly SFP trigger";
  let btcAction = "NO TRADE BTC";
  let spot = "HOLD SPOT";
  let confidence = "MEDIUM";
  let shift = "NEUTRAL vs last alert";
  let oilState = "MIXED";
  let parrot = "Parrot thesis active";
  let div = "no meaningful div";
  let bw = "BW:1/3";

  if (btc >= 78000 && btc < 79400) sfp = "weekly SFP forming";
  if (btc >= 79400) {
    structure = "trend shift risk";
    sfp = "weekly SFP failed";
    btcAction = "NO TRADE BTC";
    spot = "TRIM SPOT 5-10%";
    shift = "MORE BULLISH";
    parrot = "Parrot thesis weakening";
  }

  if (btc < 78330) {
    structure = "lower high forming";
    btcAction = "HOLD BTC SHORT";
  }

  if (btc < 77690) {
    structure = "lower high confirmed";
    shift = "MORE BEARISH";
    confidence = "HIGH";
  }

  if (wti >= 95) { oilState = "PANIC RISK"; bw = "BW:2/3"; }
  else if (wti >= 88) oilState = "HEADWIND";
  else if (wti <= 82) oilState = "TAILWIND";

  return { structure, sfp, btcAction, spot, confidence, shift, oilState, parrot, div, bw, bull, bear };
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
    const btc = await getCoinGeckoPrice("bitcoin");
    const sol = await getCoinGeckoPrice("solana");
    const wti = await getYahooPrice("CL=F");

    const btcEtf = await getFarsideTotal("https://farside.co.uk/btc/");
    const ethEtf = await getFarsideTotal("https://farside.co.uk/eth/");
    const solEtf = await getFarsideTotal("https://farside.co.uk/sol/");

    const s = classify(btc, wti);

    const etfLine = `BTC ${btcEtf.total}m / ETH ${ethEtf.total}m / SOL ${solEtf.total}m, ${btcEtf.date}`;

    const reason = `ETF bid cushioning downside, but crypto lagging beta + ${s.parrot} while BTC trades below ${s.bull ? (s.bull/1000).toFixed(2)+"k" : "next resistance"}; ${s.div}; NEXT bull trigger ${(s.bull/1000).toFixed(2)}k reclaim, NEXT bear trigger ${(s.bear/1000).toFixed(2)}k loss, ${s.bw}`;

    console.log(`BTC STRUCTURE ALERT | TIME: ${etTime()} ET | BTC $${btc.toLocaleString("en-US",{maximumFractionDigits:0})} | STRUCTURE: ${s.structure} | SFP: ${s.sfp} | ETF FLOW: ${etfLine} | WTI $${wti.toFixed(2)} | OIL STATE: ${s.oilState} | SHIFT ${s.shift} | BTC: ${s.btcAction} | OIL: NO TRADE OIL | SPOT: ${s.spot} | SOL: NO TRADE | ${s.confidence} | ${reason}`);
  } catch (e) {
    console.log("BOT ERROR:", e.message);
  }
}

run();
setInterval(run, INTERVAL);
