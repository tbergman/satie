/**
 * Responsible for the rendering of a full-sized clef.
 */

import ReactTS = require("react-typescript");

import ClefModel = require("../stores/clef");
import Glyph = require("./_glyph");

export class Clef extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var spec = this.props.spec;
        return Glyph.Component({
            x: spec.x - (spec.isChange ? 0.2 : 0),
            y: spec.y - (this.line - 3)/4,
            fill: spec.color,
            fontSize: this.props.fontSize,
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
    key: number;
    spec: ClefModel;
    fontSize: number;
}

export interface IState {

}