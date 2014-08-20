/**
 * @jsx React.DOM
 */

var React = require("react");

var Victoria = require("../renderer/victoria/hellogl.jsx");
var renderUtil = require("ripienoUtil/renderUtil");

var VG = Victoria.VG;

function Group(a, b, c) {
    if (renderUtil.useGL) {
        return VG(a, b, c);
    } else {
        return React.DOM.g(a, b, c);
    }
}

module.exports = Group;
