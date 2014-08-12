/**
 * Responsible for the rendering a bezier curve, such as a
 * slur or a tie.
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Glyph = require("./_glyph.jsx");
var RenderableMixin = require("./_renderable.jsx");
var SMuFL = require("ripienoUtil/SMuFL.ts");
var Victoria = require("../renderer/victoria/hellogl.jsx");
var getFontOffset = require("./_getFontOffset.jsx");

var VBezier = Victoria.VBezier;

var Bezier = React.createClass({
    renderSVG: function() {
        var f = this.props.fontSizeFactor;
        return <path
            d={
                "M" +
                    f*this.props.x1 + "," + f*this.props.y1 +
                "C" +
                    f*this.props.x2 + "," + f*this.props.y2 + " " +
                    f*this.props.x3 + "," + f*this.props.y3 + " " +
                    f*this.props.x4 + "," + f*this.props.y4 + " " +
                "C" +
                    f*this.props.x5 + "," + f*this.props.y5 + " " +
                    f*this.props.x6 + "," + f*this.props.y6 + " " +
                    f*this.props.x1 + "," + f*this.props.y1}
            fill={this.props.fill}
            strokeWidth={f*this.props.strokeWidth}
            stroke={this.props.stroke} />;
    },

    renderGL: function() {
        var fill = this.props.stroke;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return this.transferPropsTo(<VBezier />);
    },
    mixins: [RenderableMixin]
});

module.exports = Bezier;
