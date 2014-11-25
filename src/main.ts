/**
 * @file Starts the webapp.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/// <reference path="../references/typed-react.d.ts" />
/// <reference path="../references/react.d.ts" />
/// <reference path="../references/react-bootstrap.d.ts" />

import React = require("react");

import C = require("./stores/contracts");
import Dispatcher = require("./stores/dispatcher");
import FiveOhFive = require("./ui/fiveOhFive");

import Router = require("./router");
import SessionStore = require("./stores/session");

/**
 * The webapp entry point.
 */
(function main() {
    "use strict";
    initTouchIfNeeded();

    var dispatcher = new Dispatcher;
    var session = new SessionStore(dispatcher);
    dispatcher.GET("/api/v0/user/session", null, render.bind(null, dispatcher, session));

    global.Dispatcher = dispatcher; // for debugging
    global.SessionStore = session; // for debugging
}());

function initTouchIfNeeded() {
    "use strict";
    var mobileBrowsers = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

    if (typeof window !== "undefined" && mobileBrowsers.test(navigator.userAgent)) {
        // Tell React to send us touch events.
        React.initializeTouchEvents(true);

        // Some touch devices require "cursor: pointer" for events to be sent
        require("./ui/touch.less");
    }
}

function render(dispatcher: C.IDispatcher, session: C.ISessionStore) {
    "use strict";
    var Component: React.ReactElement<any, any>;

    if (session.info.state !== undefined) {
        Component = React.createElement(Router.Component, {
            dispatcher: dispatcher,
            session: session});
    } else {
        Component = React.createElement(FiveOhFive.Component, {
            dispatcher: null,
            sessionInfo: session.info});
    }

    try {
        React.render(Component, document.body);
    } catch(err) {
        React.render(React.createElement(FiveOhFive.Component, {
            dispatcher: null,
            sessionInfo: session.info}), document.body);
        throw err;
    }
};
