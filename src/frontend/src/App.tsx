import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Menu,
  Minus,
  Send,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Twitter,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { TradingViewChart } from "./components/TradingViewChart";
import { TradingViewTicker } from "./components/TradingViewTicker";
import {
  type LivePrices,
  type LiveSignalMeta,
  useLivePrices,
} from "./hooks/useLivePrices";

const SIGNALS = [
  {
    id: "GA-2026-0847",
    type: "SELL" as const,
    asset: "XAUUSD",
    entry: "3,245.50",
    slOffset: 12.5,
    tp1Offset: 13.5,
    tp2Offset: 27.0,
    sl: "3,258.00",
    tp1: "3,232.00",
    tp2: "3,218.50",
    status: "ACTIVE" as const,
    time: "14:32 UTC",
    explanation:
      "GainzAlgo V2 Alpha detected a bearish rejection at the 3,245 supply zone coinciding with AMD session distribution phase. RSI divergence confirmed on H1 timeframe with hidden bearish divergence at overbought territory (RSI 74.2). Price action shows a textbook supply zone re-test after a prior impulsive bearish move. The AMD distribution phase aligns with London close institutional selling. High-probability short setup targeting previous demand zones at 3,232 and 3,218.50 respectively, validated by 0.618 Fibonacci extension confluence.",
    rr: "1:2.8",
    pips: null as string | null,
    result: null as string | null,
  },
  {
    id: "GA-2026-0846",
    type: "BUY" as const,
    asset: "XAUUSD",
    entry: "3,195.00",
    slOffset: 13.0,
    tp1Offset: 15.0,
    tp2Offset: 33.5,
    sl: "3,182.00",
    tp1: "3,210.00",
    tp2: "3,228.50",
    status: "CLOSED" as const,
    time: "08:15 UTC",
    explanation:
      "V2 Alpha algo identified a high-confluence accumulation zone at 3,195 — a key demand area where price had previously reversed with strong bullish momentum. This setup aligns perfectly with the AMD morning accumulation phase during Asian session overlap. The 61.8% Fibonacci retracement from the prior swing low to swing high converges at this exact level, creating a triple confluence: demand zone, Fibonacci support, and AMD accumulation timing. Volume profile analysis showed significant absorption of sell orders at this level. All targets hit with +33 and +33.5 pip gains respectively.",
    rr: "1:2.8",
    pips: "+187" as string | null,
    result: "WIN" as string | null,
  },
];

const RECENT_SIGNALS = [
  {
    num: 1,
    type: "SELL",
    asset: "XAUUSD",
    entry: "3245.50",
    exit: "3218.50",
    pips: "+270",
    result: "ACTIVE",
    date: "Mar 25",
  },
  {
    num: 2,
    type: "BUY",
    asset: "XAUUSD",
    entry: "3195.00",
    exit: "3228.50",
    pips: "+187",
    result: "WIN",
    date: "Mar 25",
  },
  {
    num: 3,
    type: "BUY",
    asset: "XAUUSD",
    entry: "3162.50",
    exit: "3190.00",
    pips: "+275",
    result: "WIN",
    date: "Mar 24",
  },
  {
    num: 4,
    type: "SELL",
    asset: "XAUUSD",
    entry: "3198.00",
    exit: "3174.50",
    pips: "+235",
    result: "WIN",
    date: "Mar 23",
  },
  {
    num: 5,
    type: "BUY",
    asset: "XAUUSD",
    entry: "3145.00",
    exit: "3145.00",
    pips: "-45",
    result: "LOSS",
    date: "Mar 22",
  },
  {
    num: 6,
    type: "SELL",
    asset: "XAUUSD",
    entry: "3212.00",
    exit: "3186.00",
    pips: "+260",
    result: "WIN",
    date: "Mar 21",
  },
  {
    num: 7,
    type: "BUY",
    asset: "XAUUSD",
    entry: "3178.50",
    exit: "3210.00",
    pips: "+315",
    result: "WIN",
    date: "Mar 20",
  },
  {
    num: 8,
    type: "SELL",
    asset: "XAUUSD",
    entry: "3238.00",
    exit: "3205.50",
    pips: "+325",
    result: "WIN",
    date: "Mar 19",
  },
];

const TIMEFRAMES = ["M15", "H1", "H4", "D1"];

