# Bot challenges

Some hosts put a proof-of-work gate in front of their files. CERN's Document Server answers
`/search`, `/record/…` and every file URL with an [Anubis](https://github.com/TecharoHQ/anubis)
challenge page — "Making sure you're not a bot!" — whatever the User-Agent, while its OAI-PMH
endpoint stays open.

## What solving means

The page embeds `{"rules": {"algorithm": "fast", "difficulty": D}, "challenge": {"id", "randomData"}}`.
The "fast" proof is a nonce for which `sha256(randomData + nonce)` has `D` leading hex zeros —
about 60,000 tries at difficulty 4, under 100 ms. Presenting the hash, the nonce, the id and an
elapsed time to `/.within.website/x/cmd/anubis/api/pass-challenge` sets a JWT cookie valid for
about an hour across the host.

`bulk` solves it once at the start of a run, caches the cookie under
`<cache dir>/anubis/<host>.jar` ([format](../formats/cookie-jar.md)), and sends it on every gated
request; the cookie is reused across runs until it is within `challenge.anubis.refreshMargin`
seconds of expiry. `bulk cache list` shows its state, `bulk cache clear` removes it.

Solving a proof-of-work is a compute toll paid for the archive owner's own pull at the pull's
pacing. It is not applied to CAPTCHAs or credential gates, which stay walls, and
`challenge.anubis.enabled: false` (or `cern-cds fetch --no-anubis`) declines it — CDS files then
come from INSPIRE-HEP where INSPIRE holds them.

## Adding a gate

`src/challenge/solver.ts` is the base: a subclass sets `name` (the cache namespace), `authCookie`
(a substring of the cookie the gate issues) and `label`, and implements `detect(text)` and
`solve(http, url, pageText, host, jar)`. Register it in `src/challenge/registry.ts`, name it in a
plugin's `HostPolicy.challenge`, and the cache commands and the jar handling cover it with no
further change.
