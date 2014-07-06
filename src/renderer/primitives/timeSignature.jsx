/**
 * Renders a simple, compount, or common time signature.
 * 
 * @jsx React.DOM
 */

var React = require('react');

var Glyph = require("./glyph.jsx");
var Group = require("./group.jsx");
var SMuFL = require("./SMuFL.js");

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
        if (this.props.commonRepresentation) {
            var beats = this.props.beats;
            var beatType = this.props.beatType;

            if (beats === 4 && beatType === 4) {
                return <Glyph
                    x={this.props.x}
                    y={this.props.y}
                    fill={this.props.stroke}
                    fontSize={this.props.fontSize}
                    glyphName="timeSigCommon" />;
            } else if (beats === 2 && beatType === 2) {
                return <Glyph
                    x={this.props.x}
                    y={this.props.y}
                    fill={this.props.stroke}
                    fontSize={this.props.fontSize}
                    glyphName="timeSigCutCommon" />;
            }
            console.warn("Cannot be represented with a common time signature!");
        }
        return <Group>
            {[<TimeSignatureNumber
                    key="num"
                    stroke={this.props.stroke}
                    fontSize={this.props.fontSize}
                    x={this.props.x + this.numOffset()}
                    y={this.props.y - 1/4}>
                {this.props.beats}
            </TimeSignatureNumber>,
            <TimeSignatureNumber
                    key="den"
                    stroke={this.props.stroke}
                    fontSize={this.props.fontSize}
                    x={this.props.x + this.denOffset()}
                    y={this.props.y + 1/4}>
                {this.props.beatType}
            </TimeSignatureNumber>]}
        </Group>;
    },

    numOffset: function() {
        // crazy hack. fix.
        if (this.props.beats < 10 && this.props.beatType >= 10) {
            return 1/8;
        }
        return 0;
    },
    denOffset: function() {
        // crazy hack. fix.
        if (this.props.beatType < 10 && this.props.beats >= 10) {
            return 1/8;
        }
        return 0;
    }
});

function TimeSignatureNumber(props, children) {
    return (children + "").split("").map((c, i) => <Glyph
        key={"ts-" + i}
        x={props.x + i/4}
        y={props.y}
        fill={props.stroke}
        fontSize={props.fontSize}
        glyphName={"timeSig" + c} />);
}

module.exports = TimeSignature;
