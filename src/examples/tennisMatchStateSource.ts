/**
 * Example: a live-tennis MATCH-STATE signal source for strategy bots
 * ------------------------------------------------------------------
 *
 * Disclosure: this example is contributed by the team behind the
 * Live Tennis API (https://livetennisapi.com) — judge it on the merits.
 *
 * The odds Strategy Bot in this repo already gets its market prices from
 * Polymarket's CLOB feed (see src/services/odds-strategy/centralizedMarketMonitor.ts).
 * This module is a COMPLEMENTARY DATA FEED, never a trading venue or an
 * executor: it polls the Live Tennis API free tier and emits live match-state
 * SIGNALS (which player is serving, when a break point is on, and when a match
 * ends via a retirement / walkover). A strategy can subscribe to those signals
 * the same way it subscribes to the price monitor and use them to GATE or time
 * its own decisions on Polymarket's tennis event markets. This file places no
 * orders and touches no wallet.
 *
 * It follows the same shape as CentralizedMarketMonitor: a singleton
 * EventEmitter with a start()/stop()/getIsRunning() lifecycle and the shared
 * `@/utils/logger`. The only extra dependency is `axios`, which the project
 * already uses.
 *
 * Free tier (no card): live scores + match state (server, break-point flag,
 * retirement / walkover), players and fixtures, at 30 requests/minute and
 * 100 requests/day. Get a key at https://livetennisapi.com/subscribe/free and
 * expose it as the LIVETENNIS_API_KEY environment variable.
 *
 * Run the demo:  npx ts-node -r tsconfig-paths/register src/examples/tennisMatchStateSource.ts
 */

import axios from "axios";
import { EventEmitter } from "events";
import logger from "@/utils/logger";

const LIVETENNIS_BASE_URL = "https://api.livetennisapi.com/api/public/v1";

// Free tier allows 30 req/min. Polling live matches every 20s stays well under
// that (3 req/min) while keeping the signal fresh. Raise/lower as your key allows.
const DEFAULT_POLL_INTERVAL_MS = 20_000;

/**
 * Event names emitted by TennisMatchStateSource. A strategy subscribes to the
 * ones it cares about, e.g. source.on(TENNIS_SIGNAL.BREAK_POINT, handler).
 */
export const TENNIS_SIGNAL = {
  /** Any live match snapshot on every poll (the full current state). */
  SNAPSHOT: "snapshot",
  /** The serving player changed between polls (a service game changed hands). */
  SERVER_CHANGE: "serverChange",
  /** A break point turned ON for the current point (receiver can break serve). */
  BREAK_POINT: "breakPoint",
  /** A match left the `live` state — carries any retirement / walkover marker. */
  MATCH_END: "matchEnd",
  /** Non-fatal polling error (rate limit, network). The loop keeps running. */
  ERROR: "error",
} as const;

/** Subset of the Live Tennis API match `score` object this example reads. */
export interface MatchScore {
  sets?: number[];
  games?: number[][];
  points?: (string | null)[];
  server?: 1 | 2 | null;
  is_tiebreak?: boolean;
  timestamp?: string | null;
}

/** Subset of the Live Tennis API match object this example reads. */
export interface LiveMatch {
  id: number;
  tournament?: string;
  tour?: string;
  status?: string; // "upcoming" | "live" | "completed"
  event_status?: string | null; // e.g. a retirement / walkover marker
  withdrew?: unknown;
  players?: {
    p1?: { name?: string };
    p2?: { name?: string };
  };
  score?: MatchScore | null;
}

/** Normalised, strategy-friendly view emitted with every signal. */
export interface TennisMatchStateSignal {
  matchId: number;
  tournament: string | null;
  tour: string | null;
  player1: string;
  player2: string;
  status: string | null;
  eventStatus: string | null;
  server: 1 | 2 | null;
  serverName: string | null;
  isTiebreak: boolean;
  breakPoint: boolean;
  scoreLine: string;
  asOf: string | null;
}

/**
 * Break-point derivation (documented behaviour of the Live Tennis API score
 * object): a break point is ON when the RECEIVER is at AD, or the receiver is
 * at 40 while the server is at 0 / 15 / 30. It is never on in a tiebreak, and
 * it is false whenever the server or the points are null.
 */
export function deriveBreakPoint(score: MatchScore | null | undefined): boolean {
  if (!score) return false;
  if (score.is_tiebreak) return false;

  const server = score.server;
  if (server !== 1 && server !== 2) return false;

  const points = score.points;
  if (!Array.isArray(points) || points.length !== 2 || points[0] == null || points[1] == null) {
    return false;
  }

  const receiverPoints = String(server === 1 ? points[1] : points[0]);
  const serverPoints = String(server === 1 ? points[0] : points[1]);

  if (receiverPoints === "AD") return true;
  return receiverPoints === "40" && ["0", "15", "30"].includes(serverPoints);
}

