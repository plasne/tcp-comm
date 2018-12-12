// includes
import cmd = require('commander');
import dotenv = require('dotenv');
import * as winston from 'winston';
import { TcpClient } from './TcpClient';

// set env
dotenv.config();

// define options
cmd.option(
    '-l, --log-level <s>',
    'LOG_LEVEL. The minimum level to log (error, warn, info, verbose, debug, silly). Defaults to "info".',
    /^(error|warn|info|verbose|debug|silly)$/i
)
    .option(
        '-i, --client-id <s>',
        'CLIENT_ID. The unique identifier of this client. Default is a random GUID, but this means if the client is recycled it cannot be reassigned to the previous partitions.'
    )
    .option(
        '-a, --address <s>',
        'ADDRESS. The address of the server. Default is "127.0.0.1".'
    )
    .option(
        '-p, --port <i>',
        'PORT. The port that is presenting the tcp interface. Default is "8000".',
        parseInt
    )
    .option(
        '-t, --timeout <i>',
        'TIMEOUT. If a response is not received from the server in this period (in milliseconds), the client is disconnected. Default is "30000" (30 seconds).',
        parseInt
    )
    .option(
        '-c, --checkin <i>',
        'CHECKIN. The time between check-ins to the server (in milliseconds). Default is "10000" (10 seconds).',
        parseInt
    )
    .parse(process.argv);

// globals
const LOG_LEVEL = cmd.logLevel || process.env.LOG_LEVEL || 'info';
const CLIENT_ID = cmd.clientId || process.env.CLIENT_ID;
const ADDRESS = cmd.address || process.env.ADDRESS;
const PORT = cmd.port || process.env.PORT;
const TIMEOUT = cmd.timeout || process.env.TIMEOUT;
const CHECKIN = cmd.checkin || process.env.CHECKIN;

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

        // log the connection
        const client = new TcpClient({
            address: ADDRESS,
            checkin: CHECKIN,
            id: CLIENT_ID,
            port: PORT,
            timeout: TIMEOUT
        })
            .on('connect', () => {
                logger.info(
                    `connected to server at "${client.address}:${client.port}".`
                );
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
            .on('timeout', () => {
                logger.info('connection timed-out.');
            })
            .on('disconnect', () => {
                logger.info(`disconnected from server.`);
            })
            .on('checkin', () => {
                logger.debug(`checked-in to server.`);
            })
            .on('error', (error: Error, module: string) => {
                logger.error(
                    `there was an error raised in module "${module}"...`
                );
                logger.error(error.stack ? error.stack : error.message);
            });

        // log settings
        logger.info(`ID is "${client.id}".`);
        logger.info(`ADDRESS is "${client.address}".`);
        logger.info(`PORT is "${client.port}".`);
        logger.info(`TIMEOUT is "${client.timeout}".`);
        logger.info(`CHECKIN is "${client.checkin}".`);

        // connect
        client.connect();
    } catch (error) {
        logger.error(error.stack);
    }
}

// run setup
setup();
