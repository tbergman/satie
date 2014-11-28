/**
 * Renders a ledger line at (x, y + line).
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");

import Line = require("./_line");
import SMuFL = require("../util/SMuFL");

class LedgerLine extends TypedReact.Component<LedgerLine.IProps, {}> {
    render() {
        var sw = SMuFL.bravuraBBoxes[this.props.notehead].bBoxSW;
        var ne = SMuFL.bravuraBBoxes[this.props.notehead].bBoxNE;
        var xOffset = (ne[0] - sw[0])*10;
        return <!Line.Component
            x1={this.props.x - 3.2}
            x2={this.props.x + xOffset + 3.2}
            y1={this.props.y - (this.props.line - 3)*10}
            y2={this.props.y - (this.props.line - 3)*10}
            victoriaXStrokeWidthFactor={0}
            stroke={"#000000"}
            strokeWidth={2.2} />
            // Ledger lines should be thicker than regular lines.
    }

    shouldComponentUpdate(nextProps: LedgerLine.IProps) {
        return this.props.line !== nextProps.x ||
            this.props.x !== nextProps.x ||
            this.props.line !== nextProps.line ||
            this.props.notehead !== nextProps.notehead;
    }
}

module LedgerLine {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, LedgerLine);

    export interface IProps {
        line: number;
        notehead: string;
        x: number;
        y: number;
    }
}

export = LedgerLine;