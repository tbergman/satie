/**
 * Renders a ledger line at (x, y + line).
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Line = require("./_line.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");

var LedgerLine = React.createClass({
    propTypes: {
        x: React.PropTypes.number.isRequired,
        y: React.PropTypes.number.isRequired,
        line: React.PropTypes.number.isRequired,
        notehead: React.PropTypes.string.isRequired
    },

    shouldComponentUpdate: function(nextProps) {
        return this.props.line !== nextProps.x ||
            this.props.x !== nextProps.x ||
            this.props.line !== nextProps.line ||
            this.props.notehead !== nextProps.notehead;
    },

    render: function() {
        var sw = SMuFL.bravuraBBoxes[this.props.notehead].bBoxSW;
        var ne = SMuFL.bravuraBBoxes[this.props.notehead].bBoxNE;
        var xOffset = (ne[0] - sw[0])/4;
        return <Line
            x1={this.props.x - 0.08}
            x2={this.props.x + xOffset + 0.08}
            y1={this.props.y - (this.props.line - 3)/4}
            y2={this.props.y - (this.props.line - 3)/4}
            victoriaXStrokeWidthFactor={0}
            stroke="#000000"
            strokeWidth={0.055} />;
            // Ledger lines should be thicker than regular lines.
    }
});

module.exports = LedgerLine;
