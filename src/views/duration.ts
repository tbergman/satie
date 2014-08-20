/**
 * This is a pseudo-component to maintain compatibility with
 * GroupBridgeView. At some point, GroupBridgeView should be
 * rewritten so we can enjoy the full performance benefits
 * of components here.
 *
 * @jsx React.DOM
 */

import assert = require("assert");

import DurationModel = require("../stores/duration");
import Note = require("./_note");
var Rest = require("./_rest.jsx");

export function Component(props: IProps) {
    "use strict";
    var spec = props.spec;
    assert(spec instanceof DurationModel);

    // TODO(jnetterf): Accents. i.e.,
    // var markings = _.map(spec.accents || [], (m, idx) =>
    //     NoteMarking({fontSize: spec.fontSize(), marking: m, key: idx})
    // );

    if (spec.isRest) {
        return Rest({
                dotted: spec.dots,
                line: 3,
                key: spec.key(),
                fontSize: spec.fontSize,
                notehead: spec.getRestHead(),
                stroke: spec.color,
                x: spec.x(),
                y: spec.y()},
            null
        );
    }

    return Note.Component({
            accStrokes: spec.getAccStrokes(),
            accidentals: spec.accidentals,
            dotted: spec.dots,
            direction: spec.getDirection(),
            flag: spec.flag,
            hasStem: spec.hasStem(),
            key: spec.key(),
            line: spec.line,
            notehead: spec.notehead(),
            fontSize: spec.fontSize,
            secondaryStroke: spec.color,
            strokes: spec.getStrokes(),
            tieTo: spec.tieTo && spec.tieTo.x(),
            x: spec.x(),
            y: spec.y()},
        null
    );
}

export interface IProps {
    key: string;
    spec: DurationModel;
}