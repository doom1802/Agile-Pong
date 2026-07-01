# Agile Pong

Agile Pong is an internal **Agile Lab** web app for tracking ping pong matches between colleagues. The idea is to have an Elo-style ranking system, but with a lighter tone: serious rankings when it matters, fun stats, badges, rivalries, and a pre-match "versus screen".

**Core tradeoff:** ranked matches should be trustworthy; unranked matches should be flexible. Ranked matches need rules that are hard to manipulate. Unranked matches should be quick to log and useful for history, light badges, and social stats.

## Decisions

- Product name: **Agile Pong**.
- Company: **Agile Lab**.
- Login: company email + one-time code by email, no passwords.
- Allowed email domain: `@agilelab.it`.
- Session: long-lived, roughly 30 days.
- Profile: first name, last name, unique case-insensitive nickname, profile photo, usual office/location as free text.
- Admins exist in the MVP and are marked by a database field.
- Match types: singles and doubles.
- Rankings: separate singles and doubles rankings.
- Modes: ranked or unranked/friendly.
- Draws: no, matches continue until there is a valid winner.
- Ranked matches: rules are chosen before the match.
- Ranked point targets: 11 or 21.
- Ranked match length: best of 3 or best of 5.
- Ranked matches: every set score is recorded.
- Match results require in-app confirmation from the other side.
- Regular users cannot edit or delete submitted matches.
- Admins can edit or delete submitted matches.
- Seasons last 2 months.
- Unranked matches: flexible scores and flexible number of sets.
- Unranked matches: never change official rating.
- Initial deployment idea: Vercel for the app, Supabase for DB/storage if it fits the free-tier constraints.

## Principles

### Do Not Invent Big Rules Silently

If a choice affects ranking, trust, or the main UX, ask. If it is a small detail, choose the simplest coherent default.

Useful questions:

- Is this for ranked matches, unranked matches, or both?
- Should it affect rating, badges, stats, or only history?
- Does it make the ranking fairer, or just more complicated?
- Can it be abused by repeatedly playing the same person or team?

### Serious Ranking, Fun App

The ranking needs clear rules. Badges, insights, and rivalries should add flavor, not clutter.

- Ranked matches always store rating before, rating after, and rating delta.
- Unranked matches stay in history but never touch Elo.
- Reduced-weight or zero-rating matches must be clearly marked.
- The tone can be playful, but should stay workplace-safe.

### Mobile First

The app will probably be used near the table, from a phone.

- Mobile: create match, preview, enter score, confirm.
- Desktop: dashboard, leaderboards, profiles, filters, analysis.

## Auth And Profile

Login flow:

1. User enters company email.
2. App checks the domain against the allowlist, initially only `@agilelab.it`.
3. App generates a one-time numeric code.
4. Code is sent by email.
5. User enters the code.
6. If valid, app creates a long-lived session.
7. First-time users complete their profile.

Security defaults:

- 6-digit code.
- Code expires after 10 minutes.
- Max 5 attempts.
- Rate-limit code requests.
- Store code and session token hashes, not raw values.
- Use `httpOnly`, `secure`, `sameSite=lax` cookies.

Display name priority:

1. Nickname.
2. First name and last name.
3. Email local part.

Office/location is free text, but the UI can suggest already-used values to avoid too many variants.

Admins are regular users with an admin flag in the database. In the MVP, admins can correct or delete submitted matches; regular users cannot.

## Matches

### Ranked Singles

Before the match, one player creates the match:

- player A
- player B
- points to 11 or 21
- best of 3 or 5

The match becomes active immediately. Only its creator sees the prematch automatically; every participant can submit the result.

After the match:

- set scores
- winner derived from sets
- result confirmation from the other side
- rating updated after confirmation

### Ranked Doubles

Before the match, one player creates the match:

- team A: two players
- team B: two players
- points to 11 or 21
- best of 3 or 5