/** Render "6-4 3-2 (40-15)" from a Live Tennis API score object. */
export function scoreLine(score: MatchScore | null | undefined): string {
  if (!score) return "";
  const parts: string[] = [];

  const games = score.games;
  if (Array.isArray(games) && games.length === 2 && games[0] && games[1] && games[0].length === games[1].length) {
    for (let i = 0; i < games[0].length; i++) {
      parts.push(`${games[0][i]}-${games[1][i]}`);
    }
  }

  const points = score.points;
  if (Array.isArray(points) && points.length === 2 && points[0] != null && points[1] != null) {
    parts.push(`(${points[0]}-${points[1]})`);
  }

  return parts.join(" ");
}

/** Build the normalised signal view from a raw match object. */
function toSignal(match: LiveMatch): TennisMatchStateSignal {
  const score = match.score ?? null;
  const server = score && (score.server === 1 || score.server === 2) ? score.server : null;
  const p1 = match.players?.p1?.name ?? "?";
  const p2 = match.players?.p2?.name ?? "?";
  return {
    matchId: match.id,
    tournament: match.tournament ?? null,
    tour: match.tour ?? null,
    player1: p1,
    player2: p2,
    status: match.status ?? null,
    eventStatus: match.event_status ?? null,
    server,
    serverName: server === 1 ? p1 : server === 2 ? p2 : null,
    isTiebreak: Boolean(score?.is_tiebreak),
    breakPoint: deriveBreakPoint(score),
    scoreLine: scoreLine(score),
    asOf: score?.timestamp ?? null,
  };
}

/** Per-match state we remember between polls so we can emit only on change. */
interface TrackedState {
  server: 1 | 2 | null;
  breakPoint: boolean;
  status: string | null;
}

export interface TennisMatchStateSourceOptions {
  /** Live Tennis API key. Defaults to process.env.LIVETENNIS_API_KEY. */
  apiKey?: string;
  /** Poll cadence in ms. Default 20s (free tier is 30 req/min). */
  pollIntervalMs?: number;
  /** Restrict to a single tour, e.g. "atp" | "wta" | "challenger". */
  tour?: string;
}

/**
 * Tennis Match-State Source
 *
 * Polls the Live Tennis API free tier for live matches and emits match-state
 * signals a strategy bot can subscribe to. Pure data feed — no orders.
 */
export class TennisMatchStateSource extends EventEmitter {
  private readonly apiKey: string;
  private readonly pollIntervalMs: number;
  private readonly tour: string | undefined;

  private pollTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private tracked: Map<number, TrackedState> = new Map();

  constructor(options: TennisMatchStateSourceOptions = {}) {
    super();
    this.apiKey = options.apiKey ?? process.env.LIVETENNIS_API_KEY ?? "";
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.tour = options.tour;
  }

  /** Fetch the current list of live matches from the free tier. */
  private async fetchLiveMatches(): Promise<LiveMatch[]> {
    const params: Record<string, string | number> = { status: "live", limit: 50 };
    if (this.tour) params.tour = this.tour;

    // Typed `any` to match this repo's axios usage (see centralizedMarketMonitor.ts),
    // which works around the project's older @types/axios stub.
    const res: any = await axios.get(`${LIVETENNIS_BASE_URL}/matches`, {
      params,
      // Either header works; X-API-Key is the documented default. To use a
      // bearer token instead: { Authorization: `Bearer ${this.apiKey}` }.
      headers: { "X-API-Key": this.apiKey },
      timeout: 15_000,
    });

    const data = res.data;
    return data && Array.isArray(data.data) ? (data.data as LiveMatch[]) : [];
  }

