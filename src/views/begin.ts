/**
 * Appears at the very begining of a stave.
 *
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");

import BeginModel = require("../stores/begin");
var Brace = require("./_brace.jsx");
var Group = require("./_group.jsx");
var StaveLines = require("./_staveLines.jsx");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

export class BeginView extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var spec = this.props.spec;

        return Group(null,
            spec.pianoStaff && Brace({
                x: renderUtil.mm(spec.noMargin ? 15 : 30, spec.fontSize),
                fontSize: spec.fontSize,
                y: spec.braceY,
                y2: spec.getBraceY2()}),
            StaveLines({
                key: "StaveLines",
                width: renderUtil.mm(spec.pageSize.width -
                        (spec.noMargin ? 30 : 45), spec.fontSize),
                x: renderUtil.mm(spec.noMargin ? 15 : 30, spec.fontSize),
                y: spec.braceY})
        );
    }
};

export var Component = ReactTS.createReactComponent(BeginView);

export interface IProps {
    key: string;
    spec: BeginModel;
}

export interface IState {

}
