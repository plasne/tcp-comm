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
const TcpClient_1 = __importDefault(require("./TcpClient"));
// set env
dotenv.config();
// define options
cmd.option('-l, --log-level <s>', 'LOG_LEVEL. The minimum level to log (error, warn, info, verbose, debug, silly). Defaults to "info".', /^(error|warn|info|verbose|debug|silly)$/i)
    .option('-i, --client-id <s>', 'CLIENT_ID. The unique identifier of this client. Default is a random GUID, but this means if the client is recycled it cannot be reassigned to the previous partitions.')
    .option('-a, --address <s>', 'ADDRESS. The address of the server. Default is "127.0.0.1".')
    .option('-p, --port <i>', 'PORT. The port that is presenting the tcp interface. Default is "8000".', parseInt)
    .option('-c, --checkin <i>', 'CHECKIN. The time between check-ins to the server (in milliseconds). Default is "10000" (10 seconds).', parseInt)
    .parse(process.argv);
// globals
const LOG_LEVEL = cmd.logLevel || process.env.LOG_LEVEL || 'info';
const CLIENT_ID = cmd.clientId || process.env.CLIENT_ID;
const ADDRESS = cmd.address || process.env.ADDRESS;
const PORT = cmd.port || process.env.PORT;
const CHECKIN = cmd.checkin || process.env.CHECKIN;
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
        // log the connection
        const client = new TcpClient_1.default({
            address: ADDRESS,
            checkin: CHECKIN,
            id: CLIENT_ID,
            port: PORT
        })
            .on('connect', () => {
            logger.verbose(`connected to server at "${client.options.address}:${client.options.port}".`);
        })
            .on('disconnect', () => {
            logger.verbose(`disconnected from server.`);
        })
            .on('checkin', () => {
            logger.debug(`checked-in to server.`);
        })
            .on('error', (error, module) => {
            logger.error(`there was an error raised in module "${module}"...`);
            logger.error(error.stack ? error.stack : error.message);
        });
        // log settings
        logger.info(`ID is "${client.options.id}".`);
        logger.info(`ADDRESS is "${client.options.address}".`);
        logger.info(`PORT is "${client.options.port}".`);
        logger.info(`CHECKIN is "${client.options.checkin}".`);
        // connect
        client.connect();
    }
    catch (error) {
        logger.error(error.stack);
    }
}
// run setup
setup();
