"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// includes
var cmd = require("commander");
var dotenv = require("dotenv");
var winston = __importStar(require("winston"));
var TcpServer_1 = require("./TcpServer");
// set env
dotenv.config();
// define options
cmd.option('-l, --log-level <s>', 'LOG_LEVEL. The minimum level to log (error, warn, info, verbose, debug, silly). Defaults to "info".', /^(error|warn|info|verbose|debug|silly)$/i)
    .option('-p, --port <s>', 'PORT. The port that is presenting the tcp interface. Default is "8000".', parseInt)
    .option('-t, --timeout <i>', 'TIMEOUT. A client must communicate within the timeout period (in milliseconds) or it is disconnected. Default is "30000" (30 seconds).', parseInt)
    .parse(process.argv);
// globals
var LOG_LEVEL = cmd.logLevel || process.env.LOG_LEVEL || 'info';
var PORT = cmd.port || process.env.PORT;
var TIMEOUT = cmd.timeout || process.env.TIMEOUT;
// start logging
var logColors = {
    debug: '\x1b[32m',
    error: '\x1b[31m',
    info: '',
    silly: '\x1b[32m',
    verbose: '\x1b[32m',
    warn: '\x1b[33m' // yellow
};
var transport = new winston.transports.Console({
    format: winston.format.combine(winston.format.timestamp(), winston.format.printf(function (event) {
        var color = logColors[event.level] || '';
        var level = event.level.padStart(7);
        return event.timestamp + " " + color + level + "\u001B[0m: " + event.message;
    }))
});
var logger = winston.createLogger({
    level: LOG_LEVEL,
    transports: [transport]
});
function setup() {
    return __awaiter(this, void 0, void 0, function () {
        var server_1;
        var _this = this;
        return __generator(this, function (_a) {
            try {
                console.log("LOG_LEVEL is \"" + LOG_LEVEL + "\".");
                server_1 = new TcpServer_1.TcpServer({
                    port: PORT,
                    timeout: TIMEOUT
                })
                    .on('listen', function () {
                    logger.info("listening on port " + server_1.port + ".");
                })
                    .on('connect', function (client) {
                    if (client.socket) {
                        logger.info("client \"" + client.id + "\" connected from \"" + client.socket.remoteAddress + "\".");
                    }
                    else {
                        logger.info("client \"" + client.id + "\" connected.");
                    }
                })
                    .on('checkin', function (client) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        logger.info("client \"" + client.id + "\" checked-in.");
                        return [2 /*return*/];
                    });
                }); })
                    .on('ack', function (ack, msg) {
                    logger.debug("msg: \"" + msg.c + "\", ack: " + JSON.stringify(ack) + ".");
                })
                    .on('encode', function (before, after) {
                    logger.debug("encoded \"" + before + "\" bytes into \"" + after + "\" bytes.");
                })
                    .on('data', function (payload, respond) {
                    if (respond) {
                        respond({
                            msg: "here is my response to " + JSON.stringify(payload)
                        });
                    }
                })
                    .on('disconnect', function (client) {
                    if (client) {
                        logger.info("client \"" + client.id + "\" disconnected.");
                    }
                    else {
                        logger.info("an unknown client disconnected.");
                    }
                })
                    .on('remove', function (client) {
                    logger.info("client \"" + client.id + "\" removed.");
                })
                    .on('timeout', function (client) {
                    logger.info("client \"" + client.id + "\" timed-out (lastCheckIn: " + client.lastCheckin + ", now: " + new Date().valueOf() + ", timeout: " + server_1.timeout + ").");
                })
                    .on('error', function (error, module) {
                    logger.error("there was an error raised in module \"" + module + "\"...");
                    logger.error(error.stack ? error.stack : error.message);
                });
                // log settings
                logger.info("PORT is \"" + server_1.port + "\".");
                logger.info("TIMEOUT is \"" + server_1.timeout + "\".");
                // start listening
                server_1.listen();
            }
            catch (error) {
                logger.error(error.stack);
            }
            return [2 /*return*/];
        });
    });
}
// run setup
setup();
