/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/* tslint:disable */

import TypedReact = require("typed-react");
import React = require("react");
import _ = require("lodash");
import assert = require("assert");

import C = require("../stores/contracts");
import DurationModel = require("../stores/duration");
import Note = require("./_note");
import NoteNotation = require("./_noteNotation");
import Rest = require("./_rest");

/**
 * This is a pseudo-component to maintain compatibility with
 * GroupBridgeView. At some point, GroupBridgeView should be
 * rewritten so we can enjoy the full performance benefits
 * of components here.
 */
class Duration extends TypedReact.Component<Duration.IProps, {}> {
    render(): React.ReactElement<any, any> {
        var props = this.props;
        var spec = props.spec;
        assert(spec instanceof DurationModel);

        var notations = _.map(spec.displayNotation || [], (m, idx) =>
            <!NoteNotation.Component
                idx={1}
                direction={props.direction}
                notation={m}
                key={idx}
                line={3}
                notehead={props.spec.notehead}
                x={NaN /*assigned later :( */}
                y={NaN /*assigned later :( */} />);

        /**
         * Mode to reduce unneeded renders.
         */
        var zeroOffsetMode = !C.renderUtil.useGL && !spec.isRest && !spec.tie;

        if (spec.isRest) {
            return <!Rest.Component
                    children={[]}
                    dotted={spec.displayDots}
                    line={[3]}
                    key={spec.key}
                    isNote={true /* In this context, we mean not a wrapper. */}
                    notehead={spec.restHead}
                    spacing={spec.spacing}
                    stroke={spec.color}
                    x={spec.x}
                    y={spec.y}>
                {notations}
            </Rest.Component>;
        }

        assert(spec.count);

        var note = <!Note.Component
                    accidentals={spec.displayedAccidentals}
                    accStrokes={spec.accStrokes}
                    direction={this.props.direction || spec.direction}
                    dotted={spec.displayDots}
                    heightDeterminingCount={spec.count}
                    flag={spec.flag}
                    hasStem={spec.hasStem}
                    isNote={true}
                    key={spec.key}
                    line={spec.lines}
                    notehead={spec.notehead}
                    secondaryStroke={spec.color}
                    stemHeight={this.props.stemHeight}
                    strokes={spec.strokes}
                    tieTo={spec.tieTo && spec.tieTo.x}
                    x={zeroOffsetMode ? 0 : spec.x}
                    y={zeroOffsetMode ? 0 : spec.y}>
                {notations}
            </Note.Component>

        if (zeroOffsetMode) {
            return <!g
                    key={<any> spec.key /* numeric keys are okay */}
                    x={spec.x /* for beam */}
                    y={spec.y /* for beam */}
                    transform={"translate(" + spec.x + "," + spec.y + ")"}>
                {note}
            </g>
        } else {
            return note;
        }
    }
}

module Duration {
    export var Component = TypedReact.createClass(React.createClass, Duration);
    export interface IProps {
        key: number;
        spec: DurationModel;
        direction: number;
        stemHeight: number;
    }
}

export = Duration;