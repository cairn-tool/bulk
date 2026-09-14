# Future enhancements

Deferred work, with the reason it was deferred.

- **An MCP server exposing `list` and `query` as tools.** Started and cancelled during the port;
  the plugin declarations already carry everything a tool schema needs (`optionsToJsonSchema` in
  `src/plugin/options.ts`), so it is a `src/serve/` module and a `serve` command away.
- **NTSB Enterprise API.** `data.ntsb.gov/avdata/` announces its replacement by
  `GetCasesByDateRangeV2` at developer.ntsb.gov on 2027-04-05; the dumps should be taken while they
  last and the API researched before then.
- **NTRL's own download.** `ntis-ntrl fetch --source ntrl` replays the site's action for the day it
  stops answering an empty body.
- **A second bot-challenge solver.** `src/challenge/solver.ts` is the base; a Cloudflare or other
  proof-of-work gate is a subclass with `detect` and `solve`, registered in `registry.ts`.
- **Parallel downloads across hosts.** Every fetch is serial against one host by design; a run
  over several hosts could interleave them.
