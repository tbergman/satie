/**
 * @file Dispatcher based on the Flux TodoMVC Tutorial.
 * http://facebook.github.io/react/docs/flux-todo-list.html
 * 
 * "Flux is the application architecture that Facebook uses for building
 * client-side web applications. It complements React"s composable view
 * components by utilizing a unidirectional data flow. It's more of a pattern
 * rather than a formal framework, and you can start using Flux immediately
 * without a lot of new code."
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Promise = require("es6-promise");
import _ = require("lodash");
import assert = require("assert");

import C = require("./contracts");
import ajax = require("../util/ajax");
import types = require("./types");

var isBrowser = typeof window !== "undefined";
var FLUX_DEBUG = isBrowser && global.location.search.indexOf("fluxDebug=1") !== -1;

class Dispatcher implements C.IDispatcher {
    constructor() {
        types.ensureRegistered();
    }
    register(callback: (payload: any) => boolean) {
        this._callbacks.push(callback);
        return this._callbacks.length - 1; // index
    }

    unregister(callback: (payload: any) => boolean) {
        this._callbacks = this._callbacks.filter(cb => cb !== callback);
    }

	DELETE(url: string, p?: any, successCB?: (response: any) => void, errorCB?: (error: any) => void): Promise<void> {
	    return this._dispatch(url, "DELETE", p, successCB, errorCB); }
	GET(url: string, p?: any, successCB?: (response: any) => void, errorCB?: (error: any) => void): Promise<void> {
	    return this._dispatch(url, "GET", p, successCB, errorCB); }
    PATCH(url: string, p?: any, successCB?: (response: any) => void, errorCB?: (error: any) => void): Promise<void> {
        return this._dispatch(url, "PATCH", p, successCB, errorCB); }
	POST(url: string, p?: any, successCB?: (response: any) => void, errorCB?: (error: any) => void): Promise<void> {
	    return this._dispatch(url, "POST", p, successCB, errorCB); }
	PUT(url: string, p?: any, successCB?: (response: any) => void, errorCB?: (error: any) => void): Promise<void> {
	    return this._dispatch(url, "PUT", p, successCB, errorCB); }

    _dispatch(url: string, verb: string, postData: any, successCB?: (response: any) => void, errorCB?: (error: any) => void) : Promise<void> {
	    assert(verb, "Verb must be defined");

        var pr: Promise<void>;

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
	            var ev = this._dispatchImpl({
	                description: "GET " + root + (request.status === 200 ? "" : " ERROR"),
	                status: request.status,
	                resource: resource,
	                query: query,
	                url: url,
	                response: response,
                    postData: null
	            }, errorCB);

	            if (successCB) {
                    ev.then(() => successCB(response));
	            }
	        });
	    } else if (verb in immediateActions) {
	        pr = this._dispatchImpl({
	            description: verb + " " + root,
	            resource: resource,
	            response: null,
	            status: null,
	            query: query,
                postData: postData
	        }, errorCB);

	        if ((verb in networkActions) && !url.indexOf("/api")) {
	            ajax.untrusted.anyJSON(verb, url, postData, (response: any, request: XMLHttpRequest) => {
	                var ev = this._dispatchImpl({
	                    description: verb + " " + root + (request.status === 200 ? " DONE" : " ERROR"),
	                    status: request.status,
	                    resource: resource,
	                    query: query,
	                    url: url,
	                    response: response,
                        postData: null
	                }, errorCB);

	                if (successCB) {
                        ev.then(() => successCB(response));
	                }
	            });
	        } else {
	            assert(!successCB, "Callbacks are only necessary for network actions.");
	        }
	    }

        return pr;
	}


    /**
     * Add a promise to the queue of callback invocation promises.
     * @param {function} callback The Store"s registered callback.
     * @param {object} payload The data from the Action.
     */
    private _addPromise(callback: (payload: any) => boolean, payload: any) {
        this._promises.push(new Promise.Promise(function resolvePromise(resolve, reject) {
            if (callback(payload)) {
                resolve(payload);
            } else {
                reject(new Error("Dispatcher callback unsuccessful"));
            }
        }));
    }

    /**
     * Empty the queue of callback invocation promises.
     */
    private _clearPromises = () => {
        this._promises = [];
        this._inAction = null;
    };

    /**
     * For debugging
     */
    _events: string = "";

    private _inAction: string = null;

    /**
     * dispatch
     * @param  {object} action The data from the action.
     */
    private _dispatchImpl<PostData, Response>(action: C.IFluxAction<PostData>, onError?: (err?: any) => void) {
        if (FLUX_DEBUG) {
            console.log(action.description +
                (action.resource ? " " + action.resource : ""),
                (action.query ? " " + action.query : ""),
                (action.postData ? [action.postData] : []), [action]);
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
                } else {
                    var lines = data.split("\n");
                    if (lines.length > 1) {
                        this._events += "(" + lines.map((v, i) => (i ? "  " : "") + v).join("\n") + ")";
                    } else if (lines.length === 1) {
                        this._events += "(" + lines[0] + ")";
                    }
                }
            }
            this._events += "\n";
        }

        _.each(this._callbacks, callback => {
            this._addPromise(callback, action);
        });

        this._inAction = action.description;
        /* tslint:disable */
        return Promise.Promise
            .all(this._promises)
            .then(this._clearPromises)
            .catch((err) => {
                this._clearPromises();
                if (err instanceof C.DispatcherRedirect) {
                    var redirect: C.DispatcherRedirect = err;
                    this._dispatch(redirect.newUrl, redirect.verb, redirect.postData);
                }
                this._inAction = null;
                if (onError) {
                    onError(err);
                } else {
                    console.warn("Exception occurred in promise", err);
                    console.log(err.stack);
                }
            });
        /* tslint:enable */
    }

    _callbacks: Array<(payload: any) => boolean> = [];
    _promises: Array<Promise<any>> = [];
}

var immediateActions = {
    PATCH: true,
    PUT: true,      // update the server (replace an existing item)
    POST: true,     // update the server (create a new item)
    DELETE: true    // deactivate a local object
};

var networkActions = {
    GET: true,
    PATCH: true,
    POST: true,
    PUT: true,
    DELETE: true
};

export = Dispatcher;
