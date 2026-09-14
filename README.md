# bulk

Pull publisher catalogues into a document archive and look titles up by identifier — one plugin
per data source, every fetch resumable and verified, every command scriptable.

```bash
npm install -g @cairn-tool/bulk

bulk sources                                        # every plugin and its commands
bulk ntsb-reports list --mode Aviation              # a catalogue, nothing downloaded
bulk ntsb-reports fetch --dest ~/archive/ntsb       # pull and verify every report, resumably
bulk openlibrary query 9780262033848                # a title from an ISBN
bulk crossref query 10.1080/16000870.2018.1440870   # a Crossref record from a DOI
```

## What is in it

- **Fetch plugins** enumerate a source's own catalogue live, write a manifest before the first
  download, verify every file (status, magic bytes, byte count, digest), log every transfer with
  its SHA-256, and skip what is already present — so re-running the same command resumes.
- **Query plugins** turn identifiers (ISBNs, DOIs, accession numbers, report designations) into
  catalogue records through a JSON cache.
- **Pacing** is learned from each host's own rate-limit headers, with declared floors for the hosts
  that publish none; bot challenges that are proofs of work (Anubis) are solved and their cookies
  cached.
- **Nothing is hardcoded** but the user configuration and cache directories; the archive root and
  every destination come from `--dest`, `BULK_ARCHIVE` or `~/.config/bulk/config.yml`.
- `--format llm|human|json` on every command, a published result contract (`bulk describe`), shell
  completion, and an MCP server (`bulk serve mcp`) exposing the list and query commands as tools.

## Documentation

- [Installing](docs/install.md)
- [Complete command listing](docs/commands.md)
- [Data sources](docs/sources.md) — what each source publishes, and how it is reached
- [Guides](docs/guide.md)
- [Configuration](docs/configuration.md)
- [Result contract](docs/contract.md)
- [Development](docs/development.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Conventional Commits are required; semantic-release owns
the version and the changelog.

## License

MIT — see [LICENSE](LICENSE).
