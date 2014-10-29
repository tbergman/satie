/**
 * Appears at the very beginning of a stave.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("../typedReact");

import BeginModel = require("../stores/begin");
import Brace = require("./_brace");
import Group = require("./_group");
import StaveLines = require("./_staveLines");

class BeginView extends TypedReact.Component<BeginView.IProps, {}> {
    render() {
        var spec = this.props.spec;

        return Group(null,
            spec.pianoSystemContinues && Brace.Component({
                idx: 1,
                x: spec.x,
                fontSize: this.props.fontSize,
                y: spec.braceY,
                y2: spec.braceY2}),
            StaveLines.Component({
                key: "StaveLines",
                width: this.props.spec.width,
                x: spec.x,
                y: spec.braceY})
        );
    }
};

module BeginView {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, BeginView);

    export interface IProps {
        key: number;
        spec: BeginModel;
        fontSize: number;
    }
}

export = BeginView;