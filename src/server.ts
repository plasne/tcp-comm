// includes
import cmd = require('commander');
import dotenv = require('dotenv');
import * as winston from 'winston';
import IMessage from './IMessage';
import { IClient, TcpServer } from './TcpServer';

// set env
dotenv.config();

// define options
cmd.option(
    '-l, --log-level <s>',
    'LOG_LEVEL. The minimum level to log (error, warn, info, verbose, debug, silly). Defaults to "info".',
    /^(error|warn|info|verbose|debug|silly)$/i
)
    .option(
        '-p, --port <s>',
        'PORT. The port that is presenting the tcp interface. Default is "8000".',
        parseInt
    )
    .option(
        '-t, --timeout <i>',
        'TIMEOUT. A client must communicate within the timeout period (in milliseconds) or it is disconnected. Default is "30000" (30 seconds).',
        parseInt
    )
    .parse(process.argv);

// globals
const LOG_LEVEL = cmd.logLevel || process.env.LOG_LEVEL || 'info';
const PORT = cmd.port || process.env.PORT;
const TIMEOUT = cmd.timeout || process.env.TIMEOUT;

// start logging
const logColors: {
    [index: string]: string;
} = {
    debug: '\x1b[32m', // green
    error: '\x1b[31m', // red
    info: '', // white
    silly: '\x1b[32m', // green
    verbose: '\x1b[32m', // green
    warn: '\x1b[33m' // yellow
};
const transport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(event => {
            const color = logColors[event.level] || '';
            const level = event.level.padStart(7);
            return `${event.timestamp} ${color}${level}\x1b[0m: ${
                event.message
            }`;
        })
    )
});
const logger = winston.createLogger({
    level: LOG_LEVEL,
    transports: [transport]
});

async function setup() {
    try {
        console.log(`LOG_LEVEL is "${LOG_LEVEL}".`);

        // define the connection
        const server = new TcpServer({
            port: PORT,
            timeout: TIMEOUT
        })
            .on('listen', () => {
                logger.info(`listening on port ${server.port}.`);
            })
            .on('connect', (client: IClient) => {
                if (client.socket) {
                    logger.info(
                        `client "${client.id}" connected from "${
                            client.socket.remoteAddress
                        }".`
                    );
                } else {
                    logger.info(`client "${client.id}" connected.`);
                }
            })
            .on('checkin', async (client: IClient) => {
                logger.info(`client "${client.id}" checked-in.`);
            })
            .on('ack', (msg: IMessage) => {
                logger.debug(`acknowledged message "${msg.i}".`);
            })
            .on('encode', (before: number, after: number) => {
                logger.debug(
                    `encoded "${before}" bytes into "${after}" bytes.`
                );
            })
            .on('data', (payload: any, respond?: (response: any) => void) => {
                if (respond) {
                    respond({
                        msg: `here is my response to ${JSON.stringify(payload)}`
                    });
                }
            })
            .on('disconnect', (client?: IClient) => {
                if (client) {
                    logger.info(`client "${client.id}" disconnected.`);
                } else {
                    logger.info(`an unknown client disconnected.`);
                }
            })
            .on('remove', (client: IClient) => {
                logger.info(`client "${client.id}" removed.`);
            })
            .on('timeout', (client: IClient) => {
                logger.info(
                    `client "${client.id}" timed-out (lastCheckIn: ${
                        client.lastCheckin
                    }, now: ${new Date().valueOf()}, timeout: ${
                        server.timeout
                    }).`
                );
            })
            .on('error', (error: Error, module: string) => {
                logger.error(
                    `there was an error raised in module "${module}"...`
                );
                logger.error(error.stack ? error.stack : error.message);
            });

        // log settings
        logger.info(`PORT is "${server.port}".`);
        logger.info(`TIMEOUT is "${server.timeout}".`);

        // start listening
        server.listen();
    } catch (error) {
        logger.error(error.stack);
    }
}

// run setup
setup();
