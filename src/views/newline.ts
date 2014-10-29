/**
 * Appears at the very beginning of a line, except the first line.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("../typedReact");

import NewlineModel = require("../stores/newline");
import Brace = require("./_brace");
import Group = require("./_group");
import StaveLines = require("./_staveLines");

class NewlineView extends TypedReact.Component<NewlineView.IProps, {}> {
    render() {
        var spec = this.props.spec;

        return Group(null,
            spec.pianoSystemContinues && Brace.Component({
                idx: 1,
                x: spec.begin,
                fontSize: this.props.fontSize,
                y: spec.braceY + spec.lineSpacing,
                y2: spec.braceY2 + spec.lineSpacing}),
            StaveLines.Component({
                key: "StaveLines",
                width: this.props.spec.width,
                x: spec.begin,
                y: spec.braceY + spec.lineSpacing})
        );
    }
};


module NewlineView {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, NewlineView);

    export interface IProps {
        key: number;
        spec: NewlineModel;
        fontSize: number;
    }
}

export = NewlineView;