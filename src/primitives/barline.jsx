/**
 * Renderes a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 *
 * @jsx React.DOM
 */

var Line = require("./line.jsx");
var React = require('react');
var SMuFL = require("./SMuFL.js");

var Barline = React.createClass({
    proptypes: {
        x: React.PropTypes.number,
        y: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0
        };
    },
    shouldComponentUpdate: function(nextProps) {
        return this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y ||
            this.props.stroke !== nextProps.stroke;
    },

    render: function() {
        return <Line
            x1={this.props.x}
            x2={this.props.x}
            y1={this.props.y - 2/4}
            y2={this.props.y + 2/4}
            stroke={this.props.stroke || "#2A2A2A"}
            fill={this.props.stroke || "#2A2A2A"}
            strokeWidth={SMuFL.bravuraMetadata.engravingDefaults.thinBarlineThickness/4} />;
    }
});

module.exports = Barline;
