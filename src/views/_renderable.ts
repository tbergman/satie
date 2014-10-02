/**
 * @jsx React.DOM
 */

import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

var RenderableMixin = {
    render: function() {
        if (renderUtil.useGL) {
            return this.renderGL();
        } else {
            return this.renderSVG();
        }
    }
};

export = RenderableMixin;
