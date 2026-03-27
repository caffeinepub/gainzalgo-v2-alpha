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
    // Prefer Tether Gold (XAUT) as it tracks XAU spot very accurately
    if (data?.["tether-gold"]?.usd && Number(data["tether-gold"].usd) > 100)
      return Number(data["tether-gold"].usd);
    if (data?.["pax-gold"]?.usd && Number(data["pax-gold"].usd) > 100)
      return Number(data["pax-gold"].usd);
  } catch {
    // fall through
  }

  // Source 2: Frankfurter XAU rate (ECB-backed, may include XAU)
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
  // Source 1: Frankfurter (ECB-backed, reliable forex, CORS-friendly)
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

  // Source 2: open.er-api.com
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
  // Source 1: CoinGecko BTC
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

  // Source 2: Coinbase
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
} {
  const [prices, setPrices] = useState<LivePrices>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevPricesRef = useRef<Record<string, number>>(FALLBACK);

  useEffect(() => {
    async function fetchAll() {
      const prev = prevPricesRef.current;
      const next: Record<string, number> = { ...prev };
      const staleFlags: Record<string, boolean> = {};

      // Fetch all sources in parallel
      const [goldPrice, forexRates, btcPrice] = await Promise.all([
        fetchGoldPrice(),
        fetchForexRates(),
        fetchBTCPrice(),
      ]);

      if (goldPrice && goldPrice > 100) {
        next.XAUUSD = goldPrice;
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

      // Build price infos
      const newPrices: LivePrices = {};
      for (const sym of Object.keys(FALLBACK)) {
        newPrices[sym] = makePriceInfo(
          next[sym] ?? prev[sym],
          prev[sym],
          staleFlags[sym],
        );
      }

      prevPricesRef.current = next;
      setPrices(newPrices);
      setLastUpdated(new Date());
      setLoading(false);
    }

    fetchAll();
    const id = setInterval(fetchAll, 8000); // refresh every 8s
    return () => clearInterval(id);
  }, []);

  return { prices, loading, lastUpdated };
}
