export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly url?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** arXiv's 429 carries no Retry-After and outlasts any retry; a command reports it and stops. */
export class RateLimited extends HttpError {
  constructor(host: string, url: string) {
    super(
      `${host} answered 429 (rate exceeded). The block outlasts ordinary retries; wait a while and run the same command again — present files are skipped.`,
      429,
      url,
    );
    this.name = "RateLimited";
  }
}
