/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, December 2014
 */

/* tslint:disable */

import React                = require("react");
import TypedReact           = require("typed-react");
import _                    = require("lodash");
var    PureRenderMixin      = require("react/lib/ReactComponentWithPureRenderMixin");

import C                    = require("../stores/contracts");

class BarNumber extends TypedReact.Component<BarNumber.IProps, {}> {
    render(): any {
        return <!text x={this.props.x} y={this.props.y} fontSize={24} className="bn_">{this.props.barNumber}</text>;
    }
};

module BarNumber {
    "use strict";
    export var Component = TypedReact.createClass(BarNumber, [PureRenderMixin]);

    export interface IProps {
        barNumber: string;
        x: number;
        y: number;
    }
}

export = BarNumber;
