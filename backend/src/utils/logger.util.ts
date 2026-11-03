/**
 * Enterprise Structured Console Logger for ShopCart
 * Provides colored, categorized log output with timestamps, sensitive data masking,
 * HTTP request/response tracking, and SQL Server Stored Procedure execution telemetry.
 */

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'refreshtoken',
  'token',
  'accesstoken',
  'tokenhash',
  'authorization',
  'secret',
];

/**
 * Deeply clone and mask sensitive fields (passwords, tokens, hashes)
 */
export function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

    if (isSensitive && typeof value === 'string') {
      masked[key] = value.length > 8 ? `${value.substring(0, 4)}***${value.slice(-3)}` : '***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

function formatContext(context?: any): string {
  if (!context || (typeof context === 'object' && Object.keys(context).length === 0)) {
    return '';
  }

  try {
    const masked = maskSensitiveData(context);
    return ` ${GRAY}${JSON.stringify(masked)}${RESET}`;
  } catch {
    return '';
  }
}

function getTimestamp(): string {
  return `${GRAY}${new Date().toISOString()}${RESET}`;
}

export const logger = {
  /**
   * Informational logs for normal business operations
   */
  info(message: string, context?: any): void {
    console.log(`${getTimestamp()} ${GREEN}${BOLD}ℹ️ [INFO]${RESET} ${message}${formatContext(context)}`);
  },

  /**
   * Warning logs for client errors, invalid parameters, or business constraint rejections (4xx)
   */
  warn(message: string, context?: any): void {
    console.warn(`${getTimestamp()} ${YELLOW}${BOLD}⚠️ [WARN]${RESET} ${YELLOW}${message}${RESET}${formatContext(context)}`);
  },

  /**
   * Error logs for unhandled exceptions, database failures, or system crashes (5xx)
   */
  error(message: string, err?: any, context?: any): void {
    console.error(`${getTimestamp()} ${RED}${BOLD}❌ [ERROR]${RESET} ${RED}${BOLD}${message}${RESET}`);
    if (context) {
      console.error(`   ${GRAY}Context:${RESET}`, maskSensitiveData(context));
    }
    if (err) {
      if (err instanceof Error) {
        console.error(`   ${RED}${err.stack || err.message}${RESET}`);
      } else {
        console.error(`   ${RED}${JSON.stringify(err)}${RESET}`);
      }
    }
  },

  /**
   * HTTP request/response tracking logs
   */
  http(message: string, context?: any): void {
    console.log(`${getTimestamp()} ${CYAN}${BOLD}🌐 [HTTP]${RESET} ${message}${formatContext(context)}`);
  },

  /**
   * Telemetry logs for Stored Procedure and SQL query execution
   */
  sql(procedure: string, params?: Record<string, any>, resultSummary?: any, durationMs?: number): void {
    const timing = durationMs !== undefined ? ` ${YELLOW}(${durationMs}ms)${RESET}` : '';
    const cleanParams = params ? formatContext(params) : '';
    const cleanSummary = resultSummary ? ` ${DIM}-> Result: ${JSON.stringify(maskSensitiveData(resultSummary))}${RESET}` : '';

    console.log(
      `${getTimestamp()} ${MAGENTA}${BOLD}🗄️ [SQL-SP]${RESET} ${BOLD}${procedure}${RESET}${timing}${cleanParams}${cleanSummary}`
    );
  },
};
