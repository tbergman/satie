var _ = require("lodash");
var assert = require("assert");
var C = require("./contracts");
var ajax = require("../util/ajax");
var types = require("./types");
var isBrowser = typeof window !== "undefined";
var FLUX_DEBUG = isBrowser && global.location.search.indexOf("fluxDebug=1") !== -1;
var Dispatcher = (function () {
    function Dispatcher() {
        var _this = this;
        this._dispatch = _.debounce(function (url, verb, postData, onSuccess, onError) {
            assert(verb, "Verb must be defined");
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
                    _this._dispatchImpl({
                        description: "GET " + root + (request.status === 200 ? "" : " ERROR"),
                        status: request.status,
                        resource: resource,
                        query: query,
                        url: url,
                        response: response,
                        postData: null
                    }, onSuccess, onError);
                });
            }
            else if (verb in immediateActions) {
                _this._dispatchImpl({
                    description: verb + " " + root,
                    resource: resource,
                    response: null,
                    status: null,
                    query: query,
                    postData: postData
                }, fireAction, onError);
            }
            function fireAction() {
                var _this = this;
                if ((verb in networkActions) && !url.indexOf("/api")) {
                    ajax.untrusted.anyJSON(verb, url, postData, function (response, request) {
                        _this._dispatchImpl({
                            description: verb + " " + root + (request.status === 200 ? " DONE" : " ERROR"),
                            status: request.status,
                            resource: resource,
                            query: query,
                            url: url,
                            response: response,
                            postData: null
                        }, onSuccess, onError);
                    });
                }
                else {
                    _.defer(function () { return onSuccess(null); });
                }
            }
        }, 0);
        this._events = "";
        this._inAction = null;
        this._callbacks = [];
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
    Dispatcher.prototype._dispatchImpl = function (action, onSuccess, onError) {
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
        try {
            this._inAction = action.description;
            _.forEach(this._callbacks, function (callback) {
                callback(action);
            });
            this._inAction = null;
        }
        catch (err) {
            this._inAction = null;
            if (err instanceof C.DispatcherRedirect) {
                var redirect = err;
                this._dispatch(redirect.newUrl, redirect.verb, redirect.postData);
            }
            if (onError) {
                onError(err);
            }
            else {
                console.warn("Exception occurred in promise", err);
                console.log(err.stack);
            }
        }
        if (onSuccess) {
            onSuccess(action);
        }
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
