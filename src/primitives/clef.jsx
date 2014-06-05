/**
 * @jsx React.DOM
 */

var React = require('react');

var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");

var Clef = React.createClass({
    propTypes: {
        clef: React.PropTypes.oneOf([
            "treble",
            "alto",
            "tenor",
            "bass",
            "soprano",
            "mezzosoprano",
            "baritone",
            "french"
        ]),
        line: React.PropTypes.number,
        sign: React.PropTypes.string,
        x: React.PropTypes.number,
        y: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0
        };
    },

    render: function() {
        return <Glyph
            x={this.props.x}
            y={this.props.y - (this.getLine() - 3)/4}
            fill={this.props.stroke}
            glyphName={this.getSign() + "Clef"} />;
    },

    clefToLine: {
        "treble": 2,
        "alto": 3,
        "tenor": 4,
        "bass": 4,
        "soprano": 1,
        "mezzosoprano": 2,
        "baritone": 5,
        "french": 1
    },
    clefToSign: {
        "treble": "g",
        "french": "g",
        "alto": "c",
        "tenor": "c",
        "bass": "f",
        "soprano": "c",
        "mezzosoprano": "c",
        "baritone": "c"
    },
    getSign: function() {
        if (this.props.clef) {
            return this.clefToSign[this.props.clef];
        } else {
            return this.props.sign;
        }
    },
    getLine: function() {
        if (this.props.clef) {
            return this.clefToLine[this.props.clef];
        } else {
            return this.props.line;
        }
    }
});

module.exports = Clef;
