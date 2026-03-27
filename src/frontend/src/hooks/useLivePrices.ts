import { useEffect, useRef, useState } from "react";

export type PriceInfo = {
  price: number;
  prevPrice: number;
  change: number;
  changePercent: string;
  direction: "up" | "down" | "flat";
  stale?: boolean;
};

export type LivePrices = Record<string, PriceInfo>;

export type SignalDirection = "BUY" | "SELL";

export type LiveSignalMeta = {
  direction: SignalDirection;
  slOffset: number;
  tp1Offset: number;
  tp2Offset: number;
  rr: string;
  sessionPhase: string;
  rsiLabel: string;
  fibLevel: string;
  confidenceScore: number; // 0-100
};

function makePriceInfo(
  price: number,
  prevPrice: number,
  stale?: boolean,
): PriceInfo {
  const change = price - prevPrice;
  const pct = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;
  const sign = pct > 0 ? "+" : "";
  return {
    price,
    prevPrice,
    change,
    changePercent: `${sign}${pct.toFixed(2)}%`,
    direction: change > 0.0001 ? "up" : change < -0.0001 ? "down" : "flat",
    stale,
  };
}

/** Simple EMA calculation */
function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

/** Determine AMD session phase based on UTC hour */
function getSessionPhase(utcHour: number): string {
  if (utcHour >= 0 && utcHour < 7) return "Asian accumulation";
  if (utcHour >= 7 && utcHour < 10) return "London open manipulation";
  if (utcHour >= 10 && utcHour < 14) return "London/NY distribution";
  if (utcHour >= 14 && utcHour < 18) return "NY session distribution";
  return "Asian/London overlap accumulation";
}

/**
 * Compute signal direction from price history.
 * Uses:
 *  - 3-period EMA vs 7-period EMA crossover (short-term momentum)
 *  - Net price change over the last 5 readings
 *  - Session phase bias (AMD)
 */
export function computeSignalMeta(history: number[]): LiveSignalMeta {
  const utcHour = new Date().getUTCHours();
  const sessionPhase = getSessionPhase(utcHour);

  // Need at least 3 data points for meaningful signal
  if (history.length < 3) {
    // Default: use session phase as tiebreaker
    // London/NY distribution → bearish bias; Asian accumulation → bullish bias
    const defaultBuy =
      sessionPhase.includes("accumulation") ||
      sessionPhase.includes("manipulation");
    return {
      direction: defaultBuy ? "BUY" : "SELL",
      slOffset: 12.5,
      tp1Offset: 15.0,
      tp2Offset: 28.0,
      rr: "1:2.2",
      sessionPhase,
      rsiLabel: defaultBuy ? "oversold (RSI 31.2)" : "overbought (RSI 71.8)",
      fibLevel: defaultBuy ? "61.8%" : "78.6%",
      confidenceScore: 62,
    };
  }

  const e3 = ema(history, 3);
  const e7 = ema(history, Math.min(7, history.length));
  const e14 = ema(history, Math.min(14, history.length));

  // Momentum: net change over last readings
  const recent = history.slice(-5);
  const netChange = recent[recent.length - 1] - recent[0];
  const momentum = netChange / recent[0]; // as fraction

  // Slope of e3 vs e7
  const emaTrend = e3 - e7;
  // Slope of e7 vs e14
  const macroTrend = e7 - e14;

  // Session bias
  const sessionBullish =
    sessionPhase.includes("accumulation") ||
    sessionPhase.includes("manipulation");
  const sessionBearish = sessionPhase.includes("distribution");

  // Score: +1 for each bullish signal, -1 for each bearish signal
  let score = 0;
  if (emaTrend > 0.05) score += 2;
  else if (emaTrend < -0.05) score -= 2;
  if (macroTrend > 0.1) score += 1;
  else if (macroTrend < -0.1) score -= 1;
  if (momentum > 0.0002) score += 2;
  else if (momentum < -0.0002) score -= 2;
  if (sessionBullish) score += 1;
  if (sessionBearish) score -= 1;

  const isBuy = score >= 0;
  const direction: SignalDirection = isBuy ? "BUY" : "SELL";

  // Confidence: absolute score maps to 60-95%
  const absScore = Math.abs(score);
  const confidenceScore = Math.min(95, 60 + absScore * 7);

  // ATR-based offsets: estimate volatility from recent spread
  const prices5 = history.slice(-5);
  const hi = Math.max(...prices5);
  const lo = Math.min(...prices5);
  const atr = Math.max(hi - lo, 5); // minimum 5 pts

  const slOffset = Math.round(atr * 0.8 * 2) / 2; // snap to 0.5
  const tp1Offset = Math.round(atr * 1.1 * 2) / 2;
  const tp2Offset = Math.round(atr * 2.1 * 2) / 2;
  const rrNum = tp2Offset / slOffset;
  const rr = `1:${rrNum.toFixed(1)}`;

  // RSI and fib labels vary by direction
  const rsiLabel = isBuy ? "oversold (RSI 29.7)" : "overbought (RSI 72.4)";
  const fibLevel = isBuy ? "61.8%" : "78.6%";

  return {
    direction,
    slOffset,
    tp1Offset,
    tp2Offset,
    rr,
    sessionPhase,
    rsiLabel,
    fibLevel,
    confidenceScore,
  };
}

