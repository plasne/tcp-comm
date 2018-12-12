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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// includes
var events_1 = require("events");
var lzutf8 = __importStar(require("lzutf8"));
var TcpComponent = /** @class */ (function (_super) {
    __extends(TcpComponent, _super);
    function TcpComponent(options) {
        var _this = _super.call(this) || this;
        _this.messageId = 0;
        // options or defaults
        _this.options = options || {};
        _this.options.timeout = TcpComponent.toInt(_this.options.timeout);
        return _this;
    }
    TcpComponent.toInt = function (value) {
        if (isNaN(value))
            return undefined;
        return parseInt(value, 10);
    };
    Object.defineProperty(TcpComponent.prototype, "timeout", {
        get: function () {
            return this.options.timeout || 30000;
        },
        enumerable: true,
        configurable: true
    });
    TcpComponent.prototype.process = function (_, msg) {
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
    TcpComponent.prototype.receive = function (socket, data) {
        var _this = this;
        try {
            if (data) {
                var str = data.toString('utf8');
                var msg_1 = JSON.parse(str);
                // handle the received message
                var receive_1 = function (rmsg) { return __awaiter(_this, void 0, void 0, function () {
                    var _a, response, ack;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _a = rmsg.c;
                                switch (_a) {
                                    case 'ack': return [3 /*break*/, 1];
                                }
                                return [3 /*break*/, 2];
                            case 1:
                                this.emit("ack:" + rmsg.i, rmsg.p);
                                return [3 /*break*/, 4];
                            case 2: return [4 /*yield*/, this.process(socket, rmsg)];
                            case 3:
                                response = _b.sent();
                                if (rmsg.i) {
                                    ack = {
                                        c: 'ack',
                                        i: rmsg.i,
                                        p: response
                                    };
                                    this.sendToSocket(socket, ack);
                                    this.emit('ack', ack, msg_1);
                                }
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); };
                // decode if needed
                if (msg_1.e) {
                    lzutf8.decompressAsync(msg_1.p, {
                        inputEncoding: 'Base64',
                        outputEncoding: 'String'
                    }, function (result, error) {
                        if (!error) {
                            if (msg_1.e === 1) {
                                msg_1.p = JSON.parse(result);
                            }
                            else {
                                msg_1.p = result;
                            }
                            receive_1(msg_1);
                        }
                        else {
                            _this.emit('error', error, 'decode');
                        }
                    });
                }
                else {
                    receive_1(msg_1);
                }
            }
        }
        catch (error) {
            this.emit('error', error, 'data');
        }
    };
    TcpComponent.prototype.sendToSocket = function (socket, msg, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                // dispatch to the server
                var dispatch_1 = function (dmsg) {
                    if (options && options.receipt) {
                        _this.messageId++;
                        dmsg.i = _this.messageId;
                    }
                    var str = JSON.stringify(dmsg) + '\n';
                    socket.write(str, function () {
                        if (options && options.receipt) {
                            // if a receipt was requested, wait for it
                            var to_1 = setTimeout(function () {
                                reject(new Error("ETIMEOUT: failed to get receipt before timeout."));
                            }, _this.timeout);
                            _this.once("ack:" + dmsg.i, function (payload) {
                                clearTimeout(to_1);
                                resolve(payload);
                            });
                        }
                        else {
                            // if no receipt was requested the send is done
                            resolve();
                        }
                    });
                };
                // encode as appropriate
                if (options &&
                    options.encode &&
                    (typeof msg.p === 'string' || typeof msg.p === 'object')) {
                    var payload = void 0;
                    var before_1;
                    if (typeof msg.p === 'string') {
                        payload = msg.p;
                        before_1 = msg.p.length;
                        msg.e = 2; // string
                    }
                    else {
                        payload = JSON.stringify(msg.p);
                        before_1 = payload.length;
                        msg.e = 1; // object
                    }
                    lzutf8.compressAsync(payload, {
                        inputEncoding: 'String',
                        outputEncoding: 'Base64'
                    }, function (result, error) {
                        if (!error) {
                            msg.p = result.toString();
                            var after = msg.p.length;
                            _this.emit('encode', before_1, after);
                        }
                        else {
                            msg.e = 0;
                        }
                        dispatch_1(msg);
                    });
                }
                else {
                    msg.e = 0;
                    dispatch_1(msg);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    };
    return TcpComponent;
}(events_1.EventEmitter));
exports.TcpComponent = TcpComponent;
