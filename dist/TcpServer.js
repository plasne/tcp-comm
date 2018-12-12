"use strict";
// TODO: needs to support committing checkpoints to some kind of state
// TODO: need to document stuff better
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
var TcpComponent_1 = require("./TcpComponent");
/* tslint:enable */
// define server logic
var TcpServer = /** @class */ (function (_super) {
    __extends(TcpServer, _super);
    function TcpServer(options) {
        var _this = _super.call(this, options) || this;
        _this.clients = [];
        // options or defaults
        _this.options = options || {};
        if (options) {
            var local = _this.options;
            local.port = TcpComponent_1.TcpComponent.toInt(local.port);
        }
        return _this;
    }
    Object.defineProperty(TcpServer.prototype, "port", {
        get: function () {
            var local = this.options;
            return local.port || 8000;
        },
        enumerable: true,
        configurable: true
    });
    TcpServer.prototype.listen = function () {
        var _this = this;
        // ensure errors are being trapped
        if (this.listenerCount('error') < 1) {
            throw new Error('you must attach at least 1 error listener.');
        }
        // start listening for TCP
        net.createServer(function (socket) {
            // pipe input to a stream and break on messages
            var stream = socket.pipe(split());
            // handle messages
            stream.on('data', function (data) {
                _this.receive(socket, data);
            });
            // handle timeouts
            if (_this.options.timeout) {
                socket.setTimeout(_this.options.timeout);
                socket.on('timeout', function () {
                    var client = _this.clients.find(function (c) { return c.socket === socket; });
                    _this.emit('timeout', client);
                    _this.emit('disconnect', client);
                    if (client)
                        client.socket = undefined;
                    socket.destroy();
                });
            }
            // look for any disconnects
            socket.on('end', function () {
                var client = _this.clients.find(function (c) { return c.socket === socket; });
                if (client) {
                    _this.emit('disconnect', client);
                    client.socket = undefined;
                }
                else {
                    _this.emit('disconnect');
                }
            });
        }).listen(this.port, function () {
            _this.emit('listen');
        });
    };
    TcpServer.prototype.send = function (client, payload, options) {
        return this.sendToClient(client, {
            c: 'data',
            p: payload
        }, options);
    };
    TcpServer.prototype.add = function (client) {
        this.clients.push(client);
        this.emit('add', client);
    };
    TcpServer.prototype.remove = function (client) {
        var index = this.clients.indexOf(client);
        if (index > -1)
            this.clients.splice(index, 1);
        this.emit('remove', client);
    };
    TcpServer.prototype.process = function (socket, msg) {
        return __awaiter(this, void 0, void 0, function () {
            var client, isNew;
            return __generator(this, function (_a) {
                switch (msg.c) {
                    case 'checkin':
                        client = this.clients.find(function (c) { return c.id === msg.p; });
                        isNew = false;
                        if (client) {
                            client.lastCheckin = new Date().valueOf();
                            if (!client.socket || client.socket !== socket) {
                                if (client.socket)
                                    client.socket.end();
                                client.socket = socket;
                                isNew = true;
                            }
                        }
                        else {
                            client = {
                                id: msg.p,
                                lastCheckin: new Date().valueOf(),
                                socket: socket
                            };
                            this.add(client);
                            isNew = true;
                        }
                        if (isNew) {
                            this.emit('connect', client);
                        }
                        this.emit('checkin', client);
                        break;
                }
                return [2 /*return*/, _super.prototype.process.call(this, socket, msg)];
            });
        });
    };
    TcpServer.prototype.sendToClient = function (client, msg, options) {
        if (client.socket) {
            return this.sendToSocket(client.socket, msg, options);
        }
        else if (options && options.receipt) {
            throw new Error("ENOTOPEN: a receipt was requested but the socket is not open.");
        }
        else {
            return Promise.resolve();
        }
    };
    return TcpServer;
}(TcpComponent_1.TcpComponent));
exports.TcpServer = TcpServer;
