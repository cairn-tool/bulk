# Installing bulk

`bulk` is published as [`@cairn-tool/bulk`](https://www.npmjs.com/package/@cairn-tool/bulk) on the
public npm registry. The installed binary is named `bulk`. It needs Node 22.12 or later.

## Install

```bash
npm install -g @cairn-tool/bulk        # global `bulk` binary
npx @cairn-tool/bulk sources           # one-off, no install
```

Every published tarball is built by GitHub Actions and carries an [npm provenance
attestation](https://docs.npmjs.com/generating-provenance-statements) linking it to the workflow
run that produced it; releases publish through [trusted
publishing](https://docs.npmjs.com/trusted-publishers), so no long-lived registry credential
exists to be stolen. `npm audit signatures` verifies it.

## First run

```bash
bulk config init                       # a commented starter at ~/.config/bulk/config.yml
bulk sources                           # the plugins
bulk ntsb-reports list --mode Marine   # a catalogue, nothing downloaded
bulk ntsb-reports fetch --mode Marine --dest ~/archive/ntsb/reports
```

Set `archive:` (or `BULK_ARCHIVE`) and a `dest` per plugin in the configuration to drop `--dest`;
set `contact:` so Crossref and the other polite hosts see who is asking.

## Keeping a stable path across Node upgrades

`npm install -g` places the binary inside the active Node install. Under a version manager such as
nvm that directory changes on every Node upgrade, which silently breaks anything holding an
absolute path to the CLI. Pin a stable path:

```bash
mkdir -p ~/.local/bin
ln -sf "$(npm root -g)/@cairn-tool/bulk/dist/cli.js" ~/.local/bin/bulk
```

## Installing from source with `npm link`

```bash
git clone git@github.com:cairn-tool/bulk.git
cd bulk
npm ci
npm run build   # tsc -> dist/cli.js
npm link        # expose the working tree as the global `bulk`
```

`npm unlink -g @cairn-tool/bulk` removes the link.

## Uninstalling

```bash
npm uninstall -g @cairn-tool/bulk
rm -rf ~/.config/bulk ~/.cache/bulk    # the configuration and cache, if you want them gone too
```

Fetched archives are wherever `--dest` or the configuration put them; nothing here touches them.

## Related

- [Configuration](configuration.md)
- [Development](development.md)
