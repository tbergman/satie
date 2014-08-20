/**
 * Renders a simple, compount, or common time signature.
 */

import ReactTS = require("react-typescript");
import _ = require("lodash");

var Glyph = require("./_glyph.jsx");
var Group = require("./_group.jsx");
import TimeSignatureModel = require("../stores/timeSignature");

export class TimeSignature extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var spec = this.props.spec;
        var ts = spec.timeSignature;

        if (ts.commonRepresentation) {
            var beats = ts.beats;
            var beatType = ts.beatType;

            if (beats === 4 && beatType === 4) {
                return Glyph({
                    x: spec.x(),
                    y: spec.y(),
                    fill: spec.color,
                    fontSize: spec.fontSize,
                    glyphName: "timeSigCommon"});
            } else if (beats === 2 && beatType === 2) {
                return Glyph({
                    x: spec.x(),
                    y: spec.y(),
                    fill: spec.color,
                    fontSize: spec.fontSize,
                    glyphName: "timeSigCutCommon"});
            }
            console.warn("Cannot be represented with a common time signature!");
        }
        return Group(null,
            [TimeSignatureNumber({
                    key: "num",
                    stroke: spec.color,
                    fontSize: spec.fontSize,
                    x: spec.x() + this.numOffset(),
                    y: spec.y() - 1/4},
                ts.beats
            ),
            TimeSignatureNumber({
                    key: "den",
                    stroke: spec.color,
                    fontSize: spec.fontSize,
                    x: spec.x() + this.denOffset(),
                    y: spec.y() + 1/4},
                ts.beatType
            )]
        );
    }

    numOffset() {
        // XXX: crazy hack. fix.
        var ts = this.props.spec.timeSignature;
        if (ts.beats < 10 && ts.beatType >= 10) {
            return 1/8;
        }
        return 0;
    }
    denOffset() {
        // crazy hack. fix.
        var ts = this.props.spec.timeSignature;
        if (ts.beatType < 10 && ts.beats >= 10) {
            return 1/8;
        }
        return 0;
    }
};
export var Component = ReactTS.createReactComponent(TimeSignature);

export interface IProps {
    key: string;
    spec: TimeSignatureModel;
}

export interface IState {

}

function TimeSignatureNumber(props: ITSProps, children: number) {
    "use strict";
    return _.map((children + "").split(""), (c, i) => Glyph({
        key: "ts-" + i,
        x: props.x + i/4,
        y: props.y,
        fill: props.stroke,
        fontSize: props.fontSize,
        glyphName: "timeSig" + c}));
}

export interface ITSProps {
    key: string;
    x: number;
    y: number;
    stroke: string;
    fontSize: number;
}

