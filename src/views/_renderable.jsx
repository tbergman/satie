/**
 * @jsx React.DOM
 */

var renderUtil = require("ripienoUtil/renderUtil");

var RenderableMixin = {
    render: function() {
        if (renderUtil.useGL) {
            return this.renderGL();
        } else {
            return this.renderSVG();
        }
    }
};

module.exports = RenderableMixin;
