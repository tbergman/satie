/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");
import assert = require("assert");

import Beam = require("./_beam");
import BeamGroupModel = require("../stores/beamGroup");
import C = require("../stores/contracts");
import Duration = require("./duration");
import Group = require("./_group");
import Note = require("./_note");

/**
 * React component which draws notes and a beam given a collection
 * of notes that can be beamed.
 */
class BeamGroup extends TypedReact.Component<BeamGroup.IProps, {}> {
    render() {
        var spec = this.props.spec;

        // props of first and last notes.
        // The slope is usually decided based on the first and last notes.
        var heightDeterminingCount: number = 0;

        var Xs: Array<number> = [];
        var Ys: Array<number> = [];
        var lines : Array<Array<number>> = [];

        _.each(spec.beam, (note, idx) => {
            heightDeterminingCount = Math.max(heightDeterminingCount, note.count || 1);

            Xs.push(note.x);
            Ys.push(note.y);
            lines.push(note.lines);
        });

        var heightFromCount = Math.max(0, (Math.log(heightDeterminingCount) / Math.log(2)) - 2) * 20;

        var direction = BeamGroupModel.decideDirection(lines[0] || [3], lines[lines.length - 1]);

        var line1 = getExtremeLine(lines[0] || 3, direction);
        var line2 = getExtremeLine(lines[lines.length - 1] || 3, direction);

        // y = m*x + b
        var m = spec.beam.length ? 10*(line2 - line1)/(spec.beam.length - 1) : 0;
        var stemHeight1 = 35;
        var stemHeight2 = 35;

        // Limit the slope to the range (-0.5, 0.5)
        if (m > 5) {
            stemHeight2 = stemHeight2 - direction*(m - 20)*(spec.beam.length - 1);
            m = 5;
        }
        if (m < -5) {
            stemHeight2 = stemHeight2 - direction*(m + 20)*(spec.beam.length - 1);
            m = -5;
        }

        var dynamicM = m / (Xs[Xs.length - 1] - Xs[0]);

        var b = line1*10 + stemHeight1 + heightFromCount;

        function getSH(direction: number, idx: number, line: number) {
            return (b * direction +
                (direction === 1 ? 0 : 69) + dynamicM * (Xs[idx] - Xs[0]) * direction) - direction * line * 10;
        }

        // When the slope causes near-collisions, eliminate the slope.
        _.each(spec.beam, (note, idx) => {
            // Using -direction means that we'll be finding the closest note to the
            // beam. This will help us avoid collisions.
            var sh = getSH(direction, idx, getExtremeLine(note.lines, -direction));
            if (sh < 30) {
                b += direction*(30 - sh);
                m = 0;
            }

            assert(note.strokes);
            var stroke = note.strokes[0];

            if (strokeColor !== stroke && strokeColor) {
                strokeEnabled = false;
            }

            if (!strokeColor) {
                strokeColor = stroke;
            }
        });

        var strokeColor: string;
        var strokeEnabled = true;

        var durationProps: Array<Duration.IProps> = [];
        _.each(spec.beam, (note, idx) => {
            durationProps.push({
                direction: direction,
            	stemHeight: getSH(direction, idx, getExtremeLine(lines[idx], direction)),
                key: null,
                spec: undefined
            });
        });

        var children = spec.generate(durationProps);

        return <!Group.Component>
            <!Beam.Component
                beams={(spec.beams) || 1}
                variableBeams={spec.variableBeams}
                variableX={spec.variableBeams ? Xs : null}
                direction={direction}
                key={"beam"}
                line1={parseFloat("" + line1) +
                    direction * getSH(direction, 0, line1)/10}
                line2={parseFloat("" + line2) +
                    direction * getSH(direction, spec.beam.length - 1, line2)/10}
                stemWidth={1.4}
                stroke={strokeEnabled && strokeColor}
                tuplet={spec.tuplet}
                tupletsTemporary={spec.tupletsTemporary}
                width={Xs[Xs.length - 1] - Xs[0]}
                x={Xs[0] /* should assert all in order */}
                y={Ys[0]/* should assert all are equal */} />
            {children}
        </Group.Component>;
    }
};

/**
 * The line of a chord furthest from the end of a stem.
 */
var getExtremeLine = Note.getExtremeLine;

module BeamGroup {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, BeamGroup);

    export interface IProps {
        key: number;
        spec: BeamGroupModel;
    }
}

export = BeamGroup;