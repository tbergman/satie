/**
 * React component which draws notes and a beam given a collection
 * of notes that can be beamed.
 *
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");
var assert = require("assert");

var Beam = require("./beam.jsx");
var Glyph = require("./glyph.jsx");
var Group = require("./group.jsx");
var Note = require("./note.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

// The line of a chord futhest from the end of a stem.
var getExtremeLine = Note.getExtremeLine;

var BeamGroup = React.createClass({
    render: function() { 
        var props = this.props;
        var children = props.generate();

        // props of first and last notes.
        // The slope is usually decided based on the first and last notes.
        var firstP, lastP;

        children.forEach((note, idx) => {
            // All notes in a beam have a unique key
            note.props.key = props.key + idx;

            firstP = firstP || note.props;
            lastP = note.props;
        });

        var direction = decideDirection(firstP.line, lastP.line);

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
        children.forEach((note, idx) => {
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

        children.forEach((note, idx) => {
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
                beams={(props && props.beams) || 1}
                direction={direction}
                key={props.key}
                fontSize={this.props.fontSize}
                line1={line1 + direction*getSH(direction, 0, line1)}
                line2={line2 + direction*getSH(direction, children.length - 1, line2)}
                notehead1={firstP.notehead}
                notehead2={lastP.notehead}
                scaleFactor={props.scaleFactor}
                stemWidth={0.035} 
                stroke={strokeEnabled && strokeColor}
                tuplet={this.props.tuplet}
                tupletsTemporary={this.props.tupletsTemporary}
                width={lastP.x - firstP.x}
                x={firstP.x /* should assert all in order */}
                y={firstP.y /* should assert all are equal */} />].concat(
            children)}
        </Group>;
    }
});

var decideDirection = function(firstLine, lastLine) {
    if (firstLine.length) {
        firstLine = _(firstLine).reduce((m, s) => m + s, 0)/firstLine.length;
    }
    if (lastLine.length) {
        lastLine = _(lastLine).reduce((m, s) => m + s, 0)/lastLine.length;
    }
    var avgLine = (firstLine + lastLine)/2;
    if (avgLine >= 3) {
        return -1;
    }

    return 1;
};

module.exports = BeamGroup;
module.exports.decideDirection = decideDirection;
