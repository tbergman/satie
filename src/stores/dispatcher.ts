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

class Dispatcher implements C.IDispatcher {
    register(callback: (payload: any) => boolean) {
        _callbacks.push(callback);
        return _callbacks.length - 1; // index
    }

	DELETE(url: string, p?: any, cb?: () => void) {
	    this._dispatch(url, "DELETE", p, cb); }
	GET(url: string, p?: any, cb?: () => void) {
	    this._dispatch(url, "GET", p, cb); }
    PATCH(url: string, p?: any, cb?: () => void) {
        this._dispatch(url, "PATCH", p, cb); }
	POST(url: string, p?: any, cb?: () => void) {
	    this._dispatch(url, "POST", p, cb); }
	PUT(url: string, p?: any, cb?: () => void) {
	    this._dispatch(url, "PUT", p, cb); }

    _dispatch(url: string, verb: string, postData: any, cb?: () => void) : void {
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
	            this._dispatchImpl({
	                description: "GET " + root + (request.status === 200 ? "" : " ERROR"),
	                status: request.status,
	                resource: resource,
	                query: query,
	                url: url,
	                response: response,
	                postData: null
	            });

	            if (cb) {
	                cb();
	            }
	        });
	    } else if (verb in immediateActions) {
	        this._dispatchImpl({
	            description: verb + " " + root,
	            resource: resource,
	            response: null,
	            status: null,
	            query: query,
	            postData: postData
	        });

	        if ((verb in networkActions) && !url.indexOf("/api")) {
	            ajax.untrusted.anyJSON(verb, url, postData, (response: any, request: XMLHttpRequest) => {
	                this._dispatchImpl({
	                    description: verb + " " + root + (request.status === 200 ? " DONE" : " ERROR"),
	                    status: request.status,
	                    resource: resource,
	                    query: query,
	                    url: url,
	                    response: response,
	                    postData: null
	                });

	                if (cb) {
	                    cb();
	                }
	            });
	        } else {
	            assert(!cb, "Callbacks are only necessary for network actions.");
	        }
	    }
	}


    /**
     * Add a promise to the queue of callback invocation promises.
     * @param {function} callback The Store"s registered callback.
     * @param {object} payload The data from the Action.
     */
    private _addPromise(callback: (payload: any) => boolean, payload: any) {
        _promises.push(new Promise.Promise(function(resolve, reject) {
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
    private _clearPromises = function _clearPromises() {
        _promises = [];
        this._inAction = false;
    }.bind(this);

    /**
     * For debugging
     */
    _events: string = "";

    private _inAction: boolean = false;

    /**
     * dispatch
     * @param  {object} action The data from the action.
     */
    private _dispatchImpl(action: C.IFluxAction) {
        if (FLUX_DEBUG || this._inAction) {
            console.log(action.description +
                (action.resource ? " " + action.resource : ""),
                (action.query ? " " + action.query : ""),
                (action.postData ? [action.postData] : []), [action]);
        }

        if (global.localStorage && localStorage["superCowPowers"]) {
            if (this._events.length > 6000) {
                this._events = this._events.substr(this._events.length - 6000);
            }
            this._events += action.description + " " + JSON.stringify(action.resource ? " " + action.resource : "") + " " +
                JSON.stringify(action.query ? " " + action.query : "") + " " +
                JSON.stringify(action.postData) + "\n";
        }

        if (this._inAction) {
            assert(false, "Queuing an action during an action is a violation of Flux");
        }

        _.each(_callbacks, callback => {
            this._addPromise(callback, action);
        });

        this._inAction = true;
        /* tslint:disable */
        Promise.Promise
            .all(_promises)
            .then(this._clearPromises)
            ["catch"]((err) => { // For support with IE 6.
                this._inAction = false;
                console.warn("Exception occurred in promise", err);
                console.log(err.stack);
            });
        /* tslint:enable */
    }
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
