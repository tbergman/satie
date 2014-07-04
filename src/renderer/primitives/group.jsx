/**
 * @jsx React.DOM
 */

var React = require('react');

var Victoria = require("./victoria/hellogl.jsx");

var VG = Victoria.VG;

function Group(a, b, c) {
    if (global.useGL) {
        return VG(a, b, c);
    } else {
        return React.DOM.g(a, b, c);
    }
}

module.exports = Group;
