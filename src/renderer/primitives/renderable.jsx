/**
 * @jsx React.DOM
 */

var RenderableMixin = {
    render: function() {
        if (global.useGL) {
            return this.renderGL();
        } else {
            return this.renderSVG();
        }
    }
};

module.exports = RenderableMixin;
