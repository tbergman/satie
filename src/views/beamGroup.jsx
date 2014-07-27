/**
 * React component which draws notes and a beam given a collection
 * of notes that can be beamed.
 *
 * @jsx React.DOM
 */

var React = require("react");
var SMuFL = require("ripienoUtil/SMuFL.js");
var _ = require("lodash");
var assert = require("assert");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

var Beam = require("./_beam.jsx");
var BeamGroupModel = require("../stores/beamGroup.jsx");
var Glyph = require("./_glyph.jsx");
var Group = require("./_group.jsx");
var Note = require("./_note.jsx");
var getFontOffset = require("./_getFontOffset.jsx");

// The line of a chord futhest from the end of a stem.
var getExtremeLine = Note.getExtremeLine;

var BeamGroup = React.createClass({
    render: function() { 
        var spec = this.props.spec;
        var children = spec.generate();

        // props of first and last notes.
        // The slope is usually decided based on the first and last notes.
        var firstP, lastP;

        _.each(children, (note, idx) => {
            // All notes in a beam have a unique key
            note.props.key = "child-" + idx;

            firstP = firstP || note.props;
            lastP = note.props;
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

        var getSH = (direction, idx, line) => (b*direction +
                (direction === 1 ? 0 : 6.9) + m*idx*direction) - direction*line;

        // When the slope causes near-collisions, eliminate the slope.
        _.each(children, (note, idx) => {
            // Using -direction means that we'll be finding the closest note to the
            // beam. This will help us avoid collisions.
            var sh = getSH(direction, idx, getExtremeLine(note.props.line, -direction));
            if (sh < 3) {
                b += direction*(3 - sh);
                m = 0;
            }
        });

        var strokeColor;
        var strokeEnabled = true;

        _.each(children, (note, idx) => {
            note.props.direction = direction;
            note.props.stemHeight = getSH(direction, idx,
                getExtremeLine(note.props.line, direction));

            assert(note.props.strokes.length);

            if (strokeColor !== note.props.strokes[0] && strokeColor) {
                strokeEnabled = false;
            }

            if (!strokeColor) {
                strokeColor = note.props.strokes[0];
            }
        });

        return <Group>
            {[<Beam
                beams={(spec.beams) || 1}
                direction={direction}
                key={"beam"}
                fontSize={spec.fontSize()}
                line1={parseFloat(line1) + parseFloat(direction*getSH(direction, 0, line1))}
                line2={parseFloat(line2) + parseFloat(direction*getSH(direction, children.length - 1, line2))}
                notehead1={firstP.notehead}
                notehead2={lastP.notehead}
                scaleFactor={spec.fontSize()*renderUtil.FONT_SIZE_FACTOR}
                stemWidth={0.035} 
                stroke={strokeEnabled && strokeColor}
                tuplet={spec.tuplet}
                tupletsTemporary={spec.tupletsTemporary}
                width={lastP.x - firstP.x}
                x={firstP.x /* should assert all in order */}
                y={firstP.y /* should assert all are equal */} />].concat(
            children)}
        </Group>;
    }
});

module.exports = BeamGroup;
