/**
 * @jsx React.DOM
 */

var React = require("react");

var RenderableMixin = require("./_renderable.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");
var Victoria = require("../renderer/victoria/hellogl.jsx");

var VRect = Victoria.VRect;

var Rect = React.createClass({
    renderSVG: function() {
        return <rect
            className={this.props.className}
            x={this.props.x + "em"}
            y={this.props.y + "em"}
            stroke={this.props.stroke}
            fill={this.props.fill}
            height={this.props.height + "em"}
            width={this.props.width + "em"} />;
    },
    renderGL: function() {
        var fill = this.props.stroke;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return <VRect
            fill={fill}
            x1={this.props.x}
            x2={this.props.x + this.props.width}
            y1={this.props.y}
            y2={this.props.y + this.props.height} />;
    },
    mixins: [RenderableMixin]
});

module.exports = Rect;
