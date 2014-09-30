/**
 * @file Starts the webapp.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/// <reference path="../node_modules/react-typescript-definitions/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />

import React = require("react");

import Dispatcher = require("./stores/dispatcher");
import Router = require("./router");
import SessionStore = require("./stores/session");
import webViews = require("./webViews");

var ReactPerf = require("react/lib/ReactDefaultPerf");
var FiveOhFive = require("./landing/fiveOhFive.jsx");

/**
 * The webapp entry point.
 */
(function main() { "use strict";
    initTouchIfNeeded();
    setDebugGlobals();
    webViews.initWebViews();

    var session = new SessionStore.SessionStore();
    Dispatcher.GET("/api/v0/user/session", null, render.bind(null, session));
}());

function initTouchIfNeeded() { "use strict";
    var mobileBrowsers = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

    if (typeof window !== "undefined" && mobileBrowsers.test(navigator.userAgent)) {
        // Tell React to send us touch events.
        React.initializeTouchEvents(true);

        // Some touch devices require "cursor: pointer" for events to be sent
        require("./landing/touch.less");
    }
}

function setDebugGlobals() { "use strict";
    global.React = React; // for Chrome DevTools extension and React typescript extension
    global.ReactPerf = ReactPerf; // for monkeying around in the console
}

function render(session: SessionStore.SessionStore) { "use strict";
    var component: React.ReactComponent<any, any>;

    if (session.info.state !== undefined) {
        component = Router.Component({ session: session });
    } else {
        component = FiveOhFive({ session: session.info });
    }

    try {
        React.renderComponent(component, document.body);
    } catch(err) {
        React.renderComponent(FiveOhFive({ session: session.info }), document.body);
    }
};
