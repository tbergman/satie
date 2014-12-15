/**
 * Renders a key signature. Not responsible for calculating the width.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");

import Accidental = require("./_accidental");
import C = require("../stores/contracts");
import KeySignatureModel = require("../stores/keySignature");

class KeySignature extends TypedReact.Component<KeySignature.IProps, {}> {
    render() {
        var spec = this.props.spec;
        return <!g>
            {_.map(this.getAccidentals(), (a, idx) => <!Accidental.Component
                key={idx /* for React */}
                x={spec.x + idx*10}
                y={spec.y}
                line={a.line}
                stroke={spec.color}
                opacity={this.props.opacity}
                accidental={a.accidental} />)}
        </g>
    }

    /**
     * Returns an array representing the position and glyphName of each accidental.
     */
    getAccidentals(): {accidental: string; line: number}[] {
        var spec = this.props.spec;
        if (spec.fifths >= 0) {
            return _.times(spec.fifths, i => Object({
                line: sharps[standardClef(spec.clef)][i],
                accidental: "accidentalSharp"
            }));
        } else if (spec.fifths < 0) {
            return _.times(-spec.fifths, i => Object({
                line: flats[standardClef(spec.clef)][i],
                accidental: "accidentalFlat"
            }));
        }
    }

    _hash: number;
    shouldComponentUpdate(nextProps: {}, nextState: {}) {
        var oldHash = this._hash;
        this._hash = C.JSONx.hash(nextProps);
        return oldHash !== this._hash;
    }
};

function standardClef(clef: C.MusicXML.Clef) {
    "use strict";
    switch (true) {
        case (clef.sign === "G"):
            return "treble";
        case (clef.sign === "F"):
            return "bass";
        case (clef.sign === "C" && clef.line === 3):
            return "alto";
        case (clef.sign === "C" && clef.line === 4):
            return "tenor";
        default:
            console.warn("Invalid clef?");
            return "treble";
    }
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
    export var Component = TypedReact.createClass(KeySignature);

    export interface IProps {
        key: number;
        spec: KeySignatureModel;
        opacity?: number;
    }
}

export = KeySignature;
