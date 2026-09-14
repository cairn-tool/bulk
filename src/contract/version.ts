/**
 * Version of the contract surface itself: the envelope shape, the `describe`
 * payload, the schema id scheme, and the machine-stream guarantees.
 *
 * Hand-owned and unrelated to the semantic-release-managed package version.
 */
export const CONTRACT_VERSION = "1";

export const SCHEMA_BASE = "https://github.com/cairn-tool/bulk/schema";

/** Major version segment of a schema id path. */
export type SchemaMajor = "v1";

/**
 * Builds a schema `$id`. These are identifiers, not fetchable URLs — retrieve a
 * schema with `bulk schema <id>`.
 */
export function schemaUri(major: SchemaMajor, id: string): string {
  return `${SCHEMA_BASE}/${major}/${id}.json`;
}
