/**
 * Responsible for the rendering of a dot as part of a dotted note.
 * This is not used to render staccatos.
 */

import React = require("react");
import ReactTS = require("react-typescript");

import RenderableMixin = require("./_renderable");
var Victoria = require("../renderer/victoria/victoria");

var VCircle = Victoria.VCircle;

export class Dot extends ReactTS.ReactComponentBase<IProps, {}> {
    renderSVG() {
        // See rationale for hidden rect in _glyph.jsx
        return React.DOM.g(null,
            React.DOM.circle({
                "data-selection-info": "dotted",
                cx: <any> (this.cx + "em"),
                cy: <any> (this.cy + "em"),
                fill: this.props.stroke,
                r: <any>(this.props.radius + "em")}),
        global.isChoreServer ? null : React.DOM.rect({
                "data-selection-info": "dotted",
                width: <any> "0.3em",
                height: <any> "0.3em",
                x: <any> (this.cx - 0.1 + "em"),
                y: <any> (this.cy - 0.1 + "em"),
                fill: "transparent",
                className: "mn_handle"})
        );
    }

    renderGL() {
        var fill = this.props.stroke;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return VCircle({
            fill: fill,
            cx: this.cx,
            cy: this.cy,
            radius: this.props.radius});
    }

    get cyOffset() {
        return ((this.props.line * 2) % 2) ? 0 : 0.5/4;
    }

    get cx() {
        return this.props.x + 0.45 + 0.15*(this.props.idx);
    }
    get cy() {
        return this.props.y - (this.props.line - 3)/4 - this.cyOffset;
    }
    render: () => void;
}

Dot.applyMixins(RenderableMixin);

export var Component = ReactTS.createReactComponent(Dot);

export interface IProps {
    x: number;
    y: number;
    radius: number;
    line: number;
    idx: number;
    stroke: string;
}

