/**
 * @jsx React.DOM
 */

var React = require("react");

var RenderableMixin = require("./_renderable.jsx");
var SMuFL = require("../../node_modules/ripienoUtil/SMuFL.ts");
var Victoria = require("../renderer/victoria/hellogl.jsx");

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

        var xFactor, yFactor;
        if (Math.abs(this.props.x2 - this.props.x1) <
                Math.abs(this.props.y2 - this.props.y1)) {
            xFactor = 1;
            yFactor = 0;
        } else {
            xFactor = 0;
            yFactor = 1;
        }

        return <VRect
            fill={fill}
            x1={this.props.x1 - xFactor*this.props.strokeWidth/2}
            x2={this.props.x2 + xFactor*this.props.strokeWidth/2}
            y1={this.props.y1 - yFactor*this.props.strokeWidth/2}
            y2={this.props.y2 + yFactor*this.props.strokeWidth/2} />;
    },
    mixins: [RenderableMixin]
});

module.exports = Line;
