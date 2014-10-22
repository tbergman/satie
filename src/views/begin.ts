/**
 * Appears at the very beginning of a stave.
 */

import ReactTS = require("react-typescript");

import BeginModel = require("../stores/begin");
import Brace = require("./_brace");
import Group = require("./_group");
import StaveLines = require("./_staveLines");

class BeginView extends ReactTS.ReactComponentBase<BeginView.IProps, {}> {
    render() {
        var spec = this.props.spec;

        return Group(null,
            spec.pianoStaff && Brace.Component({
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
    export var Component = ReactTS.createReactComponent(BeginView);

    export interface IProps {
        key: number;
        spec: BeginModel;
        fontSize: number;
    }
}

export = BeginView;