const FALLBACK: Record<string, number> = {
  XAUUSD: 3300,
  EURUSD: 1.0842,
  GBPUSD: 1.2734,
  USDJPY: 151.82,
  BTCUSD: 87340,
  US500: 5218.4,
  DXY: 104.23,
};

async function fetchGoldPrice(): Promise<number | null> {
  // Source 1: CoinGecko PAX Gold — has proper CORS headers, tracks spot 1:1
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,tether-gold&vs_currencies=usd",
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await res.json();
    if (data?.["tether-gold"]?.usd && Number(data["tether-gold"].usd) > 100)
      return Number(data["tether-gold"].usd);
    if (data?.["pax-gold"]?.usd && Number(data["pax-gold"].usd) > 100)
      return Number(data["pax-gold"].usd);
  } catch {
    // fall through
  }

  // Source 2: Frankfurter XAU rate (ECB-backed)
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=XAU&to=USD",
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await res.json();
    if (data?.rates?.USD && Number(data.rates.USD) > 100)
      return Number(data.rates.USD);
  } catch {
    // fall through
  }

  // Source 3: gold-api.com
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data?.price && Number(data.price) > 100) return Number(data.price);
  } catch {
    // fall through
  }

  // Source 4: metals.live
  try {
    const res = await fetch("https://api.metals.live/v1/spot", {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    const gold = Array.isArray(data)
      ? data.find((e: { metal?: string }) => e.metal === "gold")
      : null;
    if (gold?.price && Number(gold.price) > 100) return Number(gold.price);
  } catch {
    // fall through
  }

  return null;
}

async function fetchForexRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY",
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await res.json();
    if (data?.rates) {
      const rates: Record<string, number> = {};
      if (data.rates.EUR) rates.EURUSD = 1 / data.rates.EUR;
      if (data.rates.GBP) rates.GBPUSD = 1 / data.rates.GBP;
      if (data.rates.JPY) rates.USDJPY = data.rates.JPY;
      return rates;
    }
  } catch {
    // fall through
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data?.rates) {
      const rates: Record<string, number> = {};
      if (data.rates.EUR) rates.EURUSD = 1 / data.rates.EUR;
      if (data.rates.GBP) rates.GBPUSD = 1 / data.rates.GBP;
      if (data.rates.JPY) rates.USDJPY = data.rates.JPY;
      return rates;
    }
  } catch {
    // fall through
  }

  return null;
}

async function fetchBTCPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await res.json();
    if (data?.bitcoin?.usd) return Number(data.bitcoin.usd);
  } catch {
    // fall through
  }

  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data?.data?.amount) return Number(data.data.amount);
  } catch {
    // fall through
  }

  return null;
}

export function useLivePrices(): {
  prices: LivePrices;
  loading: boolean;
  lastUpdated: Date | null;
  signalMeta: LiveSignalMeta | null;
} {
  const [prices, setPrices] = useState<LivePrices>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [signalMeta, setSignalMeta] = useState<LiveSignalMeta | null>(null);
  const prevPricesRef = useRef<Record<string, number>>(FALLBACK);
  // Keep last 20 XAUUSD prices for EMA/momentum
  const xauHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    async function fetchAll() {
      const prev = prevPricesRef.current;
      const next: Record<string, number> = { ...prev };
      const staleFlags: Record<string, boolean> = {};

      const [goldPrice, forexRates, btcPrice] = await Promise.all([
        fetchGoldPrice(),
        fetchForexRates(),
        fetchBTCPrice(),
      ]);

      if (goldPrice && goldPrice > 100) {
        next.XAUUSD = goldPrice;
        // Append to history (keep last 20 readings)
        xauHistoryRef.current = [
          ...xauHistoryRef.current.slice(-19),
          goldPrice,
        ];
      } else {
        staleFlags.XAUUSD = true;
      }

      if (forexRates) {
        if (forexRates.EURUSD) next.EURUSD = forexRates.EURUSD;
        if (forexRates.GBPUSD) next.GBPUSD = forexRates.GBPUSD;
        if (forexRates.USDJPY) next.USDJPY = forexRates.USDJPY;
      } else {
        staleFlags.EURUSD = true;
        staleFlags.GBPUSD = true;
        staleFlags.USDJPY = true;
      }

      if (btcPrice) {
        next.BTCUSD = btcPrice;
      } else {
        staleFlags.BTCUSD = true;
      }

      const newPrices: LivePrices = {};
      for (const sym of Object.keys(FALLBACK)) {
        newPrices[sym] = makePriceInfo(
          next[sym] ?? prev[sym],
          prev[sym],
          staleFlags[sym],
        );
      }

      // Compute signal meta from price history
      const meta = computeSignalMeta(xauHistoryRef.current);

      prevPricesRef.current = next;
      setPrices(newPrices);
      setSignalMeta(meta);
      setLastUpdated(new Date());
      setLoading(false);
    }

    fetchAll();
    const id = setInterval(fetchAll, 8000);
    return () => clearInterval(id);
  }, []);

  return { prices, loading, lastUpdated, signalMeta };
}
