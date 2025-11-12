import { createLogger, format, transports, Logger } from 'winston';
import path from 'path';

// Custom level filter
const levelFilter = (level: string) =>
  format((info) => {
    return info.level === level ? info : false;
  })();

// Stack trace location helper
const extractLocation = (stack: string | undefined): string => {
  if (!stack) return 'unknown';
  const match = stack.split('\n')[1]?.match(/\((.*):(\d+):(\d+)\)/) ||
                stack.split('\n')[1]?.match(/at (.*):(\d+):(\d+)/);
  if (match) {
    const filePath = match[1];
    const line = match[2];
    return `[${path.relative(process.cwd(), filePath)}:${line}]`;
  }
  return '[unknown]';
};

const logFormat = format.printf((info) => {
  const base = `[${info.timestamp}] ${info.level.toUpperCase()} -`;

  const splatSymbol = Symbol.for('splat');
  const splat = info[splatSymbol];
  const splatData = splat ? ` ${JSON.stringify(splat)}` : '';

  if (info.stack && info.level === 'error') {
    const location = extractLocation(typeof info.stack === 'string' ? info.stack : undefined);
    return `${base} ${location} ${info.message}`;
  } else if (info.level === 'info' || info.level === 'warn') {
    return `${base} ${info.message}${splatData}`;
  }

  return `${base} ${info.message}`;
});

const logger: Logger = createLogger({
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.Console(),

    // Info.log: only info and warn
    new transports.File({
      filename: path.join(__dirname, '../logs/info.log'),
      format: format.combine(
        levelFilter('info')
      )
    }),

    // Warn.log: only warn
    new transports.File({
      filename: path.join(__dirname, '../logs/warn.log'),
      format: format.combine(
        levelFilter('warn')
      )
    }),

    // Error.log: only error
    new transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      format: format.combine(
        levelFilter('error')
      )
    }),
  ]
});

export default logger;
