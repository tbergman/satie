/**
 * Responsible for the rendering of a full-sized clef.
 *
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("lodash");

var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");

var clefToLine = {
    "treble": 2,
    "gClef15mb": 2, 
    "gClef8vb": 2, 
    "gClef8va": 2, 
    "gClef15ma": 2, 
    "gClef8vbOld": 2, 
    "gClef8vbCClef": 2, 
    "gClef8vbParens": 2, 
    "gClefArrowUp": 2, 
    "gClefArrowDown": 2, 

    "alto": 3,
    "tenor": 4,
    "cClef8vb": 3, 
    "cClefArrowUp": 3, 
    "cClefArrowDown": 3, 
    "cClefSquare": 3, 
    "cClefCombining": 3, 

    "bass": 4,
    "fClef15mb": 4, 
    "fClef8vb": 4, 
    "fClef8va": 4, 
    "fClef15ma": 4, 
    "fClefArrowUp": 4, 
    "fClefArrowDown": 4, 

    "unpitchedPercussionClef1": 3, 
    "unpitchedPercussionClef2": 3, 
    "semipitchedPercussionClef1": 3, 
    "semipitchedPercussionClef2": 3, 

    "6stringTabClef": 3, 
    "4stringTabClef": 3, 
    "cClefTriangular": 3, 
    "fClefTriangular": 3, 
    "cClefTriangularToFClef": 3, 
    "fClefTriangularToCClef": 3, 
    "gClefReversed": 2, 
    "gClefTurned": 2, 
    "cClefReversed": 3, 
    "fClefReversed": 4, 
    "fClefTurned": 4, 
    "bridgeClef": 3, 
    "accdnDiatonicClef":3,

    "soprano": 1,
    "mezzosoprano": 2,
    "baritone": 5,
    "french": 1
};


var Clef = React.createClass({
    propTypes: {
        clef: React.PropTypes.oneOf(_.keys(clefToLine)),
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
            x={this.props.x - (this.props.isChange ? 0.2 : 0)}
            y={this.props.y - (this.getLine() - 3)/4}
            fill={this.props.stroke}
            fontSize={this.props.fontSize}
            glyphName={this.getSign() + (this.props.isChange ? "Change" : "")} />;
    },

    clefToLine: clefToLine,
    clefToSign: {
        "treble": "gClef",
        "french": "gClef",
        "alto": "cClef",
        "tenor": "cClef",
        "bass": "fClef",
        "soprano": "cClef",
        "mezzosoprano": "cClef",
        "baritone": "cClef"
    },
    getSign: function() {
        if (this.props.clef) {
            return this.clefToSign[this.props.clef] || this.props.clef;
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
