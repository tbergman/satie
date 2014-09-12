/**
 * Renders a slur
 */

import ReactTS = require("react-typescript");

var Bezier = require("./_bezier.jsx");
import Note = require("./_note");
import SlurGroupModel = require("../stores/slur");
var getFontOffset = require("./_getFontOffset.jsx");
import hash = require("../../node_modules/ripienoUtil/hash");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

var getExtremeLine = Note.getExtremeLine;

export class Slur extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        this.hash = this.getHash(this.props.spec);

        var x2 = this.getX2();
        var x1 = this.getX1();
        var y2 = this.getY2(0);
        var y1 = this.getY1(0);
        var dir = this.getDirection();

        var x2mx1 = x2 - x1;
        var x1mx2 = -x2mx1;
        var relw = 0.08;
        var y1my2 = y1 - y2;
        var absw = -dir*0.2080307/Math.max(1, (Math.abs(y1my2)));
        if ((y1my2 > 0 ? -1 : 1)*dir === 1) {
            absw *= 2;
        }

        return Bezier({
            x1: x2,
            y1: y2,

            x2: 0.28278198 / 1.23897534 * x1mx2 + x2,
            y2: ((dir === -1 ? y1my2 : 0) + absw) + y2,

            x3: 0.9561935 / 1.23897534 * x1mx2 + x2,
            y3: ((dir === -1 ? y1my2 : 0) + absw) + y2,

            x4: x1,
            y4: y1,

            x5: 0.28278198 / 1.23897534 * x2mx1 + x1,
            y5: ((dir === -1 ? 0 : -y1my2) + absw + relw) + y1,

            x6: 0.95619358 / 1.23897534 * x2mx1 + x1,
            y6: ((dir === -1 ? 0 : -y1my2) + absw + relw) + y1,

            fontSizeFactor: this.props.fontSize * renderUtil.FONT_SIZE_FACTOR,
            fill: "#000000",
            strokeWidth: 0.03,
            stroke: "#000000"
        });
    }

    shouldComponentUpdate(nextProps: IProps) {
        return this.getHash(nextProps.spec) !== this.hash;
    }
    getHash(spec: SlurGroupModel) {
        return hash(
            ("" + spec.lines1) +
            ("" + spec.lines2) +
            ("" + spec.width) +
            ("" + spec.direction) +
            ("" + spec.x) +
            ("" + spec.y));
    }

    getYOffset() {
        if (this.getDirection() === -1) {
            return -0.25;
        }
        return 0.25;
    }
    getDirection() {
        return this.props.spec.direction;
    }
    getFontOffset = getFontOffset;
    getX1() {
        return this.props.spec.x;
    }
    getX2() {
        return this.props.spec.x + this.props.spec.width;
    }
    getY1(idx: number) {
        return this.props.spec.y -
            this.getYOffset() -
            (getExtremeLine(this.props.spec.lines1, -this.getDirection()) - 3)/4;
    }
    getY2(idx: number) {
        return this.props.spec.y -
            this.getYOffset() -
            (getExtremeLine(this.props.spec.lines2, -this.getDirection()) - 3)/4;
    }
    hash: number = NaN;
}

export var Component = ReactTS.createReactComponent(Slur);

export interface IProps {
    key: number;
    spec: SlurGroupModel;
    fontSize: number;
}

export interface IState {

}
