/**
 * The browser entrypoint.
 */

var React = require('react');
var Ripieno = require("./ripieno.jsx");

global.React = React; // for Chrome devtool extension

React.renderComponent(
    <Ripieno />,
    document.body
);
