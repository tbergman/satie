/**
 * The browser entrypoint.
 */

var React = require('react');
var Router = require("./router.jsx");

global.React = React; // for Chrome devtool extension

if (typeof window !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
            .test(navigator.userAgent)) {

    // Tell React to send us touch events.
    React.initializeTouchEvents(true);

    // Some touch devices require "cursor: pointer" for events to be sent
    require("./landing/touch.less");
}

React.renderComponent(
    <Router />,
    document.body
);
