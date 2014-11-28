/**
 * Responsible for the rendering of a dot as part of a dotted note.
 * This is not used to render staccatos.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("typed-react");

import RenderableMixin = require("./_renderable");
var Victoria = require("../renderer/victoria/victoria");

var VCircle = Victoria.VCircle;

class Dot extends TypedReact.Component<Dot.IProps, {}> {
    renderSVG() {
        // See rationale for hidden rect in _glyph.jsx
        return React.DOM.g(null,
            React.DOM.circle({
                "data-selection-info": "dotted",
                cx: <any> (this.cx()),
                cy: <any> (this.cy()),
                fill: this.props.stroke,
                r: <any>(this.props.radius)}),
        global.isChoreServer ? null : React.DOM.rect({
                "data-selection-info": "dotted",
                width: 3,
                height: 3,
                x: <any> (this.cx() - 4),
                y: <any> (this.cy() - 4),
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
            cx: this.cx(),
            cy: this.cy(),
            radius: this.props.radius});
    }

    cyOffset() {
        return ((this.props.line * 2) % 2) ? 0 : 5;
    }

    cx() {
        return this.props.x + 18 + 6*(this.props.idx);
    }
    cy() {
        return this.props.y - (this.props.line - 3)*10 - this.cyOffset();
    }
}

Dot.prototype.render = RenderableMixin.prototype.render;

module Dot {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Dot);

    export interface IProps {
        x: number;
        y: number;
        radius: number;
        line: number;
        idx: number;
        stroke: string;
    }
}

export = Dot;