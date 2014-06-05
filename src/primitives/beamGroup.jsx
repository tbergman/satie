/**
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");

var Beam = require("./beam.jsx");
var Glyph = require("./glyph.jsx");
var Note = require("./note.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

var getExtremeLine = Note.getExtremeLine;

var BeamGroup = React.createClass({
    render: function() { 
        var props = this.props;
        var children = props.generate();

        var firstP, lastP;
        children.forEach((note, idx) => {
            note.props.direction = 1;
            note.props.key = props.key + idx;

            firstP = firstP || note.props;
            lastP = note.props;
        });

        var direction = decideDirection(firstP.line, lastP.line);

        var line1 = getExtremeLine(firstP.line, direction);
        var line2 = getExtremeLine(lastP.line, direction);

        var m = children.length ? (line2 - line1)/(children.length - 1) : 0;
        var stemHeight1 = 3.5;
        var stemHeight2 = 3.5;
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

        children.forEach((note, idx) => {
            // Using -direction means that we'll be finding the closest note to the
            // beam. This will help us avoid collisions.
            var sh = getSH(direction, idx, getExtremeLine(note.props.line, -direction));
            if (sh < 3) {
                b += direction*(3 - sh);
                m = 0;
            }
        });

        children.forEach((note, idx) => {
            note.props.direction = direction;
            note.props.stemHeight = getSH(direction, idx, getExtremeLine(note.props.line, direction));
        });

        return <g>
            <Beam
                beams={(props && props.beams) || 1}
                direction={direction}
                key={props.key}
                line1={line1 + direction*getSH(direction, 0, line1)}
                line2={line2 + direction*getSH(direction, children.length - 1, line2)}
                notehead1={firstP.notehead}
                notehead2={lastP.notehead}
                scaleFactor={props.scaleFactor}
                stemWidth={0.035} 
                tuplet={this.props.tuplet}
                width={lastP.x - firstP.x}
                x={firstP.x /* should assert all in order */}
                y={firstP.y /* should assert all are equal */} />
            {children}
        </g>;
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
