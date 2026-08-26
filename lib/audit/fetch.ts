import { AuditError } from "./errors";
import { assertSafeTarget, normalizeTargetUrl } from "./url-safety";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "MendAudit/0.2 (+https://mend-webmcp.vercel.app)";

export type FetchedDocument = {
  html: string;
  finalUrl: string;
  responseBytes: number;
  responseTimeMs: number;
};

export type ResourceProbe = {
  url: string;
  status: number | null;
  ok: boolean;
  contentType?: string;
  contentLength?: number;
  error?: string;
};

export async function fetchDocument(initialUrl: URL): Promise<FetchedDocument> {
  let currentUrl = initialUrl;
  let redirectCount = 0;
  const startedAt = Date.now();

  while (redirectCount <= MAX_REDIRECTS) {
    await assertSafeTarget(currentUrl);

    const response = await fetchWithTimeout(currentUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
      },
      method: "GET",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) {
        throw new AuditError(
          "The website returned a redirect without a destination.",
          "invalid_redirect",
          422,
        );
      }

      if (redirectCount === MAX_REDIRECTS) {
        throw new AuditError(
          "The website redirected too many times.",
          "too_many_redirects",
          422,
        );
      }

      try {
        currentUrl = normalizeTargetUrl(new URL(location, currentUrl).toString());
      } catch (error) {
        if (error instanceof AuditError) {
          throw error;
        }

        throw new AuditError(
          "The website returned an invalid redirect.",
          "invalid_redirect",
          422,
        );
      }

      redirectCount += 1;
      continue;
    }

    if (!response.ok) {
      throw new AuditError(
        "The website returned HTTP " + response.status + ".",
        "http_error",
        422,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (
      contentType &&
      !/text\/html|application\/xhtml\+xml/i.test(contentType)
    ) {
      throw new AuditError(
        "The target did not return an HTML page.",
        "not_html",
        422,
      );
    }

    const body = await readLimitedBody(response);

    return {
      html: body.html,
      finalUrl: currentUrl.toString(),
      responseBytes: body.bytes,
      responseTimeMs: Date.now() - startedAt,
    };
  }

  throw new AuditError(
    "The website could not be fetched.",
    "fetch_failed",
    422,
  );
}

export async function probeResource(
  initialUrl: URL,
  options: { headers?: Record<string, string>; method?: "GET" | "HEAD" } = {},
): Promise<ResourceProbe> {
  let currentUrl = initialUrl;
  let redirectCount = 0;

  try {
    while (redirectCount <= MAX_REDIRECTS) {
      await assertSafeTarget(currentUrl);

      const response = await fetchWithTimeout(currentUrl, {
        headers: {
          Accept: "*/*",
          "User-Agent": USER_AGENT,
          ...options.headers,
        },
        method: options.method ?? "HEAD",
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");

        if (!location || redirectCount === MAX_REDIRECTS) {
          return {
            url: currentUrl.toString(),
            status: response.status,
            ok: false,
            error: "Too many or invalid redirects",
          };
        }

        currentUrl = normalizeTargetUrl(
          new URL(location, currentUrl).toString(),
        );
        redirectCount += 1;
        continue;
      }

      await response.body?.cancel();

      return {
        url: currentUrl.toString(),
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type") ?? undefined,
        contentLength: parseContentLength(response.headers.get("content-length")),
      };
    }
  } catch (error) {
    return {
      url: currentUrl.toString(),
      status: null,
      ok: false,
      error:
        error instanceof AuditError
          ? error.message
          : "The resource could not be reached.",
    };
  }

  return {
    url: currentUrl.toString(),
    status: null,
    ok: false,
    error: "The resource could not be reached.",
  };
}

async function fetchWithTimeout(
  url: URL,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AuditError(
        "The website took too long to respond.",
        "timeout",
        504,
      );
    }

    throw new AuditError(
      error instanceof Error && error.message
        ? "The website could not be reached."
        : "The website could not be reached.",
      "fetch_failed",
      422,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function readLimitedBody(response: Response) {
  const declaredLength = parseContentLength(response.headers.get("content-length"));

  if (declaredLength && declaredLength > MAX_HTML_BYTES) {
    throw new AuditError(
      "The HTML response is larger than Mend's 1.5 MB safety limit.",
      "response_too_large",
      413,
    );
  }

  if (!response.body) {
    const html = await response.text();
    const bytes = Buffer.byteLength(html, "utf8");

    if (bytes > MAX_HTML_BYTES) {
      throw new AuditError(
        "The HTML response is larger than Mend's 1.5 MB safety limit.",
        "response_too_large",
        413,
      );
    }

    return { html, bytes };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      if (result.value) {
        totalBytes += result.value.byteLength;

        if (totalBytes > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new AuditError(
            "The HTML response is larger than Mend's 1.5 MB safety limit.",
            "response_too_large",
            413,
          );
        }

        chunks.push(result.value);
      }
    }
  } catch (error) {
    if (error instanceof AuditError) {
      throw error;
    }

    throw new AuditError(
      "The HTML response could not be read.",
      "response_read_failed",
      422,
    );
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    html: new TextDecoder().decode(merged),
    bytes: totalBytes,
  };
}

function parseContentLength(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
