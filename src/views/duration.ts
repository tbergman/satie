/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import _ = require("lodash");
import assert = require("assert");

import DurationModel = require("../stores/duration");
import Note = require("./_note");
import NoteNotation = require("./_noteNotation");
import Rest = require("./_rest");
import renderUtil = require("../util/renderUtil");

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

    var notations = _.map(spec.displayNotation || [], (m, idx) =>
        NoteNotation.Component({
            idx: 1,
            direction: props.direction,
            fontSize: props.fontSize,
            notation: m,
            key: idx,
            line: 3,
            notehead: props.spec.notehead,
            x: NaN, // assigned later
            y: NaN  // assigned later
        })
    );

    /**
     * Mode to reduce unneeded renders.
     */
    var zeroOffsetMode = !renderUtil.useGL && !spec.isRest && !spec.tie;

    if (spec.isRest) {
        return Rest.Component({
                children: [],
                dotted: spec.displayDots,
                line: [3],
                key: spec.key,
                isNote: true, // In this context, we mean not a wrapper.
                fontSize: props.fontSize,
                notehead: spec.restHead,
                spacing: spec.spacing,
                stroke: spec.color,
                x: spec.x,
                y: spec.y},
            notations
        );
    }

    assert(spec.count);

    var note = Note.Component({
            accidentals: spec.displayedAccidentals,
            accStrokes: spec.accStrokes,
            direction: spec.direction,
            dotted: spec.displayDots,
            heightDeterminingCount: spec.count,
            flag: spec.flag,
            fontSize: props.fontSize,
            hasStem: spec.hasStem,
            isNote: true,
            key: spec.key,
            line: spec.lines,
            notehead: spec.notehead,
            secondaryStroke: spec.color,
            strokes: spec.strokes,
            tieTo: spec.tieTo && spec.tieTo.x,
            x: zeroOffsetMode ? 0 : spec.x,
            y: zeroOffsetMode ? 0 : spec.y},
        notations);

    if (zeroOffsetMode) {
        return html.g({
                key: <any> spec.key, // numeric keys are okay
                x: spec.x, // for beam
                y: spec.y, // for beam
                transform: "translate(" + props.fontSize * renderUtil.FONT_SIZE_FACTOR * spec.x +
                "," + props.fontSize * renderUtil.FONT_SIZE_FACTOR * spec.y + ")"},
            note);
    } else {
        return note;
    }
}

export interface IProps {
    key: number;
    spec: DurationModel;
    fontSize: number;
    direction: number;
}