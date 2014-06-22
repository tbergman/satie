/**
 * @jsx React.DOM
 */

var React = require('react');

var RenderableMixin = require("./renderable.jsx");
var SMuFL = require("./SMuFL.js");
var Victoria = require("./victoria/hellogl.jsx");

var VRect = Victoria.VRect;

var Line = React.createClass({
    renderSVG: function() {
        return <line
            className={this.props.className}
            x1={this.props.x1 + "em"}
            x2={this.props.x2 + "em"}
            y1={this.props.y1 + "em"}
            y2={this.props.y2 + "em"}
            stroke={this.props.stroke}
            strokeWidth={this.props.strokeWidth + "em"} />;
    },
    renderGL: function() {
        var fill = this.props.stroke;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return <VRect
            fill={fill}
            x1={this.props.x1 - this.props.strokeWidth/2}
            x2={this.props.x2 + this.props.strokeWidth/2}
            y1={this.props.y1 - this.props.strokeWidth/2}
            y2={this.props.y2 + this.props.strokeWidth/2} />;
    },
    mixins: [RenderableMixin]
});

module.exports = Line;
