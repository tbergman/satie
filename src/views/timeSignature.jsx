/**
 * Renders a simple, compount, or common time signature.
 * 
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Glyph = require("./_glyph.jsx");
var Group = require("./_group.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");

var TimeSignature = React.createClass({
    proptypes: {
        beats: React.PropTypes.number.isRequired,
        beatType: React.PropTypes.number.isRequired,
        x: React.PropTypes.number,
        y: React.PropTypes.number,
        commonRepresentation: React.PropTypes.bool
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            commonRepresentation: false
        };
    },

    render: function() {
        var spec = this.props.spec;
        var ts = spec.timeSignature;

        if (ts.commonRepresentation) {
            var beats = ts.beats;
            var beatType = ts.beatType;

            if (beats === 4 && beatType === 4) {
                return <Glyph
                    x={spec.x()}
                    y={spec.y()}
                    fill={spec.color}
                    fontSize={spec.fontSize()}
                    glyphName="timeSigCommon" />;
            } else if (beats === 2 && beatType === 2) {
                return <Glyph
                    x={spec.x()}
                    y={spec.y()}
                    fill={spec.color}
                    fontSize={spec.fontSize()}
                    glyphName="timeSigCutCommon" />;
            }
            console.warn("Cannot be represented with a common time signature!");
        }
        return <Group>
            {[<TimeSignatureNumber
                    key="num"
                    stroke={spec.color}
                    fontSize={spec.fontSize()}
                    x={spec.x() + this.numOffset()}
                    y={spec.y() - 1/4}>
                {ts.beats}
            </TimeSignatureNumber>,
            <TimeSignatureNumber
                    key="den"
                    stroke={spec.color}
                    fontSize={spec.fontSize()}
                    x={spec.x() + this.denOffset()}
                    y={spec.y() + 1/4}>
                {ts.beatType}
            </TimeSignatureNumber>]}
        </Group>;
    },

    numOffset: function() {
        // XXX: crazy hack. fix.
        var ts = this.props.spec.timeSignature; 
        if (ts.beats < 10 && ts.beatType >= 10) {
            return 1/8;
        }
        return 0;
    },
    denOffset: function() {
        // crazy hack. fix.
        var ts = this.props.spec.timeSignature; 
        if (ts.beatType < 10 && ts.beats >= 10) {
            return 1/8;
        }
        return 0;
    }
});

function TimeSignatureNumber(props, children) {
    return _.map((children + "").split(""), (c, i) => <Glyph
        key={"ts-" + i}
        x={props.x + i/4}
        y={props.y}
        fill={props.stroke}
        fontSize={props.fontSize}
        glyphName={"timeSig" + c} />);
}

module.exports = TimeSignature;
