// ============ Logger Utility ============

type LogLevel = "info" | "warn" | "error" | "debug";

const LOG_COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",   // Cyan
  warn: "\x1b[33m",   // Yellow
  error: "\x1b[31m",  // Red
  debug: "\x1b[35m",  // Magenta
};

const RESET = "\x1b[0m";

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level];
  const prefix = `${color}[${level.toUpperCase()}]${RESET}`;
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `${prefix} ${timestamp} - ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: unknown) {
    console.log(formatMessage("info", message, meta));
  },
  warn(message: string, meta?: unknown) {
    console.warn(formatMessage("warn", message, meta));
  },
  error(message: string, meta?: unknown) {
    console.error(formatMessage("error", message, meta));
  },
  debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.debug(formatMessage("debug", message, meta));
    }
  },
};

export default logger;
