/**
 * Responsible for the rendering of a dot as part of a dotted note.
 * This is not used to render staccatos.
 *
 * @jsx React.DOM
 */

var React = require("react");
var _ = require("lodash");

var Glyph = require("./glyph.jsx");
var RenderableMixin = require("./renderable.jsx");
var SMuFL = require("ripienoUtil/SMuFL.js");
var Victoria = require("../renderer/victoria/hellogl.jsx");
var getFontOffset = require("./getFontOffset.jsx");

var VCircle = Victoria.VCircle;

var Dot = React.createClass({
    propTypes: {
        radius: React.PropTypes.number,
        line: React.PropTypes.number,
        idx: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            radius: 0.06,
            idx: 0
        };
    },

    renderSVG: function() {
        // See rationale for hidden rect in glyph.jsx
        return <g>
            <circle
                data-selectioninfo={"dotted"}
                cx={this.getCX() + "em"}
                cy={this.getCY() + "em"}
                fill={this.props.stroke}
                r={this.props.radius + "em"} />
            <rect
                data-selectioninfo={"dotted"}
                width={"0.3em"}
                height={"0.3em"}
                x={this.getCX() - 0.1 + "em"}
                y={this.getCY() - 0.1 + "em"}
                fill="transparent"
                className="mn_handle" />
        </g>;
    },

    renderGL: function() {
        var fill = this.props.stroke;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return <VCircle
            fill={fill}
            cx={this.getCX()}
            cy={this.getCY()}
            radius={this.props.radius} />;
    },

    getCYOffset: function() {
        return ((this.props.line * 2) % 2) ? 0 : 0.5/4;
    },
    getCX: function() {
        return this.props.x + 0.45 + 0.15*(this.props.idx);
    },
    getCY: function() {
        return this.props.y - (this.props.line - 3)/4 - this.getCYOffset();
    },
    mixins: [RenderableMixin]
});

module.exports = Dot;
