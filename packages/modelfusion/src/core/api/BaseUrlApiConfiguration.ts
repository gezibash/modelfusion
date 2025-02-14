import { AbstractApiConfiguration } from "./AbstractApiConfiguration.js";
import { RetryFunction } from "./RetryFunction.js";
import { ThrottleFunction } from "./ThrottleFunction.js";

export type UrlParts = {
  protocol: string;
  host: string;
  port: string;
  path: string;
};

export type BaseUrlPartsApiConfigurationOptions = {
  baseUrl: string | UrlParts;
  headers?: Record<string, string>;
  retry?: RetryFunction;
  throttle?: ThrottleFunction;
};

/**
 * An API configuration that uses different URL parts and a set of headers.
 *
 * You can use it to configure custom APIs for models, e.g. your own internal OpenAI proxy with custom headers.
 */
export class BaseUrlApiConfiguration extends AbstractApiConfiguration {
  readonly baseUrl: UrlParts;
  readonly headers: Record<string, string>;

  constructor({
    baseUrl,
    headers,
    retry,
    throttle,
  }: BaseUrlPartsApiConfigurationOptions) {
    super({ retry, throttle });
    this.baseUrl = typeof baseUrl == "string" ? parseBaseUrl(baseUrl) : baseUrl;
    this.headers = headers ?? {};
  }

  assembleUrl(path: string): string {
    let basePath = this.baseUrl.path;

    // ensure base path ends without a slash
    if (basePath.endsWith("/")) {
      basePath = basePath.slice(0, -1);
    }

    // ensure path starts with a slash
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }

    return `${this.baseUrl.protocol}://${this.baseUrl.host}:${this.baseUrl.port}${basePath}${path}`;
  }
}

export type PartialBaseUrlPartsApiConfigurationOptions = {
  baseUrl?: string | Partial<UrlParts>;
  headers?: Record<string, string>;
  retry?: RetryFunction;
  throttle?: ThrottleFunction;
};

export class BaseUrlApiConfigurationWithDefaults extends BaseUrlApiConfiguration {
  constructor({
    baseUrlDefaults,
    baseUrl,
    headers,
    retry,
    throttle,
  }: {
    baseUrlDefaults: UrlParts;
  } & PartialBaseUrlPartsApiConfigurationOptions) {
    super({
      baseUrl: resolveBaseUrl(baseUrl, baseUrlDefaults),
      headers,
      retry,
      throttle,
    });
  }
}

function parseBaseUrl(baseUrl: string): UrlParts {
  const url = new URL(baseUrl);

  return {
    protocol: url.protocol.slice(0, -1), // remove trailing colon
    host: url.hostname,
    port: url.port,
    path: url.pathname,
  };
}

function resolveBaseUrl(
  baseUrl: string | Partial<UrlParts> | undefined = {},
  baseUrlDefaults: UrlParts
): string | UrlParts {
  if (typeof baseUrl == "string") {
    return baseUrl;
  } else {
    return {
      protocol: baseUrl.protocol ?? baseUrlDefaults.protocol,
      host: baseUrl.host ?? baseUrlDefaults.host,
      port: baseUrl.port ?? baseUrlDefaults.port,
      path: baseUrl.path ?? baseUrlDefaults.path,
    };
  }
}
