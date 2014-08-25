/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import assert = require("assert");

import DurationModel = require("../stores/duration");
import Note = require("./_note");
var Rest = require("./_rest.jsx");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

var html = React.DOM;

/**
 * This is a pseudo-component to maintain compatibility with
 * GroupBridgeView. At some point, GroupBridgeView should be
 * rewritten so we can enjoy the full performance benefits
 * of components here.
 */
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
                dotted: spec.displayDots,
                line: 3,
                key: spec.key(),
                isNote: true, // In this context, we mean not a wrapper.
                fontSize: spec.fontSize,
                notehead: spec.restHead,
                stroke: spec.color,
                x: spec.x(),
                y: spec.y()},
            null
        );
    }

    var note = Note.Component({
            accidentals: spec.accidentals,
            accStrokes: spec.accStrokes,
            direction: spec.direction,
            dotted: spec.displayDots,
            flag: spec.flag,
            fontSize: spec.fontSize,
            hasStem: spec.hasStem,
            isNote: true,
            key: spec.key(),
            line: spec.line,
            notehead: spec.notehead,
            secondaryStroke: spec.color,
            strokes: spec.strokes,
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