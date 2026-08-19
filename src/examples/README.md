# Examples

Small, self-contained modules that show how to feed extra signals into a
strategy bot. They are **not** wired into `src/index.ts` and place **no**
orders — run them on their own.

## `tennisMatchStateSource.ts` — live-tennis match-state signals

> Disclosure: contributed by the team behind the
> [Live Tennis API](https://livetennisapi.com) — judge it on the merits.

The odds Strategy Bot already gets its market prices from Polymarket's CLOB
feed (`src/services/odds-strategy/centralizedMarketMonitor.ts`). This example is
a **complementary data feed**, never a trading venue or an executor: it polls
the Live Tennis API free tier and emits live **match-state signals** a strategy
can subscribe to the same way it subscribes to the price monitor:

| Signal | When it fires | How a strategy might use it |
| --- | --- | --- |
| `serverChange` | the serving player changed between polls | context for who is under pressure |
| `breakPoint` | a break point turned on (receiver can break serve) | tighten or pause a market decision |
| `matchEnd` | a match left the `live` state (carries any retirement / walkover marker) | stand down on that event market |
| `snapshot` | every poll, for every live match | pull-style reads of current state |

It mirrors the conventions of `CentralizedMarketMonitor`: a singleton
`EventEmitter` with `start()` / `stop()` / `getIsRunning()` and the shared
`@/utils/logger`. The only extra dependency is `axios`, already used in the
project.

### Free tier

Live scores + match state (server, break-point flag, retirement / walkover),
players and fixtures — no card, 30 requests/minute, 100 requests/day. Get a key
at <https://livetennisapi.com/subscribe/free> and expose it as an environment
variable:

```bash
export LIVETENNIS_API_KEY=your_key_here
npx ts-node -r tsconfig-paths/register src/examples/tennisMatchStateSource.ts
```

### Using it in a strategy

```ts
import { TennisMatchStateSource, TENNIS_SIGNAL } from "@/examples/tennisMatchStateSource";

const tennis = new TennisMatchStateSource({ tour: "atp" });

tennis.on(TENNIS_SIGNAL.MATCH_END, (s) => {
  // A retirement / walkover resolves the event market — stand this bot down.
  // e.g. strategyBotStateManager.removeStrategyBot(botIdForMatch(s.matchId));
});

tennis.start();
```

The tennis feed only informs *your* decision; execution stays entirely inside
this repo's existing Polymarket order path. A larger, observe-only reference
toolkit lives at
<https://github.com/livetennisapi/polymarket-tennis> (MIT).
