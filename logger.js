const winston = require("winston");
require("winston-daily-rotate-file");

// Daily rotate transport
const transport = new winston.transports.DailyRotateFile({
    dirname: "logs",
    filename: "app-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "10m",
    maxFiles: "14d"
});

// Main logger instance
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        transport
    ]
});

module.exports = logger;
