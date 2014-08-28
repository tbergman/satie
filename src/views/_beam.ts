/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import ReactTS = require("react-typescript");
import _ = require("lodash");

import C = require("../stores/contracts");
import SMuFL = require("../../node_modules/ripienoUtil/SMuFL");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");
var Glyph = require("./_glyph.jsx");
var Group = require("./_group.jsx");
var RenderableMixin = require("./_renderable.jsx");
var Victoria = require("../renderer/victoria/hellogl.jsx");
var getFontOffset: Function = require("./_getFontOffset.jsx");

/**
 * Calculates a way to render a beam given two endpoints.
 * See also BeamGroup and BeamGroupModel.
 */
export class Beam extends ReactTS.ReactComponentBase<IProps, {}> {
    renderSVG() {
        var f = this.props.fontSize * renderUtil.FONT_SIZE_FACTOR;
        if (this.props.beams === C.IBeamCount.VARIABLE) {
            return Group(null,
                _.map(this.props.variableBeams, (beams: number, idx: number): any => {
                    if (idx === 0) {
                        return null;
                    }
                    return _.times(beams, beam => {
                        var x2: number;
                        if (this.props.variableBeams[idx - 1] <= beam) {
                            if (this.props.variableX[idx + 1] &&
                                this.props.variableBeams[idx + 1] === beams) {
                                return null;
                            }
                            x2 = (this.props.variableX[idx - 1] + this.props.variableX[idx] * 3) / 4;
                        } else {
                            x2 = this.props.variableX[idx - 1];
                        }
                        return React.DOM.polygon({
                            key: idx + "_" + beam,
                            points: f * this._withXOffset(x2) + "," +
                            f * this._getY1(0, beam) + " " +
                            f * this._withXOffset(this.props.variableX[idx]) + "," +
                            f * this._getY2(0, beam) + " " +
                            f * this._withXOffset(this.props.variableX[idx]) + "," +
                            f * this._getY2(1, beam) + " " +
                            f * this._withXOffset(x2) + "," +
                            f * this._getY2(1, beam),
                            stroke: this.props.stroke,
                            fill: this.props.stroke,
                            strokeWidth: 0
                        });
                    });
                }),
                this._tuplet()
            );
        } else {
            return Group(null,
                _.times(this.props.beams, idx =>
                    React.DOM.polygon({
                        key: "" + idx,
                        points: f*this._getX1() + "," + f*this._getY1(0, idx) + " " +
                            f*this._getX2() + "," + f*this._getY2(0, idx) + " " +
                            f*this._getX2() + "," + f*this._getY2(1, idx) + " " +
                            f*this._getX1() + "," + f*this._getY1(1, idx),
                        stroke: this.props.stroke,
                        fill: this.props.stroke,
                        strokeWidth: 0})
                ),
                this._tuplet()
            );
        }
    }

    renderGL() {
        return Group(null,
            _.times(this.props.beams, idx => Victoria.VRect({
                key: idx,
                x1: this._getX1(), x2: this._getX2(),
                y1: this._getY1(0, idx), y2: this._getY1(1, idx),
                fill: this.props.stroke,
                skewx: 0, skewY: this._getY1(1, idx) - this._getY2(1, idx)})),
            this._tuplet()
        );
    }

    /**
     * Returns true if anything has changed. This is implemented because
     * beams are particularly slow to mount.
     */
    shouldComponentUpdate(nextProps : IProps) {
        var ret =
            this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y ||
            this.props.beams !== nextProps.beams ||
            this.props.direction !== nextProps.direction ||
            this.props.line1 !== nextProps.line1 ||
            this.props.line2 !== nextProps.line2 ||
            this.props.stroke !== nextProps.stroke ||
            this.props.tuplet !== nextProps.tuplet ||
            this.props.tupletsTemporary !== nextProps.tupletsTemporary ||
            this.props.width !== nextProps.width ||
            JSON.stringify(this.props.variableBeams) !==
                JSON.stringify(nextProps.variableBeams);
        return ret;
    }

    /**
     * Offset because the note-head has a non-zero width.
     */
    getLineXOffset() {
        return this.getDirection() * -this.props.stemWidth/2;
    }

    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    getDirection() {
        return this.props.direction;
    }

    getFontOffset = getFontOffset;

    private _withXOffset(x: number) {
        return x +
            this.getFontOffset(this.props.notehead1)[0]/4 +
            this.getLineXOffset();
    }

    private _getX1() {
        return this._withXOffset(this.props.x);
    }

    private _getX2() {
        return this._withXOffset(this.props.x + this.props.width);
    }

    private _getY1(incl: number, idx: number) {
        return this.props.y -
            this._getYOffset() -
            this.getDirection()*this.getFontOffset(this.props.notehead1)[1]/4 -
            (this.props.line1 - 3)/4 +
            this.getDirection()*idx*0.22 +
            (incl || 0)*(SMuFL.bravuraMetadata.engravingDefaults.beamThickness/4);
    }

    private _getY2(incl: number, idx: number) {
        return this.props.y -
            this._getYOffset() -
            this.getDirection()*this.getFontOffset(this.props.notehead2)[1]/4 -
            (this.props.line2 - 3)/4 +
            this.getDirection()*idx*0.22 +
            (incl || 0)*(SMuFL.bravuraMetadata.engravingDefaults.beamThickness/4);
    }

    /**
     * Offset because the note-head has a non-zero height.
     * The note-head is NOT CENTERED at its local origin.
     */
    private _getYOffset() {
        if (this.getDirection() === -1) {
            return 0.025;
        }
        return 0.005;
    }

    /**
     * Returns a React component instance showing the tuplet number
     */
    private _tuplet() {
        if (!this.props.tuplet) {
            return null;
        } else {
            var offset = this._getX2() - this._getX1();
            var y = (this._getY1(1, this.props.beams - 1) +
                        this._getY2(1, this.props.beams - 1))/2 -
                    (0.3 + 0.2*this.props.beams)*this.getDirection();

            // XXX: all tuplets are drawn as triplets.
            return Glyph({
                selectioninfo: "beamTuplet",
                fill: this.props.tupletsTemporary ? "#A5A5A5" : "black",
                glyphName: "tuplet3",
                fontSize: this.props.fontSize,
                x: this.props.x + offset/2,
                y: y});
        }
    }

    render: () => any; // RenderableMixin
};

Beam.applyMixins(RenderableMixin);

export var Component = ReactTS.createReactComponent(Beam);

export interface IProps {
    beams: C.IBeamCount;
    direction: number;
    fontSize: number;
    line1: number;
    line2: number;
    notehead1: string;
    notehead2: string;
    stemWidth: number;
    stroke: string;
    tuplet: C.ITuplet;
    tupletsTemporary: boolean;
    variableBeams: Array<number>;
    variableX: Array<number>;
    width: number;
    x: number;
    y: number;
}
