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

    /**
     * Mode to reduce unneeded renders.
     */
    var zeroOffsetMode = !renderUtil.useGL && !spec.isRest && !spec.tie;

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

    var note = Note.Component({
            accidentals: spec.accidentals,
            accStrokes: spec.getAccStrokes(),
            direction: spec.getDirection(),
            dotted: spec.dots,
            flag: spec.flag,
            fontSize: spec.fontSize,
            hasStem: spec.hasStem(),
            isNote: true,
            key: spec.key(),
            line: spec.line,
            notehead: spec.notehead(),
            secondaryStroke: spec.color,
            strokes: spec.getStrokes(),
            tieTo: spec.tieTo && spec.tieTo.x(),
            x: zeroOffsetMode ? 0 : spec.x(),
            y: zeroOffsetMode ? 0 : spec.y()},
        null);

    if (zeroOffsetMode) {
        return html.g({
                key: spec.key(),
                x: spec.x(), // for beam
                y: spec.y(), // for beam
                transform: "translate(" + spec.fontSize * renderUtil.FONT_SIZE_FACTOR * spec.x() +
                "," + spec.fontSize * renderUtil.FONT_SIZE_FACTOR * spec.y() + ")"},
            note);
    } else {
        return note;
    }
}

export interface IProps {
    key: string;
    spec: DurationModel;
}