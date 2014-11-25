/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");

import C = require("../stores/contracts");
import SMuFL = require("../util/SMuFL");
import renderUtil = require("../util/renderUtil");
import Glyph = require("./_glyph");
import Group = require("./_group");
import RenderableMixin = require("./_renderable");
var Victoria = require("../renderer/victoria/victoria");
import getFontOffset = require("./_getFontOffset");

/**
 * Calculates a way to render a beam given two endpoints.
 * See also BeamGroup and BeamGroupModel.
 */
class Beam extends TypedReact.Component<Beam.IProps, {}> implements RenderableMixin {
    renderSVG() {
        var f = this.props.fontSize * renderUtil.FONT_SIZE_FACTOR;
        if (this.props.beams === C.BeamCount.Variable) {
            var xLow = this._getX1();
            var xHi = this._getX2();

            return <!Group.Component>
                {_.map(this.props.variableBeams, (beams: number, idx: number): any => {
                    if (idx === 0) {
                        return null;
                    }
                    return _.times(beams, beam => {
                        var x1: number;
                        var x2: number = this._withXOffset(this.props.variableX[idx]);
                        if (this.props.variableBeams[idx - 1] <= beam) {
                            if (this.props.variableX[idx + 1] &&
                                this.props.variableBeams[idx + 1] === beams) {
                                return null;
                            }
                            x1 = this._withXOffset((this.props.variableX[idx - 1] + this.props.variableX[idx] * 3) / 4);
                        } else {
                            x1 = this._withXOffset(this.props.variableX[idx - 1]);
                        }
                        return React.DOM.polygon({
                            key: idx + "_" + beam,
                            points: f * x1 + "," +
                            f * this._getYVar(0, beam, (x1 - xLow)/(xHi - xLow)) + " " +
                            f * x2 + "," +
                            f * this._getYVar(0, beam, (x2 - xLow)/(xHi - xLow)) + " " +
                            f * x2 + "," +
                            f * this._getYVar(1, beam, (x2 - xLow)/(xHi - xLow)) + " " +
                            f * x1 + "," +
                            f * this._getYVar(1, beam, (x1 - xLow)/(xHi - xLow)),
                            stroke: this.props.stroke,
                            fill: this.props.stroke,
                            strokeWidth: 0
                        });
                    });
                })}
                {this._tuplet()}
            </Group.Component>;
        } else {
            return <!Group.Component>
                {_.times(this.props.beams, idx =>
                    React.DOM.polygon({
                        key: "" + idx,
                        points: f*this._getX1() + "," + f*this._getY1(0, idx) + " " +
                            f*this._getX2() + "," + f*this._getY2(0, idx) + " " +
                            f*this._getX2() + "," + f*this._getY2(1, idx) + " " +
                            f*this._getX1() + "," + f*this._getY1(1, idx),
                        stroke: this.props.stroke,
                        fill: this.props.stroke,
                        strokeWidth: 0})
                )}
                {this._tuplet()}
            </Group.Component>;
        }
    }

    renderGL() {
        return <!Group.Component>
            {_.times(this.props.beams, idx => <!Victoria.VRect
                key={idx}
                x1={this._getX1()}
                x2={this._getX2()}
                y1={this._getY1(0, idx)}
                y2={this._getY1(1, idx)}
                fill={this.props.stroke}
                skewX={0}
                skewY={this._getY1(1, idx) - this._getY2(1, idx)} />)}
            this._tuplet()}
        </Group.Component>;
    }

    /**
     * Returns true if anything has changed. Beams are particularly slow to mount.
     */
    shouldComponentUpdate(nextProps : Beam.IProps) {
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
        return this.direction() * -this.props.stemWidth / 2;
    }

    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    direction() {
        return this.props.direction;
    }

    getFontOffset = getFontOffset;

    private _withXOffset(x: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return x +
            this.getFontOffset("noteheadBlack")[0]/4 +
            this.getLineXOffset();
    }

    private _getX1() {
        return this._withXOffset(this.props.x);
    }

    private _getX2() {
        return this._withXOffset(this.props.x + this.props.width);
    }

    private _getY1(incl: number, idx: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return this.props.y -
            this._getYOffset() -
            this.direction()*this.getFontOffset("noteheadBlack")[1]/4 -
            (this.props.line1 - 3)/4 +
            this.direction()*idx*0.22 +
            (incl || 0)*(SMuFL.bravuraMetadata.engravingDefaults.beamThickness/4);
    }

    private _getY2(incl: number, idx: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return this.props.y -
            this._getYOffset() -
            this.direction()*this.getFontOffset("noteheadBlack")[1]/4 -
            (this.props.line2 - 3)/4 +
            this.direction()*idx*0.22 +
            (incl || 0)*(SMuFL.bravuraMetadata.engravingDefaults.beamThickness/4);
    }

    private _getYVar(incl: number, idx: number, percent: number) {
        var y1 = this._getY1(incl, idx);
        var y2 = this._getY2(incl, idx);
        return (1 - percent) * y1 + percent * y2;
    }

    /**
     * Offset because the note-head has a non-zero height.
     * The note-head is NOT CENTERED at its local origin.
     */
    private _getYOffset() {
        if (this.direction() === -1) {
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
                    (0.1 + 0.2*this.props.beams)*this.direction() + 0.13;

            // XXX: all tuplets are drawn as triplets.
            return <!Glyph.Component
                "selection-info"="beamTuplet"
                fill={this.props.tupletsTemporary ? "#A5A5A5" : "#000000"}
                glyphName="tuplet3"
                fontSize={this.props.fontSize}
                x={this.props.x + offset/2}
                y={y} />;
        }
    }
};

Beam.prototype.render = RenderableMixin.prototype.render;

module Beam {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Beam);

    export interface IProps {
        beams: C.BeamCount;
        direction: number;
        fontSize: number;
        line1: number;
        line2: number;
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
}

export = Beam;
