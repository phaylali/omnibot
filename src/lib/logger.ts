/**
 * =============================================================================
 * LOGGER
 * Simple structured logger with timestamps and levels.
 * Provides consistent output across the bot.
 * =============================================================================
 */

type LogLevel = "info" | "warn" | "error" | "debug";

/** Returns a formatted timestamp string */
function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Core log function.
 * Formats: [HH:MM:SS] [LEVEL] message
 */
function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  const fullMessage = `${prefix} ${message}`;

  switch (level) {
    case "error":
      console.error(fullMessage, ...args);
      break;
    case "warn":
      console.warn(fullMessage, ...args);
      break;
    case "debug":
      console.debug(fullMessage, ...args);
      break;
    default:
      console.log(fullMessage, ...args);
  }
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => log("info", msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log("warn", msg, ...args),
  error: (msg: string, ...args: unknown[]) => log("error", msg, ...args),
  debug: (msg: string, ...args: unknown[]) => log("debug", msg, ...args),
};
