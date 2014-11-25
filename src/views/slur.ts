/**
 * Renders a slur or tie
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
import assert = require("assert");

import Bezier = require("./_bezier");
import Note = require("./_note");
import SlurGroupModel = require("../stores/slur");
import getFontOffset = require("./_getFontOffset");
import hash = require("../util/hash");
import renderUtil = require("../util/renderUtil");

var getExtremeLine = Note.getExtremeLine;

class Slur extends TypedReact.Component<Slur.IProps, {}> {
    render() {
        this.hash = this.getHash(this.props.spec);

        var x2: number = this.getX2();
        var x1: number = this.getX1();
        var y2: number = this.getY2(0);
        var y1: number = this.getY1(0);
        var dir: number = this.direction();

        var x2mx1: number = x2 - x1;
        var x1mx2: number = -x2mx1;
        var relw: number = 0.08;
        var y1my2: number = y1 - y2;
        var absw: number = -dir*0.2080307/Math.max(1, (Math.abs(y1my2)));
        if ((y1my2 > 0 ? -1 : 1)*dir === 1) {
            absw *= 2;
        }

        assert(!isNaN(x2));
        assert(!isNaN(x1));
        assert(!isNaN(y2));
        assert(!isNaN(y1));
        assert(!isNaN(dir));
        assert(!isNaN(x2mx1));
        assert(!isNaN(x1mx2));
        assert(!isNaN(relw));
        assert(!isNaN(y1my2));
        assert(!isNaN(absw));

        return <!Bezier.Component
            x1={x2}
            y1={y2}

            x2={0.28278198 / 1.23897534 * x1mx2 + x2}
            y2={((dir === -1 ? y1my2 : 0) + absw) + y2}

            x3={0.9561935 / 1.23897534 * x1mx2 + x2}
            y3={((dir === -1 ? y1my2 : 0) + absw) + y2}

            x4={x1}
            y4={y1}

            x5={0.28278198 / 1.23897534 * x2mx1 + x1}
            y5={((dir === -1 ? 0 : -y1my2) + absw + relw) + y1}

            x6={0.95619358 / 1.23897534 * x2mx1 + x1}
            y6={((dir === -1 ? 0 : -y1my2) + absw + relw) + y1}

            fontSizeFactor={this.props.fontSize * renderUtil.FONT_SIZE_FACTOR}
            fill="#000000"
            strokeWidth={0.03}
            stroke="#000000" />
    }

    shouldComponentUpdate(nextProps: Slur.IProps) {
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
        if (this.direction() === -1) {
            return -0.25;
        }
        return 0.25;
    }
    direction() {
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
            (getExtremeLine(this.props.spec.lines1, -this.direction) - 3)/4;
    }
    getY2(idx: number) {
        return this.props.spec.y -
            this.getYOffset() -
            (getExtremeLine(this.props.spec.lines2, -this.direction) - 3)/4;
    }
    hash: number = NaN;
}

module Slur {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Slur);

    export interface IProps {
        key: number;
        spec: SlurGroupModel;
        fontSize: number;
    }
}

export = Slur;