function formatPrice(sym: string, price: number): string {
  if (sym === "XAUUSD" || sym === "US500" || sym === "BTCUSD") {
    return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (sym === "USDJPY") return price.toFixed(2);
  return price.toFixed(4);
}

function DirectionIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up")
    return <ChevronUp className="w-3 h-3 text-trade-green" />;
  if (direction === "down")
    return <ChevronDown className="w-3 h-3 text-trade-red" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function FlashPrice({
  value,
  direction,
  className,
}: {
  value: string;
  direction: "up" | "down" | "flat";
  className?: string;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setFlash(
        direction === "up" ? "up" : direction === "down" ? "down" : null,
      );
      prevValue.current = value;
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [value, direction]);

  const flashStyle =
    flash === "up"
      ? { background: "oklch(0.69 0.190 145 / 0.25)", borderRadius: "4px" }
      : flash === "down"
        ? { background: "oklch(0.58 0.220 27 / 0.25)", borderRadius: "4px" }
        : {};

  return (
    <span
      className={`font-mono transition-all duration-300 ${className ?? ""}`}
      style={flashStyle}
    >
      {value}
    </span>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-sm text-muted-foreground">
      {time.toUTCString().replace(" GMT", " UTC")}
    </span>
  );
}

function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = [
    "DASHBOARD",
    "LIVE SIGNALS",
    "ANALYSIS",
    "PERFORMANCE",
    "ABOUT",
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b border-border backdrop-blur-xl"
      style={{ background: "oklch(0.10 0.028 258 / 0.92)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3" data-ocid="nav.link">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.72 0.120 75 / 0.15)",
                border: "1px solid oklch(0.72 0.120 75 / 0.4)",
              }}
            >
              <Zap className="w-5 h-5 text-gold" />
            </div>
            <span className="font-bold text-base tracking-tight text-foreground">
              <span className="text-gold">GainzAlgo</span> V2 Alpha
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link, i) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="px-3 py-2 text-xs font-semibold tracking-widest text-muted-foreground hover:text-gold transition-colors duration-200"
                data-ocid={`nav.link.${i + 1}`}
              >
                {link}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "oklch(0.69 0.190 145 / 0.15)",
                color: "oklch(0.69 0.190 145)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-trade-green animate-pulse" />
              LIVE
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-ocid="nav.toggle"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="block px-4 py-2 text-xs font-semibold tracking-widest text-muted-foreground hover:text-gold transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