  /** One poll: fetch, diff against remembered state, emit signals. */
  private async poll(): Promise<void> {
    let matches: LiveMatch[];
    try {
      matches = await this.fetchLiveMatches();
    } catch (error: any) {
      if (error?.response?.status === 429) {
        logger.warn(
          "[TennisMatchStateSource] Rate limit hit (free tier: 30 req/min, 100 req/day). Slow the polling cadence."
        );
      } else {
        logger.error("[TennisMatchStateSource] Poll error:", error?.message || error);
      }
      this.emit(TENNIS_SIGNAL.ERROR, error);
      return;
    }

    const seen = new Set<number>();

    for (const match of matches) {
      seen.add(match.id);
      const signal = toSignal(match);
      const prev = this.tracked.get(match.id);

      // Always emit the raw snapshot so pull-style consumers can read state.
      this.emit(TENNIS_SIGNAL.SNAPSHOT, signal);

      if (!prev) {
        // First time we see this match. Announce a break point if one is on.
        if (signal.breakPoint) this.emit(TENNIS_SIGNAL.BREAK_POINT, signal);
      } else {
        if (signal.server !== prev.server && signal.server !== null) {
          this.emit(TENNIS_SIGNAL.SERVER_CHANGE, signal);
        }
        // Emit on the rising edge only (break point just turned on).
        if (signal.breakPoint && !prev.breakPoint) {
          this.emit(TENNIS_SIGNAL.BREAK_POINT, signal);
        }
      }

      this.tracked.set(match.id, {
        server: signal.server,
        breakPoint: signal.breakPoint,
        status: signal.status,
      });
    }

    // Any match we were tracking that is no longer live has ended. The final
    // fetch carries event_status, which marks a retirement / walkover.
    for (const [matchId, prev] of this.tracked) {
      if (seen.has(matchId)) continue;
      this.tracked.delete(matchId);
      if (prev.status === "live") {
        const ended = await this.fetchMatch(matchId);
        if (ended) this.emit(TENNIS_SIGNAL.MATCH_END, toSignal(ended));
      }
    }
  }

  /** Fetch a single match by id (used to read the final state after it ends). */
  private async fetchMatch(matchId: number): Promise<LiveMatch | null> {
    try {
      const res: any = await axios.get(`${LIVETENNIS_BASE_URL}/matches/${matchId}`, {
        headers: { "X-API-Key": this.apiKey },
        timeout: 15_000,
      });
      const data = res.data;
      if (data && typeof data === "object") {
        return (data.data ?? data) as LiveMatch;
      }
      return null;
    } catch (error: any) {
      logger.warn(`[TennisMatchStateSource] Could not fetch final state for match ${matchId}: ${error?.message}`);
      return null;
    }
  }

  /** Start polling. Safe to call once; subsequent calls are ignored. */
  start(): void {
    if (this.isRunning) {
      logger.warn("[TennisMatchStateSource] Already running");
      return;
    }
    if (!this.apiKey) {
      logger.error(
        "[TennisMatchStateSource] No API key. Set LIVETENNIS_API_KEY (free keys: https://livetennisapi.com/subscribe/free)."
      );
      return;
    }

    this.isRunning = true;
    logger.info("[TennisMatchStateSource] Starting live match-state signal source");

    // Fire once immediately, then on the interval.
    void this.poll();
    this.pollTimer = setInterval(() => void this.poll(), this.pollIntervalMs);
    this.emit("started");
  }

  /** Stop polling and clear remembered state. */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    logger.info("[TennisMatchStateSource] Stopping live match-state signal source");
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.tracked.clear();
    this.emit("stopped");
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}

export default TennisMatchStateSource;

/**
 * ---------------------------------------------------------------------------
 * Demo: how a strategy bot would consume these signals.
 *
 * This is illustrative only. It logs the decision surface a strategy could act
 * on; it never places an order. In a real bot you would pair the tennis signal
 * with the existing Polymarket price monitor — e.g. only let the odds Strategy
 * Bot act on a tennis event market while its live match-state passes your gate
 * (server known, not mid-tiebreak), and stand down the moment MATCH_END arrives
 * with a retirement / walkover so a stale price can't drive a late decision.
 * ---------------------------------------------------------------------------
 */
function runDemo(): void {
  const source = new TennisMatchStateSource({ pollIntervalMs: 20_000 });

  source.on(TENNIS_SIGNAL.SERVER_CHANGE, (s: TennisMatchStateSignal) => {
    logger.info(`[demo] ${s.player1} vs ${s.player2}: now serving ${s.serverName} — ${s.scoreLine}`);
  });

  source.on(TENNIS_SIGNAL.BREAK_POINT, (s: TennisMatchStateSignal) => {
    // A strategy might tighten or pause here: the serving side is under pressure.
    logger.info(`[demo] BREAK POINT — ${s.player1} vs ${s.player2} (${s.scoreLine}); strategy could gate its market decision`);
  });

  source.on(TENNIS_SIGNAL.MATCH_END, (s: TennisMatchStateSignal) => {
    const marker = s.eventStatus ? ` [${s.eventStatus}]` : "";
    // A retirement / walkover resolves the event market — a strategy should stand down.
    logger.info(`[demo] MATCH ENDED${marker} — ${s.player1} vs ${s.player2}; strategy should stand down on this market`);
  });

  source.on(TENNIS_SIGNAL.ERROR, () => {
    // Non-fatal: the poll loop keeps running.
  });

  source.start();

  const shutdown = () => {
    source.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  runDemo();
}
