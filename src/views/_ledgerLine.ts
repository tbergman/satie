/**
 * Renders a ledger line at (x, y + line).
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React            = require("react");
import TypedReact       = require("typed-react");
var    PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import C                = require("../stores/contracts");
import Line             = require("./_line");

class LedgerLine extends TypedReact.Component<LedgerLine.IProps, {}> {
    render() {
        var west = C.SMuFL.bravuraBBoxes[this.props.notehead][3];
        var east = C.SMuFL.bravuraBBoxes[this.props.notehead][0];
        var xOffset = (east - west)*10;
        return <!Line.Component
            x1                          = {this.props.x - 3.2}
            x2                          = {this.props.x + xOffset - 0.2}
            y1                          = {this.props.y - (this.props.line - 3)*10}
            y2                          = {this.props.y - (this.props.line - 3)*10}
            victoriaXStrokeWidthFactor  = {0}
            stroke                      = {"#000000"}
            strokeWidth                 = {2.2} />
            // Ledger lines should be thicker than regular lines.
    }
}

module LedgerLine {
    "use strict";
    export var Component = TypedReact.createClass(LedgerLine, [PureRenderMixin]);

    export interface IProps {
        line:       number;
        notehead:   string;
        x:          number;
        y:          number;
    }
}

export = LedgerLine;
