var Promise = require("es6-promise");
var _ = require("lodash");
var assert = require("assert");
var C = require("./contracts");
var ajax = require("../util/ajax");
var types = require("./types");
var isBrowser = typeof window !== "undefined";
var FLUX_DEBUG = isBrowser && global.location.search.indexOf("fluxDebug=1") !== -1;
var Dispatcher = (function () {
    function Dispatcher() {
        this._events = "";
        this._inAction = null;
        this._callbacks = [];
        this._promises = [];
        types.ensureRegistered();
    }
    Dispatcher.prototype.register = function (callback) {
        this._callbacks.push(callback);
        return this._callbacks.length - 1;
    };
    Dispatcher.prototype.unregister = function (callback) {
        this._callbacks = this._callbacks.filter(function (cb) { return cb !== callback; });
    };
    Dispatcher.prototype.DELETE = function (url, p, onSuccess, onError) {
        return this._dispatch(url, "DELETE", p, onSuccess, onError);
    };
    Dispatcher.prototype.GET = function (url, p, onSuccess, onError) {
        return this._dispatch(url, "GET", p, onSuccess, onError);
    };
    Dispatcher.prototype.PATCH = function (url, p, onSuccess, onError) {
        return this._dispatch(url, "PATCH", p, onSuccess, onError);
    };
    Dispatcher.prototype.POST = function (url, p, onSuccess, onError) {
        return this._dispatch(url, "POST", p, onSuccess, onError);
    };
    Dispatcher.prototype.PUT = function (url, p, onSuccess, onError) {
        return this._dispatch(url, "PUT", p, onSuccess, onError);
    };
    Dispatcher.prototype._dispatch = function (url, verb, postData, onSuccess, onError) {
        var _this = this;
        assert(verb, "Verb must be defined");
        var pr;
        var root = url;
        var resource = null;
        var query = null;
        if (root.indexOf("?") !== -1) {
            query = root.substr(root.indexOf("?") + 1);
            root = root.substr(0, root.indexOf("?"));
        }
        if (root.indexOf("/_") !== -1) {
            resource = root.substr(root.indexOf("/_") + 2);
            root = root.substr(0, root.indexOf("/_"));
        }
        if (verb === "GET") {
            ajax.untrusted.getJSON(url, function (response, request) {
                var ev = _this._dispatchImpl({
                    description: "GET " + root + (request.status === 200 ? "" : " ERROR"),
                    status: request.status,
                    resource: resource,
                    query: query,
                    url: url,
                    response: response,
                    postData: null
                }, onError);
                if (onSuccess) {
                    ev.then(function () { return onSuccess(response); });
                }
            });
        }
        else if (verb in immediateActions) {
            pr = this._dispatchImpl({
                description: verb + " " + root,
                resource: resource,
                response: null,
                status: null,
                query: query,
                postData: postData
            }, onError);
            if ((verb in networkActions) && !url.indexOf("/api")) {
                ajax.untrusted.anyJSON(verb, url, postData, function (response, request) {
                    var ev = _this._dispatchImpl({
                        description: verb + " " + root + (request.status === 200 ? " DONE" : " ERROR"),
                        status: request.status,
                        resource: resource,
                        query: query,
                        url: url,
                        response: response,
                        postData: null
                    }, onError);
                    if (onSuccess) {
                        ev.then(function () { return onSuccess(response); });
                    }
                });
            }
            else {
                assert(!onSuccess, "Callbacks are only necessary for network actions.");
            }
        }
        return pr;
    };
    Dispatcher.prototype._addPromise = function (callback, payload) {
        this._promises.push(new Promise.Promise(function resolvePromise(resolve, reject) {
            if (callback(payload)) {
                resolve(payload);
            }
            else {
                reject(new Error("Dispatcher callback unsuccessful"));
            }
        }));
    };
    Dispatcher.prototype._clearPromises = function () {
        this._promises = [];
        this._inAction = null;
    };
    Dispatcher.prototype._dispatchImpl = function (action, onError) {
        var _this = this;
        if (FLUX_DEBUG) {
            console.log(action.description + (action.resource ? " " + action.resource : ""), (action.query ? " " + action.query : ""), (action.postData ? [action.postData] : []), [action]);
        }
        if (global.localStorage && localStorage["superCowPowers"]) {
            if (this._events.length > 12000) {
                this._events = this._events.substr(this._events.length - 12000);
            }
            var done = action.description.indexOf(" DONE") !== -1;
            var errord = action.description.indexOf(" ERROR") !== -1;
            this._events += action.description.replace(" DONE", "").replace(" ERROR", "");
            if (action.resource) {
                this._events += "/_" + action.resource;
            }
            if (action.query) {
                this._events += "?" + action.query;
            }
            if (done) {
                this._events += " ✓";
            }
            if (errord) {
                this._events += " ✗";
            }
            if (action.postData) {
                var data = JSON.stringify(action.postData, null, 2);
                if (data.length > 400) {
                    this._events += "(" + data.length + " characters omitted…)";
                }
                else {
                    var lines = data.split("\n");
                    if (lines.length > 1) {
                        this._events += "(" + lines.map(function (v, i) { return (i ? "  " : "") + v; }).join("\n") + ")";
                    }
                    else if (lines.length === 1) {
                        this._events += "(" + lines[0] + ")";
                    }
                }
            }
            this._events += "\n";
        }
        _.each(this._callbacks, function (callback) {
            _this._addPromise(callback, action);
        });
        this._inAction = action.description;
        return Promise.Promise.all(this._promises).then(this._clearPromises).catch(function (err) {
            _this._clearPromises();
            if (err instanceof C.DispatcherRedirect) {
                var redirect = err;
                _this._dispatch(redirect.newUrl, redirect.verb, redirect.postData);
            }
            _this._inAction = null;
            if (onError) {
                onError(err);
            }
            else {
                console.warn("Exception occurred in promise", err);
                console.log(err.stack);
            }
        });
    };
    return Dispatcher;
})();
var immediateActions = {
    PATCH: true,
    PUT: true,
    POST: true,
    DELETE: true
};
var networkActions = {
    GET: true,
    PATCH: true,
    POST: true,
    PUT: true,
    DELETE: true
};
module.exports = Dispatcher;
