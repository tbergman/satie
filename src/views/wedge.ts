/**
 * @file Renders a crescendo or diminuendo.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, November 2014
 */

/* tslint:disable */

import TypedReact       = require("typed-react");
import React            = require("react");

import C                = require("../stores/contracts");
import WedgeModel       = require("../stores/wedge");
import Line             = require("./_line");

class Wedge extends TypedReact.Component<Wedge.IProps, {}> {
    render() {
        var spec = this.props.spec;
        var strokeWidth = 0.04;
        var isCrec = spec.wedgeType === C.MusicXML.WedgeType.Crescendo;

        if (spec.wedgeType === C.MusicXML.WedgeType.Stop) {
            return null;
        }

        var yOut = [
            spec.y - strokeWidth / 2 + 1.2 - 0.15,
            spec.y - strokeWidth / 2 + 1.2 + 0.15
        ];

        var yIn = [
            spec.y - strokeWidth / 2 + 1.2,
            spec.y - strokeWidth / 2 + 1.2,
        ];

        return <!g>
            <!Line.Component
                x1={spec.x}
                x2={spec.x + 0.8}
                y1={(isCrec ? yIn : yOut)[0]}
                y2={(isCrec ? yOut : yIn)[0]}
                stroke="#000000"
                strokeWidth={0.04} />
            <!Line.Component
                x1={spec.x}
                x2={spec.x + 0.8}
                y1={(isCrec ? yIn : yOut)[1]}
                y2={(isCrec ? yOut : yIn)[1]}
                stroke="#000000"
                strokeWidth={0.04} />
        </g>;
    }

    _hash: number;
    shouldComponentUpdate(nextProps: {}, nextState: {}) {
        var oldHash         = this._hash;
        this._hash          = C.JSONx.hash(nextProps);

        return oldHash !== this._hash;
    }
}

module Wedge {
    "use strict";
    export var Component = TypedReact.createClass(Wedge);
    export interface IProps {
        key: number;
        spec: WedgeModel;
    }
}

export = Wedge;
