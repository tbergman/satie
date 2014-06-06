/**
 * Renders a key signature. Not responsible for calculating the width.
 *
 * @jsx React.DOM
 */

var React = require('react');

var Accidental = require("./accidental.jsx");
var Glyph = require("./glyph.jsx");
var SMuFL = require("./SMuFL.js");

var _ = require("underscore");

var KeySignature = React.createClass({
    propTypes: {
        clef: React.PropTypes.string.isRequired,
        sharpCount: React.PropTypes.number,
        flatCount: React.PropTypes.number,
        accidentals: function(props, propName) {
            console.assert(props.sharpCount !== undefined ^
                props.flatCount !== undefined ^
                props[propName] !== undefined);
            console.assert(!(props.sharpCount !== undefined &&
                props.flatCount !== undefined &&
                props[propName] !== undefined));

            if (props[propName]) {
                console.assert(props[propsName] instanceof Array);
                _(props[propsName]).each(s => assert(s.line && s.accidental));
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
        return <g>
            {this.getAccidentals().map((a, idx) => <Accidental
                key={idx /* for React */}
                x={this.props.x + idx/4}
                y={this.props.y}
                line={a.line}
                stroke={this.props.stroke}
                accidental={a.accidental} />)}
        </g>;
    },

    getAccidentals: function() {
        if (!isNaN(this.props.sharpCount)) {
            return _(this.props.sharpCount).times(i => Object({
                line: sharps[this.props.clef][i],
                accidental: "accidentalSharp"
            }));
        } else if (!isNaN(this.props.flatCount)) {
            return _(this.props.flatCount).times(i => Object({
                line: flats[this.props.clef][i],
                accidental: "accidentalFlat"
            }));
        }
    }
});

// TODO: this almost looks like logic -- move to keySignatureBridge.jsx
var sharps = {
    //"FCGDAEB"
    treble: [5, 3.5, 5.5, 4, 2.5, 4.5, 3],
    bass: [4, 2.5, 4.5, 3, 1.5, 3.5, 2],
    alto: [4.5, 3, 5, 3.5, 2, 4, 2.5],
    tenor: [2, 4, 2.5, 4.5, 3, 5, 3.5],
};

var flats = {
    //"BEADGCF"
    treble: [3, 4.5, 2.5, 4, 2, 3.5, 1.5],
    bass: [2, 3.5, 1.5, 3, 1, 2.5, 0.5],
    alto: [2.5, 4, 2, 3.5, 1.5, 3, 1],
    tenor: [3.5, 5, 3, 4.5, 2.5, 4, 2]
};

module.exports = KeySignature;
