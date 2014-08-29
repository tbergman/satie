/**
 * @jsx React.DOM
 */

var React = require("react");

var Victoria = require("../renderer/victoria/hellogl.jsx");
var renderUtil = require("ripienoUtil/renderUtil");

var VG = Victoria.VG;

function Group(a, b, c, d, e, f) {
    if (renderUtil.useGL) {
        return VG(a, b, c, d, e, f);
    } else {
        return React.DOM.g(a, b, c, d, e, f);
    }
}

module.exports = Group;
