/**
 * Responsible for the rendering of a full-sized clef.
 *
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");

import ClefModel = require("../stores/clef");
var Glyph = require("./_glyph.jsx");

export class Clef extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var spec = this.props.spec;
        return Glyph({
            x: spec.x() - (spec.isChange ? 0.2 : 0),
            y: spec.y() - (this.line - 3)/4,
            fill: spec.color,
            fontSize: spec.fontSize,
            glyphName: this.sign + (spec.isChange ? "Change" : "")});
    }

    get sign() {
        var clef = this.props.spec.clefName;
        return this.clefToSign[clef] || clef;
    }

    get line(): number {
        return ClefModel.clefToLine[this.props.spec.clefName];
    }

    clefToSign: { [key: string]: string } = {
        "treble": "gClef",
        "french": "gClef",
        "alto": "cClef",
        "tenor": "cClef",
        "bass": "fClef",
        "soprano": "cClef",
        "mezzosoprano": "cClef",
        "baritone": "cClef"
    };
};

export var Component = ReactTS.createReactComponent(Clef);

export interface IProps {
    key: string;
    spec: ClefModel;
}

export interface IState {

}