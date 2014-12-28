var EventEmitter = require("events");
var TSEE = (function () {
    function TSEE() {
        EventEmitter.EventEmitter.call(this);
    }
    TSEE.prototype.addListener = function (event, listener) {
        EventEmitter.EventEmitter.prototype.addListener.call(this, event, listener);
    };
    TSEE.prototype.on = function (event, listener) {
        return EventEmitter.EventEmitter.prototype.on.call(this, event, listener);
    };
    TSEE.prototype.once = function (event, listener) {
        EventEmitter.EventEmitter.prototype.once.call(this, event, listener);
    };
    TSEE.prototype.removeListener = function (event, listener) {
        EventEmitter.EventEmitter.prototype.removeListener.call(this, event, listener);
    };
    TSEE.prototype.removeAllListener = function (event) {
        EventEmitter.EventEmitter.prototype.removeAllListener.call(this, event);
    };
    TSEE.prototype.setMaxListeners = function (n) {
        EventEmitter.EventEmitter.prototype.setMaxListeners.call(this, n);
    };
    TSEE.prototype.listeners = function (event) {
        return EventEmitter.EventEmitter.prototype.listeners.call(this, event);
    };
    TSEE.prototype.emit = function (event, arg1, arg2) {
        EventEmitter.EventEmitter.prototype.emit.call(this, event, arg1, arg2);
    };
    return TSEE;
})();
module.exports = TSEE;
