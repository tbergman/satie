/**
 * Calculates a way to render a beam given two endpoints.
 * Does interesting math. Probably needs to be redone to match
 * the suggestions in "Behind Bars".
 *
 * See also BeamGroup and BeamGroupModel.
 */

import React = require("react");
import ReactTS = require("react-typescript");
import _ = require("lodash");

import C = require("../stores/contracts");
var Glyph = require("./_glyph.jsx");
var Group = require("./_group.jsx");
var RenderableMixin = require("./_renderable.jsx");
var SMuFL = require("../../node_modules/ripienoUtil/SMuFL.ts");
var Victoria = require("../renderer/victoria/hellogl.jsx");
var getFontOffset: Function = require("./_getFontOffset.jsx");
import renderUtil = require("../../node_modules/ripienoUtil/renderUtil");

var VRect = Victoria.VRect;

export class Beam extends ReactTS.ReactComponentBase<IProps, {}> {
    renderSVG() {
        var f = this.props.fontSize * renderUtil.FONT_SIZE_FACTOR;
        if (this.props.beams === C.IBeamCount.VARIABLE) {
            return Group(null,
                _.map(this.props.variableBeams, (beam: number, idx: number): any => {
                    return null;
                }),
                this.tuplet()
            );
        } else {
            return Group(null,
                _.times(this.props.beams, idx =>
                    React.DOM.polygon({
                        key: "" + idx,
                        points: f*this.getX1() + "," + f*this.getY1(0, idx) + " " +
                            f*this.getX2() + "," + f*this.getY2(0, idx) + " " +
                            f*this.getX2() + "," + f*this.getY2(1, idx) + " " +
                            f*this.getX1() + "," + f*this.getY1(1, idx),
                        stroke: this.props.stroke,
                        fill: this.props.stroke,
                        strokeWidth: 0})
                ),
                this.tuplet()
            );
        }
    }

    renderGL() {
        return Group(null,
            _.times(this.props.beams, idx => VRect({
                key: idx,
                x1: this.getX1(), x2: this.getX2(),
                y1: this.getY1(0, idx), y2: this.getY1(1, idx),
                fill: this.props.stroke,
                skewx: 0, skewY: this.getY1(1, idx) - this.getY2(1, idx)})),
            this.tuplet()
        );
    }

    /**
     * Beams are particularly slow to mount.
     */
    shouldComponentUpdate(nextProps : IProps) {
        var ret =
            this.props.beams !== nextProps.beams ||
            this.props.direction !== nextProps.direction ||
            this.props.line1 !== nextProps.line1 ||
            this.props.line2 !== nextProps.line2 ||
            this.props.stroke !== nextProps.stroke ||
            this.props.tuplet !== nextProps.tuplet ||
            this.props.tupletsTemporary !== nextProps.tupletsTemporary ||
            this.props.width !== nextProps.width ||
            this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y;
        return ret;
    }

    /**
     * Offset because the note-head has a non-zero width.
     */
    getLineXOffset() {
        return this.getDirection() * -this.props.stemWidth/2;
    }

    /**
     * Offset because the note-head has a non-zero height.
     * The note-head is NOT CENTERED at it's local origin.
     */
    getYOffset() {
        if (this.getDirection() === -1) {
            return 0.040;
        }
        return 0.005;
    }

    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    getDirection() {
        return this.props.direction;
    }
    getFontOffset = getFontOffset;

    getX1() {
        return this.props.x +
            this.getFontOffset(this.props.notehead1)[0]/4 +
            this.getLineXOffset();
    }
    getY1(incl: number, idx: number) {
        return this.props.y -
            this.getYOffset() -
            this.getDirection()*this.getFontOffset(this.props.notehead1)[1]/4 -
            (this.props.line1 - 3)/4 +
            this.getDirection()*idx*0.22 +
            (incl || 0)*(SMuFL.bravuraMetadata.engravingDefaults.beamThickness/4);
    }

    getX2() {
        return this.props.x +
            this.getFontOffset(this.props.notehead2)[0]/4 +
            this.getLineXOffset() +
            this.props.width;
    }
    getY2(incl: number, idx: number) {
        return this.props.y -
            this.getYOffset() -
            this.getDirection()*this.getFontOffset(this.props.notehead2)[1]/4 -
            (this.props.line2 - 3)/4 +
            this.getDirection()*idx*0.22 +
            (incl || 0)*(SMuFL.bravuraMetadata.engravingDefaults.beamThickness/4);
    }

    /**
     * Returns a React component instance showing the tuplet number
     */
    tuplet() {
        if (!this.props.tuplet) {
            return null;
        } else {
            var offset = this.getX2() - this.getX1();
            var y = (this.getY1(1, this.props.beams - 1) +
                        this.getY2(1, this.props.beams - 1))/2 -
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
