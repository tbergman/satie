/**
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");
var assert = require("assert");

var DurationModel = require("../stores/models/duration.jsx");
var Note = require("../primitives/note.jsx");
var NoteMarking = require("../primitives/noteMarking.jsx");
var Rest = require("../primitives/rest.jsx");

var DurationView = function(props) {
    // This is a pseudo-component to maintain compatibility with
    // GroupBridgeView. At some point, GroupBridgeView should be
    // rewritten so we can enjoy the full performance benefits
    // of components here.
    var spec = props.spec;
    assert(spec instanceof DurationModel);

    var markings = _.map(spec.accents || [], (m, idx) =>
        <NoteMarking fontSize={spec.fontSize()} marking={m} key={idx} />
    );

    if (spec.pitch === "r") {
        return <Rest
                dotted={spec.dots}
                line={3}
                key={spec.key()}
                fontSize={spec.fontSize}
                notehead={spec.getRestHead(countToRest)}
                stroke={spec.color}
                x={spec.x()}
                y={spec.y()}>
            {markings}
        </Rest>;
    }

    return <Note
            accStrokes={spec.getAccStrokes()}
            accidentals={spec.accidentals}
            dotted={spec.dots}
            direction={spec.getDirection()}
            flag={spec.flag}
            hasStem={spec.hasStem()}
            key={spec.key()}
            line={spec.line}
            notehead={spec.notehead()}
            fontSize={spec.fontSize()}
            secondaryStroke={spec.color}
            strokes={spec.getStrokes()}
            tieTo={spec.tieTo && spec.tieTo.x()}
            x={spec.x()}
            y={spec.y()}>
        {markings}
    </Note>;
}

module.exports = DurationView;
