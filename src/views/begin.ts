/**
 * Appears at the very beginning of a stave.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");

import BeginModel = require("../stores/begin");
import Brace = require("./_brace");
import C = require("../stores/contracts");
import StaveLines = require("./_staveLines");

class BeginView extends TypedReact.Component<BeginView.IProps, {}> {
    render() {
        var spec = this.props.spec;

        return <!g>
            <!StaveLines.Component
                key="StaveLines"
                width={this.props.spec.width}
                x={spec.x}
                y={spec.braceY} />
        </g>

        // MXFIX
        // {spec.pianoSystemContinues && <!Brace.Component
        //     idx={1}
        //     x={spec.x}
        //     fontSize={this.props.fontSize}
        //     y={spec.braceY}
        //     y2={spec.braceY2} />}
    }

    _hash: number;
    shouldComponentUpdate(nextProps: {}, nextState: {}) {
        var oldHash = this._hash;
        this._hash = C.JSONx.hash(nextProps);
        return oldHash !== this._hash;
    }
};

module BeginView {
    "use strict";
    export var Component = TypedReact.createClass(BeginView);

    export interface IProps {
        key: number;
        spec: BeginModel;
    }
}

export = BeginView;