The match becomes active immediately without requiring confirmation from the other team.

In doubles, each player has their own `doublesRating`. Team rating is the average of the two players.

### Unranked Matches

Unranked matches are intentionally flexible:

- singles or doubles
- arbitrary point target
- arbitrary number of sets
- no rating impact

They still count for history, activity, light stats, head-to-head context labeled as unranked, and some non-competitive badges.

Unranked matches should also use the confirmation flow when another side is involved, but they remain flexible in score format and never affect rating.

## Elo

Initial rating:

```ts
const INITIAL_RATING = 1000
```

Expected score:

```ts
expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
```

Base delta:

```ts
baseDeltaA = kFactor * (actualA - expectedA)
```

K-factor:

```txt
first 8 ranked matches: 56
normal: 40
after 40 ranked matches: 32
```

For doubles, calculate expected score using average team ratings, then apply the same delta to both players on the team using their doubles rating.

### Multipliers

Set multiplier:

```txt
best of 3:
2-1 -> 1.00
2-0 -> 1.12

best of 5:
3-2 -> 1.00
3-1 -> 1.08
3-0 -> 1.18
```

Point multiplier, normalized so 11-point and 21-point sets can coexist:

```ts
dominance = (winnerPoints - loserPoints) / (winnerPoints + loserPoints)
pointMultiplier = 1 + Math.min(0.18, dominance * 0.7)
```

Format multiplier:

```txt
points to 11 -> 1.00
points to 21 -> 1.08
```

Final delta:

```ts
combined =
  setMultiplier *
  pointMultiplier *
  formatMultiplier *
  antiFarmingMultiplier

finalMultiplier = Math.min(1.30, combined)
ratingDelta = baseDelta * finalMultiplier
```

Winner gets `+delta`; loser gets `-delta`.

## Anti-Farming

Against the same singles opponent, or the same doubles team matchup, within the last 7 days:

```txt
matches 1-3 -> full rating weight
matches 4-6 -> 50% rating weight
matches 7+  -> recorded, but zero rating
```

Daily cap:

```txt
max +80 rating per player per day
max -80 rating per player per day
```

Official leaderboard eligibility:

```txt
singles -> at least 5 ranked matches and 3 distinct opponents
doubles -> at least 5 ranked matches and 3 distinct opposing teams
```

Players who do not meet the requirements can still appear, but as provisional.

## Badges

Suggested badges:

- **Hot Hand**: 3 wins in a row.
- **On Fire**: 5 wins in a row.
- **Clutch**: wins a set at deuce.
- **Ice Veins**: wins the deciding set at deuce.
- **Comeback**: loses the first set and wins the match.
- **Clean Sweep**: wins 2-0 or 3-0.
- **Giant Slayer**: beats a player/team with at least +150 rating.
- **Upset Artist**: 3 upsets in a season.
- **Wall**: allows very few points in a dominant win.
- **Marathon**: match with unusually high total points.
- **Rivalry**: at least 5 seasonal matches between the same players/teams.
- **Doubles Chemistry**: same pair wins 3 doubles matches.
- **Carry Mode**: doubles win against a much stronger team.

Rule: rating-related badges require ranked matches; social badges may include unranked matches. Every badge should explain why it was awarded.

## Pre-Match Preview

Before a ranked match, show an animated versus screen.

Mobile:

- player/team A
- rating and recent form
- VS with win probability
- player/team B
- potential Elo delta
- insight cards entering one at a time

Desktop:

- left panel for player/team A
- center with probability, format, expected delta
- right panel for player/team B
- lower area with head-to-head, form, badges, trends

Useful insights:

- last 5 matches
- current streak
- head-to-head
- estimated Elo delta
- upset opportunity
- average points scored/allowed per set
- deciding-set record
- deuce record
- clean sweeps for/against
- best doubles partner
- most frequent rivalry

Examples:

