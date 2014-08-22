/**
 * Dispatcher based on the Flux TodoMVC Tutorial.
 * http://facebook.github.io/react/docs/flux-todo-list.html
 *
 * "Flux is the application architecture that Facebook
 * uses for building client-side web applications. It
 * complements React"s composable view components by
 * utilizing a unidirectional data flow. It"s more of
 * a pattern rather than a formal framework, and you
 * can start using Flux immediately without a lot of
 * new code."
 *
 * See also ripieno
 */

/// <reference path="../../references/es6-promise.d.ts" />
/// <reference path="../../references/node.d.ts" />

import Promise = require("es6-promise");
import _ = require("lodash");
import assert = require("assert");

import C = require("./contracts");
import ajax = require("../../node_modules/ripienoUtil/ajax");

var _callbacks: Array<(payload: any) => boolean> = [];
var _promises: Array<Promise<any>> = [];

var isBrowser = typeof window !== "undefined";
var FLUX_DEBUG = isBrowser && global.location.search.indexOf("fluxDebug=1") !== -1;

/**
 * Add a promise to the queue of callback invocation promises.
 * @param {function} callback The Store"s registered callback.
 * @param {object} payload The data from the Action.
 */
var _addPromise = function(callback: (payload: any) => boolean, payload: any) {
    _promises.push(new Promise.Promise(function(resolve, reject) {
        if (callback(payload)) {
            resolve(payload);
        } else {
            reject(new Error("Dispatcher callback unsuccessful"));
        }
    }));
};

/**
 * Empty the queue of callback invocation promises.
 */
var _clearPromises = function() {
    _promises = [];
    inAction = false;
};

export class Dispatcher {
    /**
     * Register a Store"s callback so that it may be invoked by an action.
     * @param {function} callback The callback to be registered.
     * @return {number} The index of the callback within the _callbacks array.
     */
    register(callback: (payload: any) => boolean) {
        _callbacks.push(callback);
        return _callbacks.length - 1; // index
    }

    inAction : boolean = false;

    /**
     * dispatch
     * @param  {object} action The data from the action.
     */
    dispatch(action: C.IFluxAction) {
        if (FLUX_DEBUG || inAction) {
            console.log(action.description +
                (action.resource ? " " + action.resource : ""),
                (action.query ? " " + action.query : ""),
                (action.postData ? [action.postData] : []), [action]);
        }

        if (inAction) {
            assert(false, "Queueing an action during an action is a violation of Flux");
        }

        _.each(_callbacks, function(callback) {
            _addPromise(callback, action);
        });

        this.inAction = true;
        /* tslint:disable */
        Promise.Promise
            .all(_promises)
            .then(_clearPromises)
            ["catch"]((err) => { // For support with IE 6.
                inAction = false;
                console.warn("Exception occured in promise", err);
            });
        /* tslint:enable */
    }
}

export var Instance = new Dispatcher();

var inAction = false;

var immediateActions = {
    PUT: true,      // update the server (replace an existing item)
    POST: true,     // update the server (create a new item)
    DELETE: true    // deactivate a local object
};

var networkActions = {
    GET: true,
    POST: true,
    PUT: true,
    DELETE: true
};

export var dispatch = function(url: string, verb: string, postData: any) : void {
    assert(verb, "Verb must be defined");

    var root = url;
    var resource: string = null;
    var query: string = null;

    if (root.indexOf("?") !== -1) {
        query = root.substr(root.indexOf("?") + 1);
        root = root.substr(0, root.indexOf("?"));
    }
    if (root.indexOf("/_") !== -1) {
        resource = root.substr(root.indexOf("/_") + 2);
        root = root.substr(0, root.indexOf("/_"));
    }

    if (verb === "GET") {
        ajax.untrusted.getJSON(url, (response: any, request: XMLHttpRequest) => {
            Instance.dispatch({
                description: "GET " + root + (request.status === 200 ? "" : " ERROR"),
                status: request.status,
                resource: resource,
                query: query,
                url: url,
                response: response,
                postData: null
            });
        });
    } else if (verb in immediateActions) {
        Instance.dispatch({
            description: verb + " " + root,
            resource: resource,
            response: null,
            status: null,
            query: query,
            postData: postData
        });

        if ((verb in networkActions) && !url.indexOf("/api")) {
            ajax.untrusted.anyJSON(verb, url, postData, (response: any, request: XMLHttpRequest) => {
                Instance.dispatch({
                    description: verb + " " + root + (request.status === 200 ? " DONE" : " ERROR"),
                    status: request.status,
                    resource: resource,
                    query: query,
                    url: url,
                    response: response,
                    postData: null
                });
            });
        }
    }
};

export var DELETE = function(url: string, p?: any) {
    dispatch(url, "DELETE", p);
};
export var PUT = function(url: string, p?: any) {
    dispatch(url, "PUT", p);
};
export var POST = function(url: string, p?: any) {
    dispatch(url, "POST", p);
};
export var GET = function(url: string, p?: any) {
    dispatch(url, "GET", p);
};