function XauSpotCard({
  prices,
  loading,
  lastUpdated,
}: {
  prices: LivePrices;
  loading: boolean;
  lastUpdated: Date | null;
}) {
  const [secsAgo, setSecsAgo] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setSecsAgo(
        lastUpdated
          ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
          : 0,
      );
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const xau = prices.XAUUSD;

  return (
    <div
      className="rounded-2xl border border-border p-4 min-w-[220px]"
      style={{ background: "oklch(0.14 0.038 255)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold tracking-widest text-muted-foreground">
          XAUUSD SPOT
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "oklch(0.69 0.190 145)" }}
          />
          <span
            className="text-xs font-bold"
            style={{ color: "oklch(0.69 0.190 145)" }}
          >
            LIVE
          </span>
        </div>
      </div>

      {loading || !xau ? (
        <div className="space-y-2">
          <div
            className="h-8 rounded-lg animate-pulse"
            style={{ background: "oklch(0.20 0.038 255)" }}
          />
          <div
            className="h-4 w-24 rounded animate-pulse"
            style={{ background: "oklch(0.20 0.038 255)" }}
          />
        </div>
      ) : (
        <>
          <FlashPrice
            value={`$${formatPrice("XAUUSD", xau.price)}`}
            direction={xau.direction}
            className="text-2xl font-black text-foreground block"
          />
          <div className="flex items-center gap-2 mt-1">
            <DirectionIcon direction={xau.direction} />
            <span
              className="text-sm font-bold"
              style={{
                color:
                  xau.direction === "up"
                    ? "oklch(0.69 0.190 145)"
                    : xau.direction === "down"
                      ? "oklch(0.58 0.220 27)"
                      : "oklch(0.68 0.025 240)",
              }}
            >
              {xau.changePercent}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {xau.change > 0 ? "+" : ""}
              {xau.change.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {xau.stale ? (
              <span style={{ color: "oklch(0.72 0.120 75)" }}>~ cached</span>
            ) : (
              <span>
                Updated {secsAgo < 5 ? "just now" : `${secsAgo}s ago`}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function HeroSection({
  prices,
  loading,
  lastUpdated,
}: {
  prices: LivePrices;
  loading: boolean;
  lastUpdated: Date | null;
}) {
  return (
    <section id="dashboard" className="relative overflow-hidden py-14 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5"
          style={{
            background:
              "radial-gradient(circle, oklch(0.72 0.120 75) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5"
          style={{
            background:
              "radial-gradient(circle, oklch(0.60 0.120 220) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-3.5 h-3.5 text-gold" />
              <LiveClock />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-4 leading-tight"
            >
              LIVE XAUUSD
              <br />
              <span className="text-gold">SIGNALS DASHBOARD</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed max-w-xl"
            >
              AI-Powered Forex Signals by{" "}
              <span className="text-gold font-semibold">
                GainzAlgo V2 Alpha
              </span>{" "}
              | XAUUSD Specialist
              <br />
              <span className="text-sm">
                AMD Session Analysis · Supply &amp; Demand Zones · RSI
                Confluence · Fibonacci Precision
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap gap-3"
            >
              {[
                {
                  icon: Target,
                  value: "94.7%",
                  label: "Accuracy",
                  color: "text-foreground",
                  iconColor: "text-gold",
                },
                {
                  icon: TrendingUp,
                  value: "+847",
                  label: "Pips/Week",
                  color: "text-trade-green",
                  iconColor: "text-trade-green",
                },
                {
                  icon: Shield,
                  value: "1:2.8",
                  label: "R:R Ratio",
                  color: "text-foreground",
                  iconColor: "text-gold",
                },
              ].map(({ icon: Icon, value, label, color, iconColor }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border"
                  style={{ background: "oklch(0.14 0.038 255)" }}
                >
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}

              {/* Live XAUUSD spot inline on mobile */}
              <div className="lg:hidden">
                <XauSpotCard
                  prices={prices}
                  loading={loading}
                  lastUpdated={lastUpdated}
                />
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:flex flex-col items-center justify-center gap-3"
          >
            <div
              className="relative w-48 h-48 rounded-3xl border border-border flex items-center justify-center overflow-hidden"
              style={{ background: "oklch(0.14 0.038 255)" }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, oklch(0.72 0.120 75 / 0.12) 0%, transparent 70%)",
                }}
              />
              <div className="text-center z-10">
                <div className="text-5xl font-black text-gold mb-1">V2</div>
                <div className="text-xs font-bold tracking-widest text-muted-foreground">
                  ALPHA
                </div>
                <div className="mt-3 flex justify-center gap-1">
                  {[1, 2, 3, 4].map((b) => (
                    <div
                      key={b}
                      className="w-1.5 rounded-full bg-gold"
                      style={{ height: `${b * 8}px`, opacity: 0.4 + b * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground font-semibold tracking-wider">
              ALGORITHM ENGINE
            </div>

            {/* Live XAUUSD spot card — desktop */}
            <XauSpotCard
              prices={prices}
              loading={loading}
              lastUpdated={lastUpdated}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function SignalCard({
  signal,
  livePrices,
  signalMeta,
}: {
  signal: (typeof SIGNALS)[0];
  livePrices?: LivePrices;
  signalMeta?: LiveSignalMeta | null;
}) {
  // For ACTIVE signals, use dynamic direction from live signal meta
  const isActive = signal.status === "ACTIVE";
  const dynamicType =
    isActive && signalMeta ? signalMeta.direction : signal.type;
  const isBuy = dynamicType === "BUY";

  const xau = livePrices?.XAUUSD;

  // Use live signal meta offsets when available, else fall back to static
  const slOffset =
    (isActive && signalMeta ? signalMeta.slOffset : signal.slOffset) ?? 12.5;
  const tp1Offset =
    (isActive && signalMeta ? signalMeta.tp1Offset : signal.tp1Offset) ?? 13.5;
  const tp2Offset =
    (isActive && signalMeta ? signalMeta.tp2Offset : signal.tp2Offset) ?? 27.0;

  let displayEntry = signal.entry;
  let displaySL = signal.sl;
  let displayTP1 = signal.tp1;
  let displayTP2 = signal.tp2;

  if (isActive && xau) {
    // Round to nearest 0.50 — standard XAUUSD entry precision
    const liveEntry = Math.round(xau.price * 2) / 2;
    const sl = isBuy ? liveEntry - slOffset : liveEntry + slOffset;
    const tp1 = isBuy ? liveEntry + tp1Offset : liveEntry - tp1Offset;
    const tp2 = isBuy ? liveEntry + tp2Offset : liveEntry - tp2Offset;
    const fmt = (n: number) =>
      n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    displayEntry = fmt(liveEntry);
    displaySL = fmt(sl);
    displayTP1 = fmt(tp1);
    displayTP2 = fmt(tp2);
  }

  // Build dynamic explanation for active signals
  let activeExplanation: string | null = null;
  if (isActive && xau) {
    const direction = isBuy ? "bullish" : "bearish";
    const confluenceZone = isBuy ? "demand" : "supply";
    const sessionPhase =
      signalMeta?.sessionPhase ??
      (isBuy ? "Asian/London overlap accumulation" : "London/NY distribution");
    const rsiLevel =
      signalMeta?.rsiLabel ??
      (isBuy ? "oversold (RSI 29.7)" : "overbought (RSI 72.4)");
    const fibLevel = signalMeta?.fibLevel ?? (isBuy ? "61.8%" : "78.6%");
    const confidence = signalMeta?.confidenceScore ?? 72;
    const rr = signalMeta?.rr ?? signal.rr;
    activeExplanation =
      `GainzAlgo V2 Alpha detected a high-confidence ${direction} setup (${confidence}% confidence). Standard entry at $${displayEntry} (nearest 0.50 level from live spot). ` +
      `Price reacting at a key ${confluenceZone} zone with ${fibLevel} Fibonacci confluence. ` +
      `RSI confirmed ${rsiLevel} on H1 with ${direction} divergence, aligning with AMD ${sessionPhase} phase. ` +
      `Risk defined at $${displaySL} (${slOffset} pts) with targets at $${displayTP1} (+${tp1Offset} pts) and $${displayTP2} (+${tp2Offset} pts). ` +
      `Risk/Reward ${rr} — signal and all values recalculate from live XAUUSD price every 8 seconds.`;
  }

  const priceGridItems = [
    { label: "Entry", value: displayEntry, color: "text-foreground" },
    { label: "Stop Loss", value: displaySL, color: "text-trade-red" },
    { label: "TP 1", value: displayTP1, color: "text-trade-green" },
    { label: "TP 2", value: displayTP2, color: "text-trade-green" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border overflow-hidden flex flex-col"
      style={{ background: "oklch(0.14 0.038 255)" }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: isBuy
            ? "linear-gradient(90deg, oklch(0.69 0.190 145 / 0.12) 0%, transparent 100%)"
            : "linear-gradient(90deg, oklch(0.58 0.220 27 / 0.12) 0%, transparent 100%)",
          borderBottom: "1px solid oklch(0.24 0.050 250)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-sm tracking-wider"
            style={{
              background: isBuy
                ? "oklch(0.69 0.190 145 / 0.2)"
                : "oklch(0.58 0.220 27 / 0.2)",
              color: isBuy ? "oklch(0.69 0.190 145)" : "oklch(0.58 0.220 27)",
            }}
          >
            {isBuy ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {dynamicType}
          </div>
          {isActive && signalMeta && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              {signalMeta.confidenceScore}% CONFIDENCE
            </span>
          )}
          <span className="font-bold text-foreground">{signal.asset}</span>
          <span className="font-mono text-sm text-muted-foreground">
            @ {displayEntry}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <Badge
              className="text-xs font-bold tracking-wider"
              style={{
                background: "oklch(0.72 0.120 75 / 0.2)",
                color: "oklch(0.72 0.120 75)",
                border: "1px solid oklch(0.72 0.120 75 / 0.4)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse mr-1.5" />
              ACTIVE
            </Badge>
          ) : (
            <Badge
              className="text-xs font-bold tracking-wider"
              style={{
                background: "oklch(0.69 0.190 145 / 0.2)",
                color: "oklch(0.69 0.190 145)",
                border: "1px solid oklch(0.69 0.190 145 / 0.4)",
              }}
            >
              CLOSED ✓
            </Badge>
          )}
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {priceGridItems.map((item) => (
          <div
            key={item.label}
            className="text-center p-2.5 rounded-xl"
            style={{
              background:
                item.label === "Current"
                  ? "oklch(0.16 0.045 255)"
                  : "oklch(0.16 0.038 255)",
              border:
                item.label === "Current"
                  ? "1px solid oklch(0.30 0.060 255 / 0.5)"
                  : "none",
            }}
          >
            <div className="text-xs text-muted-foreground mb-1 font-medium">
              {item.label}
            </div>
            <div className={`font-mono font-bold text-sm ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}
        {isActive && xau && (
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "oklch(0.69 0.190 145)" }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "oklch(0.69 0.190 145)" }}
            >
              LIVE VALUES · Updates every 8s from spot price
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 flex-1 flex flex-col gap-3">
        <div
          className="rounded-xl border border-border p-4"
          style={{ background: "oklch(0.12 0.032 255)" }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <Activity className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-bold tracking-widest text-gold uppercase">
              Algorithm Analysis
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {activeExplanation ?? signal.explanation}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">
              ID:{" "}
              <span className="text-foreground font-semibold">{signal.id}</span>
            </span>
            <span className="text-xs text-muted-foreground">{signal.time}</span>
          </div>
          {signal.pips && (
            <span className="text-sm font-bold text-trade-green font-mono">
              {signal.pips} pips
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PerformanceCard() {
  const stats = [
    {
      label: "Win Rate (Month)",
      value: "94.7%",
      sub: "36 / 38 trades",
      icon: Target,
      positive: true as boolean | null,
    },
    {
      label: "Pips Gain (Week)",
      value: "+847",
      sub: "pips this week",
      icon: TrendingUp,
      positive: true as boolean | null,
    },
    {
      label: "Avg. Winner",
      value: "+142",
      sub: "pips per trade",
      icon: BarChart2,
      positive: true as boolean | null,
    },
    {
      label: "R:R Ratio",
      value: "1:2.8",
      sub: "risk/reward",
      icon: Shield,
      positive: true as boolean | null,
    },
    {
      label: "Total Signals",
      value: "38",
      sub: "this month",
      icon: Activity,
      positive: null as boolean | null,
    },
    {
      label: "Algorithm",
      value: "V2 ALPHA",
      sub: "GainzAlgo engine",
      icon: Zap,
      positive: null as boolean | null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl border border-border overflow-hidden h-full"
      style={{ background: "oklch(0.14 0.038 255)" }}
    >
      <div
        className="px-5 py-4 border-b border-border"
        style={{
          background:
            "linear-gradient(90deg, oklch(0.72 0.120 75 / 0.08) 0%, transparent 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-gold" />
          <h3 className="font-bold text-sm tracking-wider text-foreground uppercase">
            Performance Overview
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          GainzAlgo V2 Alpha · XAUUSD
        </p>
      </div>

      <div className="p-5 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="p-3 rounded-xl border border-border"
            style={{ background: "oklch(0.12 0.032 255)" }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs text-muted-foreground font-medium">
                {s.label}
              </span>
            </div>
            <div
              className="text-lg font-black font-mono"
              style={{
                color:
                  s.positive === true
                    ? "oklch(0.69 0.190 145)"
                    : s.positive === false
                      ? "oklch(0.58 0.220 27)"
                      : "oklch(0.72 0.120 75)",
              }}
            >
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="px-5 pb-5">
        <div
          className="rounded-xl p-4 border border-border"
          style={{ background: "oklch(0.12 0.032 255)" }}
        >
          <div className="text-xs text-muted-foreground font-semibold mb-2 tracking-wider">
            MONTHLY WIN RATE
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-2 rounded-full"
              style={{ background: "oklch(0.24 0.050 250)" }}
            >
              <div
                className="h-2 rounded-full"
                style={{
                  width: "94.7%",
                  background:
                    "linear-gradient(90deg, oklch(0.69 0.190 145), oklch(0.72 0.120 75))",
                }}
              />
            </div>
            <span className="text-sm font-bold text-trade-green font-mono">
              94.7%
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>36 wins</span>
            <span>2 losses</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CandleChart({ livePrice }: { livePrice?: number }) {
  const [activeTimeframe, setActiveTimeframe] = useState("H1");

  const candles = [
    { open: 45, close: 62, high: 68, low: 40, bullish: true },
    { open: 62, close: 55, high: 66, low: 48, bullish: false },
    { open: 55, close: 72, high: 76, low: 52, bullish: true },
    { open: 72, close: 68, high: 78, low: 64, bullish: false },
    { open: 68, close: 80, high: 84, low: 65, bullish: true },
    { open: 80, close: 74, high: 86, low: 70, bullish: false },
    { open: 74, close: 85, high: 89, low: 72, bullish: true },
    { open: 85, close: 78, high: 90, low: 75, bullish: false },
    { open: 78, close: 88, high: 93, low: 76, bullish: true },
    { open: 88, close: 82, high: 92, low: 79, bullish: false },
    { open: 82, close: 91, high: 95, low: 80, bullish: true },
    { open: 91, close: 84, high: 95, low: 81, bullish: false },
    { open: 84, close: 76, high: 87, low: 73, bullish: false },
    { open: 76, close: 82, high: 86, low: 74, bullish: true },
    { open: 82, close: 70, high: 84, low: 66, bullish: false },
    { open: 70, close: 78, high: 82, low: 68, bullish: true },
    { open: 78, close: 66, high: 80, low: 62, bullish: false },
    { open: 66, close: 72, high: 76, low: 64, bullish: true },
    { open: 72, close: 62, high: 75, low: 59, bullish: false },
    { open: 62, close: 58, high: 64, low: 54, bullish: false },
  ];

  const chartH = 180;
  const maxVal = 100;
  const candleW = 14;
  const gap = 6;
  const totalWidth = candles.length * (candleW + gap);

  return (
    <section id="analysis" className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-6 rounded-full bg-gold" />
            <h2 className="text-xl font-black tracking-wider text-foreground uppercase">
              Market Analysis &amp; Technical Breakdown
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 ml-4">
            XAUUSD · GainzAlgo V2 Alpha · AMD Session Analysis
          </p>
        </motion.div>

        <div
          className="mb-6 rounded-2xl border border-border overflow-hidden"
          style={{ background: "oklch(0.14 0.038 255)" }}
        >
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gold" />
            <span className="text-sm font-bold text-foreground">
              XAUUSD Live Chart
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold ml-auto"
              style={{
                background: "oklch(0.69 0.190 145 / 0.15)",
                color: "oklch(0.69 0.190 145)",
              }}
            >
              ● TRADINGVIEW LIVE
            </span>
          </div>
          <TradingViewChart />
        </div>
        <div
          className="rounded-2xl border border-border overflow-hidden"
          style={{ background: "oklch(0.14 0.038 255)" }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-foreground">XAUUSD</span>
              <span className="text-xs text-muted-foreground">Gold vs USD</span>
              {livePrice && (
                <>
                  <span
                    className="text-sm font-black font-mono"
                    style={{ color: "oklch(0.72 0.120 75)" }}
                  >
                    ${formatPrice("XAUUSD", livePrice)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    SPOT
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1" data-ocid="chart.tab">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setActiveTimeframe(tf)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150"
                  style={{
                    background:
                      activeTimeframe === tf
                        ? "oklch(0.72 0.120 75 / 0.2)"
                        : "transparent",
                    color:
                      activeTimeframe === tf
                        ? "oklch(0.72 0.120 75)"
                        : "oklch(0.68 0.025 240)",
                    border:
                      activeTimeframe === tf
                        ? "1px solid oklch(0.72 0.120 75 / 0.4)"
                        : "1px solid transparent",
                  }}
                  data-ocid={`chart.tab.${tf.toLowerCase()}`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div
            className="p-5 relative"
            style={{ background: "oklch(0.11 0.030 257)" }}
          >
            <div
              className="absolute left-2 top-5 flex flex-col justify-between text-xs font-mono text-muted-foreground"
              style={{ height: chartH }}
            >
              {["3,260", "3,245", "3,230", "3,215", "3,200"].map((p) => (
                <span key={p}>{p}</span>
              ))}
            </div>

            <div className="ml-12 overflow-x-auto">
              <svg
                role="img"
                aria-label="XAUUSD candlestick chart with supply and demand zones"
                width={totalWidth}
                height={chartH + 20}
                className="overflow-visible"
              >
                {[0.2, 0.4, 0.6, 0.8].map((frac) => (
                  <line
                    key={frac}
                    x1={0}
                    y1={chartH * frac}
                    x2={totalWidth}
                    y2={chartH * frac}
                    stroke="oklch(0.24 0.050 250)"
                    strokeWidth={0.5}
                    strokeDasharray="4,4"
                  />
                ))}

                <rect
                  x={0}
                  y={chartH * (1 - 92 / maxVal)}
                  width={totalWidth}
                  height={chartH * (6 / maxVal)}
                  fill="oklch(0.58 0.220 27 / 0.07)"
                />
                <text
                  x={4}
                  y={chartH * (1 - 94 / maxVal)}
                  fontSize={9}
                  fill="oklch(0.58 0.220 27 / 0.8)"
                  fontFamily="Inter"
                >
                  SUPPLY 3,245–3,250
                </text>

                <rect
                  x={0}
                  y={chartH * (1 - 65 / maxVal)}
                  width={totalWidth}
                  height={chartH * (6 / maxVal)}
                  fill="oklch(0.69 0.190 145 / 0.07)"
                />
                <text
                  x={4}
                  y={chartH * (1 - 67 / maxVal)}
                  fontSize={9}
                  fill="oklch(0.69 0.190 145 / 0.8)"
                  fontFamily="Inter"
                >
                  DEMAND 3,193–3,198
                </text>

                {candles.map((c, i) => {
                  const x = i * (candleW + gap);
                  const openY = chartH * (1 - c.open / maxVal);
                  const closeY = chartH * (1 - c.close / maxVal);
                  const highY = chartH * (1 - c.high / maxVal);
                  const lowY = chartH * (1 - c.low / maxVal);
                  const bodyTop = Math.min(openY, closeY);
                  const bodyH = Math.max(2, Math.abs(openY - closeY));
                  const color = c.bullish
                    ? "oklch(0.69 0.190 145)"
                    : "oklch(0.58 0.220 27)";
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: candle data is static positional
                    <g key={i}>
                      <line
                        x1={x + candleW / 2}
                        y1={highY}
                        x2={x + candleW / 2}
                        y2={lowY}
                        stroke={color}
                        strokeWidth={1.5}
                      />
                      <rect
                        x={x}
                        y={bodyTop}
                        width={candleW}
                        height={bodyH}
                        fill={color}
                        rx={1}
                      />
                    </g>
                  );
                })}

                <g>
                  <rect
                    x={candles.length * (candleW + gap) - 60}
                    y={chartH * (1 - 94 / maxVal) - 16}
                    width={50}
                    height={16}
                    rx={4}
                    fill="oklch(0.58 0.220 27 / 0.9)"
                  />
                  <text
                    x={candles.length * (candleW + gap) - 38}
                    y={chartH * (1 - 94 / maxVal) - 5}
                    fontSize={9}
                    fill="white"
                    fontWeight="bold"
                    fontFamily="Inter"
                    textAnchor="middle"
                  >
                    ▼ SELL
                  </text>
                </g>

                <g>
                  <rect
                    x={40}
                    y={chartH * (1 - 64 / maxVal)}
                    width={46}
                    height={16}
                    rx={4}
                    fill="oklch(0.69 0.190 145 / 0.9)"
                  />
                  <text
                    x={63}
                    y={chartH * (1 - 64 / maxVal) + 11}
                    fontSize={9}
                    fill="white"
                    fontWeight="bold"
                    fontFamily="Inter"
                    textAnchor="middle"
                  >
                    ▲ BUY
                  </text>
                </g>
              </svg>
            </div>

            <div className="flex gap-3 mt-4 flex-wrap">
              {[
                {
                  label: "ACCUMULATION",
                  color: "oklch(0.69 0.190 145)",
                  desc: "Asian session buy orders",
                },
                {
                  label: "MANIPULATION",
                  color: "oklch(0.72 0.120 75)",
                  desc: "False breakout sweep",
                },
                {
                  label: "DISTRIBUTION",
                  color: "oklch(0.58 0.220 27)",
                  desc: "London/NY sell phase",
                },
              ].map((phase) => (
                <div
                  key={phase.label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border"
                  style={{ background: "oklch(0.14 0.038 255)" }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: phase.color }}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{ color: phase.color }}
                  >
                    {phase.label}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {phase.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentSignals({ liveXauPrice }: { liveXauPrice?: number }) {
  return (
    <section className="py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gold" />
            <h2 className="text-xl font-black tracking-wider text-foreground uppercase">
              Recent Signal History
            </h2>
          </div>
        </motion.div>

        <div
          className="rounded-2xl border border-border overflow-hidden"
          style={{ background: "oklch(0.14 0.038 255)" }}
        >
          <Table>
            <TableHeader>
              <TableRow
                className="border-border hover:bg-transparent"
                style={{ background: "oklch(0.12 0.032 255)" }}
              >
                <TableHead className="text-xs font-bold tracking-widest text-muted-foreground w-12">
                  #
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest text-muted-foreground">
                  TYPE
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest text-muted-foreground">
                  ASSET
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest text-muted-foreground">
                  ENTRY
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest text-muted-foreground">
                  EXIT
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest text-muted-foreground">
                  PIPS
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest text-muted-foreground">
                  RESULT
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest text-muted-foreground">
                  DATE
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_SIGNALS.map((sig, i) => {
                // For the ACTIVE row, compute live entry/exit/pips from live price
                let entry = sig.entry;
                let exit_ = sig.exit;
                let pips = sig.pips;
                if (sig.result === "ACTIVE" && liveXauPrice) {
                  const liveEntry = Math.round(liveXauPrice * 2) / 2; // round to nearest 0.50
                  const tp2Offset = 27.0;
                  const liveExit =
                    sig.type === "BUY"
                      ? liveEntry + tp2Offset
                      : liveEntry - tp2Offset;
                  const livePips = Math.round((liveEntry - liveExit) * 10);
                  entry = liveEntry.toFixed(2);
                  exit_ = liveExit.toFixed(2);
                  pips = `+${livePips}`;
                } else {
                  exit_ = sig.exit;
                }
                return (
                  <TableRow
                    key={sig.num}
                    className="border-border"
                    style={{
                      background:
                        i % 2 === 0
                          ? "transparent"
                          : "oklch(0.12 0.032 255 / 0.5)",
                    }}
                    data-ocid={`signals.item.${i + 1}`}
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {sig.num}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          background:
                            sig.type === "BUY"
                              ? "oklch(0.69 0.190 145 / 0.15)"
                              : "oklch(0.58 0.220 27 / 0.15)",
                          color:
                            sig.type === "BUY"
                              ? "oklch(0.69 0.190 145)"
                              : "oklch(0.58 0.220 27)",
                        }}
                      >
                        {sig.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-foreground">
                      {sig.asset}
                    </TableCell>
                    <TableCell
                      className="text-xs font-mono"
                      style={{
                        color:
                          sig.result === "ACTIVE" && liveXauPrice
                            ? "oklch(0.90 0.120 75)"
                            : undefined,
                      }}
                    >
                      {entry}
                      {sig.result === "ACTIVE" && liveXauPrice && (
                        <span
                          className="ml-1 text-[9px] animate-pulse"
                          style={{ color: "oklch(0.69 0.190 145)" }}
                        >
                          ●LIVE
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-xs font-mono"
                      style={{
                        color:
                          sig.result === "ACTIVE" && liveXauPrice
                            ? "oklch(0.90 0.120 75)"
                            : undefined,
                      }}
                    >
                      {exit_}
                      {sig.result === "ACTIVE" && liveXauPrice && (
                        <span
                          className="ml-1 text-[9px] animate-pulse"
                          style={{ color: "oklch(0.69 0.190 145)" }}
                        >
                          ●LIVE
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs font-bold font-mono"
                        style={{
                          color: pips.startsWith("+")
                            ? "oklch(0.69 0.190 145)"
                            : "oklch(0.58 0.220 27)",
                        }}
                      >
                        {pips}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          background:
                            sig.result === "WIN"
                              ? "oklch(0.69 0.190 145 / 0.15)"
                              : sig.result === "LOSS"
                                ? "oklch(0.58 0.220 27 / 0.15)"
                                : "oklch(0.72 0.120 75 / 0.15)",
                          color:
                            sig.result === "WIN"
                              ? "oklch(0.69 0.190 145)"
                              : sig.result === "LOSS"
                                ? "oklch(0.58 0.220 27)"
                                : "oklch(0.72 0.120 75)",
                        }}
                      >
                        {sig.result}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sig.date}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  return (
    <footer
      className="border-t border-border mt-8"
      style={{ background: "oklch(0.10 0.028 258)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-gold" />
              <span className="font-bold text-foreground">
                <span className="text-gold">GainzAlgo</span> V2 Alpha
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI-powered XAUUSD trading signals using AMD session analysis,
              supply &amp; demand zones, RSI confluence, and Fibonacci
              precision. 94.7% accuracy rate.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold tracking-widest text-muted-foreground mb-3 uppercase">
              Legal
            </div>
            <div className="space-y-2">
              {[
                "Risk Disclosure",
                "Terms of Service",
                "Contact Us",
                "Privacy Policy",
              ].map((link) => (
                <button
                  key={link}
                  type="button"
                  className="block text-xs text-muted-foreground hover:text-gold transition-colors text-left"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold tracking-widest text-muted-foreground mb-3 uppercase">
              Follow Us
            </div>
            <div className="flex gap-3">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Send, label: "Telegram" },
                { icon: Globe, label: "Website" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold transition-all duration-200"
                  style={{ background: "oklch(0.14 0.038 255)" }}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <Separator
          className="mb-6"
          style={{ background: "oklch(0.24 0.050 250)" }}
        />

        <div
          className="flex items-start gap-2 p-3 rounded-xl border border-border mb-6"
          style={{ background: "oklch(0.58 0.220 27 / 0.06)" }}
        >
          <AlertTriangle className="w-4 h-4 text-trade-red shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-bold text-trade-red">HIGH RISK WARNING:</span>{" "}
            Forex trading and CFDs carry a high level of risk to your capital.
            Past performance is not indicative of future results. Trading
            signals are for informational purposes only. You should not trade
            with capital you cannot afford to lose.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {year} GainzAlgo V2 Alpha. Built with ❤️ using{" "}
            <a
              href={caffeineUrl}
              className="text-gold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              caffeine.ai
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            All rights reserved. For educational purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const { prices, loading, lastUpdated, signalMeta } = useLivePrices();

  return (
    <div className="min-h-screen">
      <NavBar />
      <HeroSection
        prices={prices}
        loading={loading}
        lastUpdated={lastUpdated}
      />
      <TradingViewTicker />

      <section id="live-signals" className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 rounded-full bg-gold" />
              <h2 className="text-xl font-black tracking-wider text-foreground uppercase">
                Live XAUUSD Trading Signals
              </h2>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: "oklch(0.69 0.190 145 / 0.15)",
                  color: "oklch(0.69 0.190 145)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-trade-green animate-pulse" />
                LIVE
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-4">
              Powered by GainzAlgo V2 Alpha · AMD Session Analysis · Updated in
              real-time
            </p>
          </motion.div>

          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            data-ocid="signals.section"
          >
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {SIGNALS.map((signal, i) => (
                <div key={signal.id} data-ocid={`signals.card.${i + 1}`}>
                  <SignalCard
                    signal={signal}
                    livePrices={prices}
                    signalMeta={signal.status === "ACTIVE" ? signalMeta : null}
                  />
                </div>
              ))}
            </div>
            <div id="performance">
              <PerformanceCard />
            </div>
          </div>
        </div>
      </section>

      <CandleChart livePrice={prices.XAUUSD?.price} />
      <RecentSignals liveXauPrice={prices.XAUUSD?.price} />
      <Footer />
    </div>
  );
}
