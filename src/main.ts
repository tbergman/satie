/**
 * The browser entrypoint.
 */

/// <reference path="../node_modules/react-typescript-definitions/react.d.ts" />
/// <reference path="../node_modules/react-typescript/declarations/react-typescript.d.ts" />

import React = require("react");
var ReactPerf = require("react/lib/ReactDefaultPerf");
global.React = React; // for Chrome devtool extension and React typescript extension
global.ReactPerf = ReactPerf;

import Router = require("./router");

if (typeof window !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
            .test(navigator.userAgent)) {

    // Tell React to send us touch events.
    React.initializeTouchEvents(true);

    // Some touch devices require "cursor: pointer" for events to be sent
    require("./landing/touch.less");
}

React.renderComponent(
    Router.Component(null, null),
    document.body
);
