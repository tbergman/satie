/**
 * Renders a key signature. Not responsible for calculating the width.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("../typedReact");
import _ = require("lodash");

import Accidental = require("./_accidental");
import Group = require("./_group");
import KeySignatureModel = require("../stores/keySignature");

class KeySignature extends TypedReact.Component<KeySignature.IProps, {}> {
    render() {
        var spec = this.props.spec;

        return Group(null,
            _.map(this.getAccidentals(), (a, idx) => Accidental.Component({
                key: idx, /* for React */
                x: spec.x + idx/4,
                y: spec.y,
                line: a.line,
                stroke: spec.color,
                fontSize: this.props.fontSize,
                accidental: a.accidental}))
        );
    }

    /**
     * Returns an array representing the position and glyphName of each accidental.
     */
    getAccidentals() {
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
};

function standardClef(clef: string) {
    "use strict";
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

// TODO: this almost looks like logic -- move to keySignature.ts
var sharps: { [key: string]: Array<number> } = {
    // "FCGDAEB"
    treble: [5, 3.5, 5.5, 4, 2.5, 4.5, 3],
    bass: [4, 2.5, 4.5, 3, 1.5, 3.5, 2],
    alto: [4.5, 3, 5, 3.5, 2, 4, 2.5],
    tenor: [2, 4, 2.5, 4.5, 3, 5, 3.5]
};

var flats: { [key: string]: Array<number> } = {
    // "BEADGCF"
    treble: [3, 4.5, 2.5, 4, 2, 3.5, 1.5],
    bass: [2, 3.5, 1.5, 3, 1, 2.5, 0.5],
    alto: [2.5, 4, 2, 3.5, 1.5, 3, 1],
    tenor: [3.5, 5, 3, 4.5, 2.5, 4, 2]
};

module KeySignature {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, KeySignature);

    export interface IProps {
        key: number;
        spec: KeySignatureModel;
        fontSize: number;
    }
}

export = KeySignature;