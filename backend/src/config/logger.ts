import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'auction-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add Loki transport if configured
if (process.env.LOKI_HOST) {
  const LokiTransport = require('winston-loki');
  logger.add(new LokiTransport({
    host: process.env.LOKI_HOST,
    basicAuth: process.env.LOKI_USER && process.env.LOKI_PASSWORD ? `${process.env.LOKI_USER}:${process.env.LOKI_PASSWORD}` : undefined,
    json: true,
    labels: { job: 'auction-api' },
    onConnectionError: (err: any) => console.error('Loki connection error:', err)
  }));
}

