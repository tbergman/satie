/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Accidental = require("./accidental.jsx");
var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

var NoteStem = React.createClass({
    propTypes: {
        height: React.PropTypes.number.isRequired,
        direction: React.PropTypes.oneOf([1, -1]).isRequired,
        line: React.PropTypes.number.isRequired,
        width: React.PropTypes.number.isRequired,
        notehead: React.PropTypes.string.isRequired
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            height: 3.5
        };
    },

    render: function() {
        return <line
            x1={this.props.x + this.getFontOffset()[0]/4 + this.getLineXOffset() + "em"}
            x2={this.props.x + this.getFontOffset()[0]/4 + this.getLineXOffset() + "em"}
            y1={this.props.y - this.getFontOffset()[1]/4 - (this.props.line - 3)/4 + "em"}
            y2={this.props.y -
                this.getFontOffset()[1]/4 -
                (this.props.line - 3)/4 -
                this.getDirection()*this.getHeight()/4 + "em"}
            stroke="black"
            strokeWidth={this.props.width + "em"} />;
    },

    getHeight: function() {
        return this.props.height;
    },
    getDirection: function() {
        return this.props.direction;
    },
    getFontOffset: getFontOffset,
    getLineXOffset: function() {
        return this.getDirection() * -this.props.width/2;
    }
});

module.exports = NoteStem;
