import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = false; //process.env.NODE_ENV === 'development';

const isLambda = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;

export const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { 
        service: 'typescript-mcp-auth-server' 
    },
    transports: []
});

// Configure console logging based on environment
if (isLambda) {
    // In Lambda, always use console for CloudWatch logs
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        )
    }));
} else if (isDevelopment) {
    // In development, add console logging with readable format (safe for MCP)
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
                format: 'HH:mm:ss'
            }),
            winston.format.printf(({ timestamp, level, message, service, ...meta }: any) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
            })
        )
    }));
} else {
    // In production (non-Lambda), use file-based logging
    logger.add(new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '14d', // Keep logs for 14 days
        maxSize: '20m',  // Rotate when file reaches 20MB
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        )
    }));
    
    logger.add(new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d', // Keep logs for 30 days
        maxSize: '20m',  // Rotate when file reaches 20MB
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        )
    }));
}

// Note: Console logging is used in Lambda for CloudWatch, disabled in non-Lambda production to prevent MCP protocol issues

export default logger; 