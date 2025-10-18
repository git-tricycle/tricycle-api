import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Create Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}]: ${stack || message}`;
    })
  ),
  defaultMeta: { service: 'tricycle-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Simplified logging functions for routes
export const logInfo = (message: string, req?: Request) => {
  const logMessage = req 
    ? `${message} | ${req.method} ${req.originalUrl} | User: ${req.user?.id || 'Anonymous'} | IP: ${req.ip}`
    : message;
  logger.info(logMessage);
};

export const logError = (message: string, error?: any, req?: Request) => {
  const logMessage = req 
    ? `${message} | ${req.method} ${req.originalUrl} | User: ${req.user?.id || 'Anonymous'} | IP: ${req.ip}`
    : message;
  
  if (error) {
    logger.error(`${logMessage} | Error: ${error.message || error}`, { stack: error.stack });
  } else {
    logger.error(logMessage);
  }
};

// HTTP request logging middleware
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? 'error' : 'info';
    
    logger.log(statusColor, `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms | IP: ${req.ip} | User-Agent: ${req.get('User-Agent')}`);
  });
  
  next();
};

export default logger;
