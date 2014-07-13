/**
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Glyph = require("../primitives/glyph.jsx");
var Note = require("../primitives/note.jsx");
var SlurGroupModel = require("../stores/models/slur.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");
var getFontOffset = require("../primitives/getFontOffset.jsx");
var hash = require("ripienoUtil/hash.jsx");
var renderUtil = require("ripienoUtil/renderUtil.jsx");

var getExtremeLine = Note.getExtremeLine;

var Slur = React.createClass({
    shouldComponentUpdate: function(nextProps) {
        if (this.getHash(nextProps.spec) !== this.hash) {
            return true;
        }
    },
    getHash: function(spec) {
        var statics = ["line1", "width", "line2", "direction", "empty", "fontSize"];
        var dynamics = ["y", "x"];
        return hash(
            _.reduce(statics, (memo, field) => memo + JSON.stringify(spec[field]), "") +
            _.reduce(dynamics, (memo, field) => memo + JSON.stringify(spec[field]()), ""));
    },
    render: function() {
        this.hash = this.getHash(this.props.spec);
        if (this.props.spec.empty) {
            return <g />;
        }

        var x2mx1 = this.getX2() - this.getX1();
        var x1mx2 = -x2mx1;
        var relw = 0.08;
        var y1my2 = this.getY1(0,0) - this.getY2(0,0);
        var absw = -this.getDirection()*0.2080307/Math.max(1, (Math.abs(y1my2)));
        if ((y1my2 > 0 ? -1 : 1)*this.getDirection() === 1) {
            absw *= 2;
        }
        return <svg
                x={0}
                y={0}
                width={this.props.spec.fontSize*renderUtil.FONT_SIZE_FACTOR}
                height={this.props.spec.fontSize*renderUtil.FONT_SIZE_FACTOR}
                viewBox="0 0 1 1"
                className="overflow">
            <path
                d={
                    "M" +
                        this.getX2() + "," + this.getY2(0, 0) +
                    "c" +
                        (0.28278198/1.23897534*x1mx2) + "," +
                            ((this.getDirection() === -1 ? y1my2 : 0) + absw) + " " +
                        (0.9561935/1.23897534*x1mx2)  + "," +
                            ((this.getDirection() === -1 ? y1my2 : 0) + absw) + " " +
                        (1.23897534/1.23897534*x1mx2) + "," + (y1my2) +
                    "c " +
                        (0.28278198/1.23897534*x2mx1) + "," +
                            ((this.getDirection() === -1 ? 0 :-y1my2) + absw + relw) + " " +
                        (0.95619358/1.23897534*x2mx1) + "," +
                            ((this.getDirection() === -1 ? 0 :-y1my2) + absw + relw) + " " +
                        (1.23897534/1.23897534*x2mx1) + "," + (-y1my2)
                    }
                fill={"black"}
                strokeWidth={0.03}
                stroke={"black"} />
        </svg>;
    },

    getYOffset: function() {
        if (this.getDirection() === -1) {
            return -0.25;
        }
        return 0.25;
    },
    getDirection: function() {
        return this.props.spec.direction;
    },
    getFontOffset: getFontOffset,
    getX1: function() {
        return this.props.spec.x();
    },
    getX2: function() {
        return this.props.spec.x() + this.props.spec.width;
    },
    getY1: function(incl, idx) {
        return this.props.spec.y() -
            this.getYOffset() -
            (getExtremeLine(this.props.spec.line1, -this.getDirection()) - 3)/4;
    },
    getY2: function(incl, idx) {
        return this.props.spec.y() -
            this.getYOffset() -
            (getExtremeLine(this.props.spec.line2, -this.getDirection()) - 3)/4;
    }
});

module.exports = Slur;
