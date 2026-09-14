# Cookie jar

Challenge cookies are cached under `<cache dir>/<solver>/<host>.jar` in curl's Netscape format:

```text
# Netscape HTTP Cookie File
#HttpOnly_.cds.cern.ch	TRUE	/	TRUE	1757900000	techaro.lol-anubis-auth-…	eyJhbGci…
```

Seven tab-separated columns: domain (a leading `.` means subdomains too), the include-subdomains
flag, path, the secure flag, expiry as epoch seconds (`0` for a session cookie), name, value; a
`#HttpOnly_` prefix marks an HttpOnly cookie. The format is kept because it is what the original
tool cached, so an existing jar is reused without conversion, and because `curl -b <jar>` reads it
directly when a request needs reproducing by hand.

`bulk cache list` reports each jar's state from its auth cookie's expiry — `valid`, `expiring`
(within the solver's refresh margin), `expired`, or `none` — and `bulk cache clear` removes them.
Session jars a plugin opens for one run (NTRL's JSESSIONID, the docket search's antiforgery
cookie) live under `<cache dir>/sessions/<plugin>/` and are deleted when the run ends.
