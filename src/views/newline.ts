/**
 * Appears at the very beginning of a line, except the first line.
 */

import ReactTS = require("react-typescript");

import NewlineModel = require("../stores/newline");
import Brace = require("./_brace");
import Group = require("./_group");
import StaveLines = require("./_staveLines");

class NewlineView extends ReactTS.ReactComponentBase<NewlineView.IProps, {}> {
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
    export var Component = ReactTS.createReactComponent(NewlineView);

    export interface IProps {
        key: number;
        spec: NewlineModel;
        fontSize: number;
    }
}

export = NewlineView;