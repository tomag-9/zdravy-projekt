type LogMethod = "debug" | "info" | "warn" | "error";

function write(method: LogMethod, args: unknown[]) {
  if (!import.meta.env.DEV) return;
  console[method](...args);
}

export const logger = {
  debug: (...args: unknown[]) => write("debug", args),
  info: (...args: unknown[]) => write("info", args),
  warn: (...args: unknown[]) => write("warn", args),
  error: (...args: unknown[]) => write("error", args),
};
