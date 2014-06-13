/**
 * Dispatcher based on the Flux TodoMVC Tutorial.
 * http://facebook.github.io/react/docs/flux-todo-list.html
 *
 * "Flux is the application architecture that Facebook
 * uses for building client-side web applications. It
 * complements React's composable view components by
 * utilizing a unidirectional data flow. It's more of
 * a pattern rather than a formal framework, and you
 * can start using Flux immediately without a lot of
 * new code."
 *
 * See also ripieno
 */

var Promise = require('es6-promise').Promise;
var assert = require("assert");

var ajax = require("./util/ajax.jsx").untrusted;

var _callbacks = [];
var _promises = [];

/**
 * Add a promise to the queue of callback invocation promises.
 * @param {function} callback The Store's registered callback.
 * @param {object} payload The data from the Action.
 */
var _addPromise = function(callback, payload) {
    _promises.push(new Promise(function(resolve, reject) {
        if (callback(payload)) {
            resolve(payload);
        } else {
            reject(new Error('Dispatcher callback unsuccessful'));
        }
    }));
};

/**
 * Empty the queue of callback invocation promises.
 */
var _clearPromises = function() {
    _promises = [];
};

class Dispatcher {
    /**
     * Register a Store's callback so that it may be invoked by an action.
     * @param {function} callback The callback to be registered.
     * @return {number} The index of the callback within the _callbacks array.
     */
    register(callback) {
        _callbacks.push(callback);
        return _callbacks.length - 1; // index
    }

    /**
     * dispatch
     * @param  {object} action The data from the action.
     */
    dispatch(action) {
        console.log(action.description + (action.resource ? " " + action.resource : "") +
                (action.query ? " " + action.query : ""),
                (action.postData ? [action.postData] : ""), [action]);
        _callbacks.forEach(function(callback) {
            _addPromise(callback, action);
        });
        Promise
            .all(_promises)
            .then(_clearPromises)
            .catch((err) => {
                console.warn("Exception occured in promise", err);
            });
    }
};

var DispatcherInstance = new Dispatcher();

var immediateActions = {
    PUT: true,      // update the server (replace an existing item)
    POST: true,     // update the server (create a new item)
    SHOW: true,     // activate a local object
    HIDE: true,     // deactivate a local object
    SET: true       // change the value of a local object
};

var networkActions = {
    GET: true,
    POST: true,
    PUT: true
};

String.prototype.dispatch = function(verb, postData) {
    assert(verb, "Verb must be defined");

    var root = this;
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
        ajax.getJSON(this, (response, request) => {
            DispatcherInstance.dispatch({
                description: "GET " + root + (request.status === 200 ? "" : " ERROR"),
                status: request.status,
                resource: resource,
                query: query,
                url: this,
                response: response
            });
        });
    } else if (verb in immediateActions) {
        DispatcherInstance.dispatch({
            description: verb + " " + root,
            resource: resource,
            query: query,
            postData: postData
        });

        if ((verb in networkActions) !this.indexOf("/api")) {
            ajax.anyJSON(verb, this, postData, (response, request) => {
                DispatcherInstance.dispatch({
                    description: verb + " " + root + (request.status === 200 ? " DONE" : " ERROR"),
                    status: request.status,
                    resource: resource,
                    query: query,
                    url: this,
                    response: response
                });
            });
        }
    }
}
String.prototype.SHOW = function(p) { this.dispatch("SHOW", p); }
String.prototype.HIDE = function(p) { this.dispatch("HIDE", p); }
String.prototype.PUT = function(p) { this.dispatch("PUT", p); }
String.prototype.POST = function(p) { this.dispatch("POST", p); }
String.prototype.GET = function(p) { this.dispatch("GET", p); }
String.prototype.SET = function(p) { this.dispatch("SET", p); }

module.exports = DispatcherInstance;
