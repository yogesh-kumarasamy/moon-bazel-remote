import { slugify } from '@mbr/shared-utils';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  level: LogLevel;
  logger: string;
  msg: string;
  time: string;
  [field: string]: unknown;
}

export type LogSink = (record: LogRecord) => void;

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

const defaultSink: LogSink = (record) => {
  process.stdout.write(`${JSON.stringify(record)}\n`);
};

export function createLogger(name: string, sink: LogSink = defaultSink): Logger {
  const logger = slugify(name);
  const log = (level: LogLevel) => (msg: string, fields: Record<string, unknown> = {}) =>
    sink({ ...fields, level, logger, msg, time: new Date().toISOString() });

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  };
}
