/**
 * @file The browser entry point.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/// <reference path="../node_modules/react-typescript-definitions/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />

import React = require("react");
var ReactPerf = require("react/lib/ReactDefaultPerf");
global.React = React; // for Chrome DevTools extension and React typescript extension
global.ReactPerf = ReactPerf; // for monkeying around in the console

import Dispatcher = require("./stores/dispatcher");
import Router = require("./router");
import SessionStore = require("./stores/session");
var FiveOhFive = require("./landing/fiveOhFive.jsx");

if (typeof window !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
            .test(navigator.userAgent)) {

    // Tell React to send us touch events.
    React.initializeTouchEvents(true);

    // Some touch devices require "cursor: pointer" for events to be sent
    require("./landing/touch.less");
}

Dispatcher.GET("/api/user/start_session", null, function() {
    if (SessionStore.Instance.session.state !== undefined) {
        // Enable the router once we have our session information.
        React.renderComponent(
            Router.Component({
                    errors: SessionStore.Instance.errors,
                    session: SessionStore.Instance.session,
                    songs: SessionStore.Instance.songs},
                null),
            document.body
        );
    } else {
        // The api server is likely down.
        React.renderComponent(
            FiveOhFive({
                session: SessionStore.Instance.session}),
            document.body
        );
    }
});
