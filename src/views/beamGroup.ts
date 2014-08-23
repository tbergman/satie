/**
 * React component which draws notes and a beam given a collection
 * of notes that can be beamed.
 */

import ReactTS = require("react-typescript");
import _ = require("lodash");
import assert = require("assert");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

var Beam = require("./_beam.jsx");
import BeamGroupModel = require("../stores/beamGroup");
var Group = require("./_group.jsx");
import Note = require("./_note");

// The line of a chord futhest from the end of a stem.
var getExtremeLine = Note.getExtremeLine;

export class BeamGroup extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var spec = this.props.spec;
        var children = spec.generate();

        // props of first and last notes.
        // The slope is usually decided based on the first and last notes.
        var firstP: any;
        var firstX: number;
        var firstY: number;

        var lastP: any;
        var lastX: number;
        var lastY: number;

        _.each(children, (note, idx) => {
            // All notes in a beam have a unique key
            note.props.key = "child-" + idx;

            firstP = firstP || (note.props.isNote ? note.props : note.props.children.props);
                // YUCK: add refs or something.
            firstX = firstX || note.props.x;
            firstY = firstY || note.props.y;

            lastP = note.props.isNote ? note.props : note.props.children.props;
                // YUCK: add refs or something.
            lastX = note.props.x;
            lastY = note.props.y;
        });

        var direction = BeamGroupModel.decideDirection(firstP.line, lastP.line);

        var line1 = getExtremeLine(firstP.line, direction);
        var line2 = getExtremeLine(lastP.line, direction);

        // y = mx + b
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
            [Beam({
                beams: (spec.beams) || 1,
                direction: direction,
                key: "beam",
                fontSize: spec.fontSize,
                line1: parseFloat("" + line1) + direction*getSH(direction, 0, line1),
                line2: parseFloat("" + line2) + direction*getSH(direction, children.length - 1, line2),
                notehead1: firstP.notehead,
                notehead2: lastP.notehead,
                scaleFactor: spec.fontSize*renderUtil.FONT_SIZE_FACTOR,
                stemWidth: 0.035,
                stroke: strokeEnabled && strokeColor,
                tuplet: spec.tuplet,
                tupletsTemporary: spec.tupletsTemporary,
                width: lastX - firstX,
                x: firstX, /* should assert all in order */
                y: firstY/* should assert all are equal */})].concat(
            children)
        );
    }
};

export var Component = ReactTS.createReactComponent(BeamGroup);

export interface IProps {
    key: string;
    spec: BeamGroupModel;
}

export interface IState {

}
