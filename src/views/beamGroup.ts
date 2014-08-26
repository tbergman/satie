/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import ReactTS = require("react-typescript");
import _ = require("lodash");
import assert = require("assert");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

import Beam = require("./_beam");
import BeamGroupModel = require("../stores/beamGroup");
var Group = require("./_group.jsx");
import Note = require("./_note");

/**
 * React component which draws notes and a beam given a collection
 * of notes that can be beamed.
 */
export class BeamGroup extends ReactTS.ReactComponentBase<IProps, {}> {
    render() {
        var spec = this.props.spec;
        var children = spec.generate();

        // props of first and last notes.
        // The slope is usually decided based on the first and last notes.
        var firstP: any;
        var lastP: any;

        var Xs: Array<number> = [];
        var Ys: Array<number> = [];

        _.each(children, (note, idx) => {
            // All notes in a beam have a unique key
            note.props.key = "child-" + idx;

            firstP = firstP || (note.props.isNote ? note.props : note.props.children.props);
                // YUCK: add refs or something.

            lastP = note.props.isNote ? note.props : note.props.children.props;
                // YUCK: add refs or something.

            Xs.push(note.props.x);
            Ys.push(note.props.y);
        });

        var direction = BeamGroupModel.decideDirection(firstP.line, lastP.line);

        var line1 = getExtremeLine(firstP.line, direction);
        var line2 = getExtremeLine(lastP.line, direction);

        // y = m*x + b
        var m = children.length ? (line2 - line1)/(children.length - 1) : 0;
        var stemHeight1 = 3.5;
        var stemHeight2 = 3.5;

        // Limit the slope to the range (-0.5, 0.5)
        if (m > 0.5) {
            stemHeight2 = stemHeight2 - direction*(m - 0.5)*(children.length - 1);
            m = 0.5;
        }
        if (m < -0.5) {
            stemHeight2 = stemHeight2 - direction*(m + 0.5)*(children.length - 1);
            m = -0.5;
        }

        var b = line1 + stemHeight1;

        function getSH(direction: number, idx: number, line: number) {
            return (b * direction +
                (direction === 1 ? 0 : 6.9) + m * idx * direction) - direction * line;
        }

        // When the slope causes near-collisions, eliminate the slope.
        _.each(children, (note, idx) => {
            // Using -direction means that we'll be finding the closest note to the
            // beam. This will help us avoid collisions.
            var sh = getSH(direction, idx, getExtremeLine(
                (note.props.isNote ? note.props : note.props.children.props).line, -direction)); // YUCK
            if (sh < 3) {
                b += direction*(3 - sh);
                m = 0;
            }
        });

        var strokeColor: string;
        var strokeEnabled = true;

        _.each(children, (note, idx) => {
            var props = (note.props.isNote ? note.props : note.props.children.props); // YUCK
            props.direction = direction;
            props.stemHeight = getSH(direction, idx,
                getExtremeLine(props.line, direction));

            assert(props.strokes || props.stroke);
            var stroke = props.stroke || props.strokes[0];

            if (strokeColor !== stroke && strokeColor) {
                strokeEnabled = false;
            }

            if (!strokeColor) {
                strokeColor = stroke;
            }
        });

        return Group(null,
            [<React.ReactComponent<any,any>> Beam.Component({
                beams: (spec.beams) || 1,
                variableBeams: spec.variableBeams,
                variableX: spec.variableBeams ? Xs : null,
                direction: direction,
                key: "beam",
                fontSize: spec.fontSize,
                line1: parseFloat("" + line1) +
                    direction * getSH(direction, 0, line1),
                line2: parseFloat("" + line2) +
                    direction * getSH(direction, children.length - 1, line2),
                notehead1: firstP.notehead,
                notehead2: lastP.notehead,
                scaleFactor: spec.fontSize*renderUtil.FONT_SIZE_FACTOR,
                stemWidth: 0.035,
                stroke: strokeEnabled && strokeColor,
                tuplet: spec.tuplet,
                tupletsTemporary: spec.tupletsTemporary,
                width: Xs[Xs.length - 1] - Xs[0],
                x: Xs[0], /* should assert all in order */
                y: Ys[0]/* should assert all are equal */})].concat(
            children)
        );
    }
};

export var Component = ReactTS.createReactComponent(BeamGroup);

export interface IProps {
    key: string;
    spec: BeamGroupModel;
}

/**
 * The line of a chord furthest from the end of a stem.
 */
var getExtremeLine = Note.getExtremeLine;