```txt
Luca has won 4 of his last 5 ranked matches.
Giulia leads the head-to-head 3-1 this season.
If the underdog wins, they can gain around +31.
This matchup has gone to a deciding set in the last 2 matches.
Team A has a 75% win rate together.
```

## Base Data Model

```txt
users
- id, email, first_name, last_name, nickname
- avatar_url, office_location
- is_admin
- created_at, updated_at, last_login_at

login_codes
- id, email, code_hash
- expires_at, consumed_at, attempts, created_at

sessions
- id, user_id, token_hash
- expires_at, last_seen_at, created_at, revoked_at

player_ratings
- user_id
- singles_rating, doubles_rating
- singles_ranked_matches, doubles_ranked_matches
- created_at, updated_at

matches
- id
- mode: ranked | unranked
- type: singles | doubles
- status: ready | submitted | confirmed | disputed | cancelled
- points_to_win nullable
- best_of nullable
- winner_side: A | B
- played_at
- created_by_user_id
- rating_applied
- anti_farming_factor
- submitted_by_user_id nullable
- confirmed_by_user_id nullable
- created_at

match_players
- match_id, user_id
- side: A | B
- position: 1 | 2
- rating_kind: singles | doubles | none
- rating_before, rating_after, rating_delta nullable

match_sets
- match_id
- set_number
- side_a_points
- side_b_points

match_events
- id, match_id, user_id
- type: created | submitted | confirmed | disputed | cancelled | admin_edited | admin_deleted
- created_at

seasons
- id, name
- starts_at, ends_at
- status: scheduled | active | completed
```

Seasons last 2 months by default. Admin and moderation functionality exists in the MVP only where needed for match correction/deletion.

## MVP

First useful version:

- email code login
- profile onboarding
- singles and doubles leaderboard
- ranked singles creation
- ranked doubles creation
- flexible unranked match creation
- immediate match creation and creator-only prematch flow
- set score entry
- result confirmation flow
- winner calculation
- separate singles/doubles Elo
- basic anti-farming
- match history
- player profile
- admin flag with admin-only match edit/delete
- 2-month seasons
- pre-match preview with rating, probability, delta, form, and head-to-head
- first badges

Suggested stack, unless something else is chosen:

- Next.js
- TypeScript
- Vercel for hosting
- Supabase for Postgres and possibly storage
- Prisma or Supabase client, depending on the final architecture
- email provider for one-time codes, or Supabase auth if it can support the desired flow cleanly
- object storage for avatars, likely Supabase Storage

Rating logic must be separate from the UI and well tested.

## Success Criteria

The first version works when:

- a colleague can enter without a password
- they can complete their profile
- they can create ranked singles and doubles
- they can create flexible unranked matches
- a created match is immediately available to every participant
- the other side can confirm the submitted result in-app
- ranked format is chosen before the match and cannot be changed after
- winner is derived from set scores
- singles and doubles update separate ratings
- unranked matches never change rating
- anti-farming reduces or zeroes rating impact when needed
- leaderboard marks provisional players
- only admins can edit/delete submitted matches
- seasons run on a 2-month cadence
- pre-match preview gives at least 3 useful insights
- tests cover expected score, set multiplier, point multiplier, 11 vs 21, doubles, and anti-farming

## Open Questions

- Should result confirmation be required from the direct opponent only, or can any teammate confirm in doubles?
- What should happen if the other side disputes a submitted result?
- Should admin edits recalculate all later ratings, or should admins mainly delete/void bad matches?
- Should Vercel + Supabase be the final MVP stack after checking free-tier limits?

## Avoid

- Do not let unranked matches affect rating.
- Do not allow ranked format changes after the match.
- Do not over-optimize Elo before real data exists.
- Do not create pair-specific doubles ratings before individual doubles rating works.
- Do not expose emails in leaderboards.
- Do not slow score entry down for too many stats.
- Do not build an abstract badge engine before the first concrete badges exist.
