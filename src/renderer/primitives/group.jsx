/**
 * @jsx React.DOM
 */

var React = require('react');

var Victoria = require("./victoria/hellogl.jsx");

var VG = Victoria.VG;

function Group(a, b) {
    if (global.useGL) {
        return VG(a, b);
    } else {
        return React.DOM.g(a, b);
    }
}

module.exports = Group;
