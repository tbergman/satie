/**
 * Renders a key signature. Not responsible for calculating the width.
 *
 * @jsx React.DOM
 */

var React = require("react");

var Accidental = require("./_accidental.jsx");
var Glyph = require("./_glyph.jsx");
var Group = require("./_group.jsx");
var KeySignatureModel = require("../stores/keySignature.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");

var _ = require("lodash");

var KeySignature = React.createClass({
    propTypes: {
        spec: React.PropTypes.instanceOf(KeySignatureModel)
    },

    render: function() {
        var spec = this.props.spec;

        return <Group>
            {_.map(this.getAccidentals(), (a, idx) => <Accidental
                key={idx /* for React */}
                x={spec.x() + idx/4}
                y={spec.y()}
                line={a.line}
                stroke={spec.color}
                fontSize={spec.fontSize()}
                accidental={a.accidental} />)}
        </Group>;
    },

    getAccidentals: function() {
        var spec = this.props.spec;
        if (!isNaN(spec.getSharpCount())) {
            return _.times(spec.getSharpCount(), i => Object({
                line: sharps[standardClef(spec.clef)][i],
                accidental: "accidentalSharp"
            }));
        } else if (!isNaN(spec.getFlatCount())) {
            return _.times(spec.getFlatCount(), i => Object({
                line: flats[standardClef(spec.clef)][i],
                accidental: "accidentalFlat"
            }));
        }
    }
});

var standardClef = clef => {
    if (clef.indexOf("gClef") === 0 || clef.indexOf("treble") !== -1) {
        return "treble";
    }
    if (clef.indexOf("cClef") === 0 || clef.indexOf("bass") !== -1) {
        return "bass";
    }
    if (clef.indexOf("fClef") === 0 || clef.indexOf("alto") !== -1) {
        return "alto";
    }
    if (clef.indexOf("tenor") !== -1) {
        return "tenor";
    }
    console.warn("Invalid clef?");
    return "treble";
};

// TODO: this almost looks like logic -- move to keySignature.jsx
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
