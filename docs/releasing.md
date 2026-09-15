# Releasing

Releases are cut by [semantic-release](https://github.com/semantic-release/semantic-release) when a
push to `main` passes CI. The version, the changelog, the git tag, the GitHub Release and the npm
publish are all derived from the commit messages since the last release.

| Commit prefix                                | Effect        |
| -------------------------------------------- | ------------- |
| `fix:` / `perf:`                             | patch release |
| `feat:`                                      | minor release |
| `feat!:` or a `BREAKING CHANGE:` footer      | major release |
| `chore:` `docs:` `test:` `ci:` `refactor:` … | no release    |

## The pipeline

1. `ci.yml` runs on every push and pull request: Prettier, ESLint, `tsc`, the test suite on every
   Node in the matrix, and commitlint on a pull request's commits.
2. `release.yml` triggers via `workflow_run` when CI completes — only for a green run on a push to
   `main`, never on push itself, so a red matrix cannot publish. It mints a short-lived GitHub App
   token (the identity the `main` ruleset grants a bypass to), upgrades npm past 11.5.1 for trusted
   publishing, and runs `npx semantic-release`.
3. semantic-release bumps `package.json`, writes `CHANGELOG.md`, commits both with `[skip ci]`,
   tags, creates the GitHub Release, and publishes to npm through OIDC trusted publishing with a
   provenance attestation.

4. `plugins.yml` triggers when `release.yml` completes and publishes the
   [agent plugin](plugins.md) to the `release` branch — a fast-forward commit of the built
   marketplace tree, tagged `release-v<version>`. The bundle's own version is hand-owned.

## What semantic-release does not own

- `CONTRACT_VERSION` in `src/contract/version.ts` — the version of the contract surface, bumped by
  hand only when the envelope, the `describe` payload or the schema id scheme changes shape. See
  [the contract](contract.md).
- The configuration `version` (`1`) — bumped only when the file's shape changes incompatibly.
- The [agent plugin](plugins.md)'s `version` in `plugins/bulk/agent-bundle.yaml` and
  `agent-marketplace.yaml` — bumped by hand with the content.

## Setting up a fork

The first publish of a new package name needs a token (`NPM_TOKEN`), because a trusted publisher
is configured on an existing package's settings page. Publish once with the token, register the
trusted publisher against the `release.yml` filename, then delete the secret; `release.yml` tries
OIDC first and only falls back to the token. `RELEASE_APP_ID` and `RELEASE_APP_PRIVATE_KEY` are
the two long-lived secrets; the token they mint expires in an hour.
