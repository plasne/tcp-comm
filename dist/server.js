"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// includes
const cmd = require("commander");
const dotenv = require("dotenv");
const winston = __importStar(require("winston"));
const TcpServer_1 = require("./TcpServer");
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
        const server = new TcpServer_1.TcpServer({
            port: PORT,
            timeout: TIMEOUT
        })
            .on('listen', () => {
            logger.info(`listening on port ${server.port}.`);
        })
            .on('connect', (client) => {
            if (client.socket) {
                logger.info(`client "${client.id}" connected from "${client.socket.remoteAddress}".`);
            }
            else {
                logger.info(`client "${client.id}" connected.`);
            }
        })
            .on('checkin', async (client) => {
            logger.info(`client "${client.id}" checked-in.`);
            try {
                const response = await server.send(client, [
                    {
                        type: 'car',
                        color: 'red',
                        number: 29393
                    },
                    {
                        type: 'car',
                        color: 'blue',
                        number: 10011
                    },
                    {
                        type: 'car',
                        color: 'green',
                        number: 393
                    }
                ], {
                    receipt: true,
                    encode: true
                });
                console.log(`response: ${JSON.stringify(response)}`);
            }
            catch (error) {
                console.error(error);
            }
        })
            .on('ack', (msg) => {
            logger.debug(`acknowledged message "${msg.i}".`);
        })
            .on('encode', (before, after) => {
            logger.debug(`encoded "${before}" bytes into "${after}" bytes.`);
        })
            .on('data', (payload, respond) => {
            if (respond) {
                respond({
                    msg: `here is my response to ${JSON.stringify(payload)}`
                });
            }
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
            logger.info(`client "${client.id}" timed-out (lastCheckIn: ${client.lastCheckin}, now: ${new Date().valueOf()}, timeout: ${server.timeout}).`);
        })
            .on('error', (error, module) => {
            logger.error(`there was an error raised in module "${module}"...`);
            logger.error(error.stack ? error.stack : error.message);
        });
        // log settings
        logger.info(`PORT is "${server.port}".`);
        logger.info(`TIMEOUT is "${server.timeout}".`);
        // start listening
        server.listen();
    }
    catch (error) {
        logger.error(error.stack);
    }
}
// run setup
setup();
