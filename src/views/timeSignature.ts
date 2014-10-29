/**
 * Renders a simple, compound, or common time signature.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");

import Glyph = require("./_glyph");
import Group = require("./_group");
import TimeSignatureModel = require("../stores/timeSignature");

class TimeSignature extends TypedReact.Component<TimeSignature.IProps, {}> {
    render() {
        var spec = this.props.spec;
        var ts = spec.displayTimeSignature;

        if (ts.commonRepresentation) {
            var beats = ts.beats;
            var beatType = ts.beatType;

            if (beats === 4 && beatType === 4) {
                return Glyph.Component({
                    x: spec.x,
                    y: spec.y,
                    fill: spec.color,
                    fontSize: this.props.fontSize,
                    glyphName: "timeSigCommon"});
            } else if (beats === 2 && beatType === 2) {
                return Glyph.Component({
                    x: spec.x,
                    y: spec.y,
                    fill: spec.color,
                    fontSize: this.props.fontSize,
                    glyphName: "timeSigCutCommon"});
            }
            // Cannot be represented in common representation. Pass through.
        }
        return Group(null,
            TimeSignatureNumber({
                    key: -5,
                    stroke: spec.color,
                    fontSize: this.props.fontSize,
                    x: spec.x + this.numOffset(),
                    y: spec.y - 1/4},
                ts.beats
            ),
            TimeSignatureNumber({
                    key: -6,
                    stroke: spec.color,
                    fontSize: this.props.fontSize,
                    x: spec.x + this.denOffset(),
                    y: spec.y + 1/4},
                ts.beatType
            )
        );
    }

    numOffset() {
        // XXX: crazy hack. fix.
        var ts = this.props.spec.displayTimeSignature;
        if (ts.beats < 10 && ts.beatType >= 10) {
            return 1/8;
        }
        return 0;
    }
    denOffset() {
        // crazy hack. fix.
        var ts = this.props.spec.displayTimeSignature;
        if (ts.beatType < 10 && ts.beats >= 10) {
            return 1/8;
        }
        return 0;
    }
};

function TimeSignatureNumber(props: TimeSignature.ITSProps, children: number) {
    "use strict";
    return _.map((children + "").split(""), (c, i) => Glyph.Component({
        key: "ts-" + i,
        x: props.x + i/4,
        y: props.y,
        fill: props.stroke,
        fontSize: props.fontSize,
        glyphName: "timeSig" + c}));
}

module TimeSignature {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, TimeSignature);

    export interface IProps {
        key: number;
        spec: TimeSignatureModel;
        fontSize: number;
    }

    export interface ITSProps {
        key: number;
        x: number;
        y: number;
        stroke: string;
        fontSize: number;
    }
}

export = TimeSignature;