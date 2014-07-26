/**
 * Renders a stem based on a height decided in Note.
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Accidental = require("./_accidental.jsx");
var Glyph = require("./_glyph.jsx");
var Line = require("./_line.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");
var getFontOffset = require("./_getFontOffset.jsx");

var stemThickness = SMuFL.bravuraMetadata.engravingDefaults.stemThickness/4;

var NoteStem = React.createClass({
    propTypes: {
        height: React.PropTypes.number.isRequired,
        direction: React.PropTypes.oneOf([1, -1]).isRequired,
        line: React.PropTypes.number.isRequired,
        notehead: React.PropTypes.string.isRequired
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            height: 3.5,
            stroke: "#000000"
        };
    },

    render: function() {
        return <Line
            x1={this.props.x + this.getFontOffset()[0]/4 + this.getLineXOffset()}
            x2={this.props.x + this.getFontOffset()[0]/4 + this.getLineXOffset()}
            y1={this.props.y - this.getFontOffset()[1]/4 - (this.props.line - 3)/4}
            y2={this.props.y -
                this.getFontOffset()[1]/4 -
                (this.props.line - 3)/4 -
                this.getDirection()*this.getHeight()/4}
            stroke={this.props.stroke}
            strokeWidth={stemThickness} />;
    },

    getHeight: function() {
        return this.props.height;
    },
    getDirection: function() {
        return this.props.direction;
    },
    getFontOffset: getFontOffset,
    getLineXOffset: function() {
        return this.getDirection() * -stemThickness/2;
    }
});

module.exports = NoteStem;
