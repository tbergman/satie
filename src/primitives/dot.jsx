/**
 * Responsible for the rendering of a dot as part of a dotted note.
 * This is not used to render staccatos.
 *
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

var Dot = React.createClass({
    propTypes: {
        radius: React.PropTypes.number,
        line: React.PropTypes.number,
        idx: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            radius: 0.06,
            idx: 0
        };
    },

    render: function() {
        return <circle
            cx={this.getCX() + "em"}
            cy={this.getCY() + "em"}
            fill={this.props.stroke}
            r={this.props.radius + "em"} />;
    },

    getCYOffset: function() {
        return ((this.props.line * 2) % 2) ? 0 : 0.5/4;
    },
    getCX: function() {
        return this.props.x + 0.45 + 0.15*(this.props.idx);
    },
    getCY: function() {
        return this.props.y - (this.props.line - 3)/4 - this.getCYOffset();
    }
});

module.exports = Dot;
