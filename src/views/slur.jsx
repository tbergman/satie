/**
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Bezier = require("../primitives/bezier.jsx");
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

        var x2 = this.getX2();
        var x1 = this.getX1();
        var y2 = this.getY2(0, 0);
        var y1 = this.getY1(0, 0);
        var dir = this.getDirection();

        var x2mx1 = x2 - x1;
        var x1mx2 = -x2mx1;
        var relw = 0.08;
        var y1my2 = y1 - y2;
        var absw = -dir*0.2080307/Math.max(1, (Math.abs(y1my2)));
        if ((y1my2 > 0 ? -1 : 1)*dir === 1) {
            absw *= 2;
        }

        return <Bezier
            x1={x2}
            y1={y2}

            x2={0.28278198/1.23897534*x1mx2 + x2}
            y2={((dir === -1 ? y1my2 : 0) + absw) + y2}

            x3={0.9561935/1.23897534*x1mx2 + x2}
            y3={((dir === -1 ? y1my2 : 0) + absw) + y2}

            x4={x1}
            y4={y1}

            x5={0.28278198/1.23897534*x2mx1 + x1}
            y5={((dir === -1 ? 0 :-y1my2) + absw + relw) + y1}

            x6={0.95619358/1.23897534*x2mx1 + x1}
            y6={((dir === -1 ? 0 :-y1my2) + absw + relw) + y1}
            
            fontSizeFactor={this.props.spec.fontSize*renderUtil.FONT_SIZE_FACTOR}
            fill={"#000000"}
            strokeWidth={0.03}
            stroke={"#000000"} />
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
