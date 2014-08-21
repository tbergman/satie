/**
 * This is a pseudo-component to maintain compatibility with
 * GroupBridgeView. At some point, GroupBridgeView should be
 * rewritten so we can enjoy the full performance benefits
 * of components here.
 */

import React = require("react");
import assert = require("assert");

import DurationModel = require("../stores/duration");
import Note = require("./_note");
var Rest = require("./_rest.jsx");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

var html = React.DOM;

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

    return html.g({
        key: spec.key(),
        x: spec.x(), // for beam
        y: spec.y(), // for beam
        transform: "translate(" + spec.fontSize * renderUtil.FONT_SIZE_FACTOR * spec.x() +
            "," + spec.fontSize * renderUtil.FONT_SIZE_FACTOR * spec.y() + ")"
    },
    Note.Component({
        accStrokes: spec.getAccStrokes(),
        accidentals: spec.accidentals,
        dotted: spec.dots,
        direction: spec.getDirection(),
        flag: spec.flag,
        hasStem: spec.hasStem(),
        line: spec.line,
        notehead: spec.notehead(),
        fontSize: spec.fontSize,
        secondaryStroke: spec.color,
        strokes: spec.getStrokes(),
        tieTo: spec.tieTo && spec.tieTo.x(),
        x: 0,
        y: 0},
    null
    ));
}

export interface IProps {
    key: string;
    spec: DurationModel;
}