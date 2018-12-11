"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// includes
const cmd = require("commander");
const dotenv = require("dotenv");
const winston = __importStar(require("winston"));
const TcpServer_1 = __importDefault(require("./TcpServer"));
// set env
dotenv.config();
// define options
cmd.option('-l, --log-level <s>', 'LOG_LEVEL. The minimum level to log (error, warn, info, verbose, debug, silly). Defaults to "info".', /^(error|warn|info|verbose|debug|silly)$/i)
    .option('-p, --port <s>', 'PORT. The port that is presenting the tcp interface. Default is "8000".', parseInt)
    .option('-t, --timeout <i>', 'TIMEOUT. A client must communicate within the timeout period (in milliseconds) or it is disconnected. Default is "30000" (30 seconds).', parseInt)
    .parse(process.argv);
// globals
const LOG_LEVEL = cmd.logLevel || process.env.LOG_LEVEL || 'info';
const PORT = cmd.port || process.env.PORT;
const TIMEOUT = cmd.timeout || process.env.TIMEOUT;
// start logging
const logColors = {
    debug: '\x1b[32m',
    error: '\x1b[31m',
    info: '',
    silly: '\x1b[32m',
    verbose: '\x1b[32m',
    warn: '\x1b[33m' // yellow
};
const transport = new winston.transports.Console({
    format: winston.format.combine(winston.format.timestamp(), winston.format.printf(event => {
        const color = logColors[event.level] || '';
        const level = event.level.padStart(7);
        return `${event.timestamp} ${color}${level}\x1b[0m: ${event.message}`;
    }))
});
const logger = winston.createLogger({
    level: LOG_LEVEL,
    transports: [transport]
});
async function setup() {
    try {
        console.log(`LOG_LEVEL is "${LOG_LEVEL}".`);
        // define the connection
        const server = new TcpServer_1.default({
            port: PORT,
            timeout: TIMEOUT
        })
            .on('listen', () => {
            logger.info(`listening on port ${server.options.port}.`);
        })
            .on('connect', (client) => {
            if (client.socket) {
                logger.info(`client "${client.id}" connected from "${client.socket.remoteAddress}".`);
            }
            else {
                logger.info(`client "${client.id}" connected.`);
            }
        })
            .on('checkin', (client) => {
            logger.info(`client "${client.id}" checked-in.`);
        })
            .on('disconnect', (client) => {
            if (client) {
                logger.info(`client "${client.id}" disconnected.`);
            }
            else {
                logger.info(`an unknown client disconnected.`);
            }
        })
            .on('remove', (client) => {
            logger.info(`client "${client.id}" removed.`);
        })
            .on('timeout', (client) => {
            logger.info(`client "${client.id}" timed-out (lastCheckIn: ${client.lastCheckin}, now: ${new Date().valueOf()}, timeout: ${server.options.timeout}).`);
        })
            .on('error', (error, module) => {
            logger.error(`there was an error raised in module "${module}"...`);
            logger.error(error.stack ? error.stack : error.message);
        });
        // log settings
        logger.info(`PORT is "${server.options.port}".`);
        logger.info(`TIMEOUT is "${server.options.timeout}".`);
        // start listening
        server.listen();
    }
    catch (error) {
        logger.error(error.stack);
    }
}
// run setup
setup();
