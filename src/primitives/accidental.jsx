/**
 * @jsx React.DOM
 */

var React = require('react');

var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");

var Accidental = React.createClass({
    propTypes: {
        accidental: function(props, propName) {
            if (SMuFL.glyphClasses.accidentals.indexOf(props[propName]) === -1) {
                console.warn(props[propName], " is not a valid accidental.");
            }
        }
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3
        };
    },

    render: function() {
        return <Glyph
            x={this.props.x}
            y={this.props.y - (this.props.line - 3)/4}
            fill={this.props.stroke}
            glyphName={this.props.accidental} />;
    }
});

module.exports = Accidental;
