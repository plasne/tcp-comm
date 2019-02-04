"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
// includes
var net = require("net");
var split = require("split");
var uuid_1 = require("uuid");
var TcpComponent_1 = require("./TcpComponent");
/* tslint:enable */
// define server logic
var TcpClient = /** @class */ (function (_super) {
    __extends(TcpClient, _super);
    function TcpClient(options) {
        var _this = _super.call(this, options) || this;
        _this.socketIsOpen = false;
        // options or defaults
        _this.options = options || {};
        if (options) {
            var local = _this.options;
            local.port = TcpComponent_1.TcpComponent.toInt(local.port);
            local.checkin = TcpComponent_1.TcpComponent.toInt(local.checkin);
        }
        // start the timed checkin process
        //  NOTE: for now, metadata is only sent at connect
        var checkin = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.checkinToServer()];
                    case 1:
                        _a.sent();
                        setTimeout(function () {
                            checkin();
                        }, this.checkin);
                        return [2 /*return*/];
                }
            });
        }); };
        checkin();
        return _this;
    }
    Object.defineProperty(TcpClient.prototype, "id", {
        get: function () {
            var local = this.options;
            if (!local.id)
                local.id = uuid_1.v4();
            return local.id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TcpClient.prototype, "metadata", {
        get: function () {
            var local = this.options;
            return local.metadata;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TcpClient.prototype, "address", {
        get: function () {
            var local = this.options;
            return local.address || '127.0.0.1';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TcpClient.prototype, "port", {
        get: function () {
            var local = this.options;
            return local.port || 8000;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TcpClient.prototype, "checkin", {
        get: function () {
            var local = this.options;
            return local.checkin || 10000;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TcpClient.prototype, "isConnected", {
        get: function () {
            return this.socket && this.socketIsOpen;
        },
        enumerable: true,
        configurable: true
    });
    TcpClient.prototype.connect = function () {
        var _this = this;
        // ensure errors are being trapped
        if (this.listenerCount('error') < 1) {
            throw new Error('you must attach at least 1 error listener.');
        }
        // use a new socket
        this.socketIsOpen = false;
        this.socket = new net.Socket();
        // handle connection
        this.socket.on('connect', function () {
            if (_this.socket) {
                _this.socketIsOpen = true;
                _this.emit('connect');
                // pipe input to a stream and break on messages
                var stream = _this.socket.pipe(split());
                // handle messages
                stream.on('data', function (data) {
                    if (_this.socket) {
                        _this.receive(_this.socket, data);
                    }
                });
                // checkin immediately on connect
                _this.checkinToServer(_this.metadata);
            }
        });
        // handle timeouts
        if (this.options.timeout) {
            this.socket.setTimeout(this.options.timeout);
            this.socket.on('timeout', function () {
                _this.emit('timeout');
                if (_this.socket)
                    _this.socket.end();
            });
        }
        // look for any communication errors
        this.socket.on('error', function (error) {
            if (error.message.includes('ECONN')) {
                setTimeout(function () {
                    connectToServer();
                }, 1000);
            }
            _this.emit('error', error, 'socket');
        });
        // look for any disconnects
        this.socket.on('end', function () {
            // dispose of the socket
            _this.socketIsOpen = false;
            _this.socket = undefined;
            // emit disonnect
            _this.emit('disconnect');
            // try a brand new connection after 1 second
            setTimeout(function () {
                _this.connect();
            }, 1000);
        });
        // connect to the server immediately
        var connectToServer = function () {
            try {
                if (!_this.socket)
                    return;
                _this.socket.connect(_this.port, _this.address);
            }
            catch (error) {
                _this.emit('error', error, 'connect');
                setTimeout(function () {
                    connectToServer();
                }, 1000); // keep trying
            }
        };
        setTimeout(function () {
            connectToServer();
        }, 0);
        return this;
    };
    TcpClient.prototype.tell = function (cmd, payload, options) {
        if (cmd) {
            var used = ['data', 'checkin'];
            if (used.includes(cmd)) {
                throw new Error("command \"" + cmd + "\" is a reserved keyword.");
            }
        }
        else {
            cmd = 'data';
        }
        return this.sendToServer({
            c: cmd || 'data',
            p: payload
        }, options);
    };
    TcpClient.prototype.ask = function (cmd, payload, options) {
        var o = options || {};
        o.receipt = true;
        return this.tell(cmd, payload, o);
    };
    TcpClient.prototype.process = function (_, msg) {
        return __awaiter(this, void 0, void 0, function () {
            var eid_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (msg.c) {
                    default:
                        eid_1 = msg.c === 'data' ? 'data' : "cmd:" + msg.c;
                        if (this.listenerCount(eid_1) < 1) {
                            // don't bother to emit
                        }
                        else if (msg.i) {
                            return [2 /*return*/, new Promise(function (resolve) {
                                    var respond = function (response) {
                                        resolve(response);
                                    };
                                    _this.emit(eid_1, msg.p, respond);
                                })];
                        }
                        else {
                            this.emit(eid_1, msg.p);
                        }
                        break;
                }
                return [2 /*return*/];
            });
        });
    };
    TcpClient.prototype.sendToServer = function (msg, options) {
        if (this.socket && this.socketIsOpen) {
            return this.sendToSocket(this.socket, msg, options);
        }
        else if (options && options.receipt) {
            throw new Error("ENOTOPEN: a receipt was requested but the socket is not open.");
        }
        else {
            return Promise.resolve();
        }
    };
    TcpClient.prototype.checkinToServer = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (!(this.socket && this.socketIsOpen)) return [3 /*break*/, 2];
                        payload = payload || {};
                        if (!payload.id)
                            payload.id = this.id;
                        return [4 /*yield*/, this.sendToServer({
                                c: 'checkin',
                                p: payload
                            }, {
                                receipt: true
                            })];
                    case 1:
                        _a.sent();
                        this.emit('checkin');
                        _a.label = 2;
                    case 2: return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.emit('error', error_1, 'checkin');
                        if (this.socket)
                            this.socket.end();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return TcpClient;
}(TcpComponent_1.TcpComponent));
exports.TcpClient = TcpClient;
