# Security

`bulk` downloads files from public catalogues and writes them where you tell it to. It never
executes what it downloads, sends nothing but the requests documented per source, and carries no
credentials — the only secret-like thing it stores is a bot-challenge cookie under the cache
directory.

Fetched content is untrusted input: a PDF from a public repository can carry anything a PDF can.
Verify what you archive before opening it with software that runs embedded content.

## Reporting a vulnerability

Open a private security advisory on the repository, or email the maintainer named in
`package.json`. Please do not file a public issue for a vulnerability.
