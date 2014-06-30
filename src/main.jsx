/**
 * The browser entrypoint.
 */

var React = require('react');
var Ripieno = require("./ripieno.jsx");

global.React = React; // for Chrome devtool extension

if (typeof window !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
            .test(navigator.userAgent)) {
    React.initializeTouchEvents(true);
    require("./landing/touch.less");
}

React.renderComponent(
    <Ripieno />,
    document.body
);
