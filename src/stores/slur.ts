/**
 * @file Occurs before notes of a slur. The notes are neighbors, not children.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model                = require("./model");

import BeamGroupModel       = require("./beamGroup");
import C                    = require("./contracts");
import ClefModel            = require("./clef");
import Annotator            = require("./annotator");
import KeySignatureModel    = require("./keySignature");
import DurationModel        = require("./duration");
import TimeSignatureModel   = require("./timeSignature");

class SlurGroupModel extends Model {
    //
    // I.1 Model
    //

    get type()                          { return C.Type.Slur; }
    get fields()                        { return ["slur"]; }
    get xPolicy()                       { return C.RectifyXPolicy.Min; }

    //
    // I.2 SlurGroupModel
    //

    slur:           number;             // See prototype.
    _beam:          BeamGroupModel      = null; // Cannot be added to fields() with initializer.
    _notes:         DurationModel[]     = null; // Cannot be added to fields() with initializer.
    isEmpty:        boolean;            // See prototype.
    direction:      number;             // See prototype.
    lines1:         number[];           // See prototype.
    lines2:         number[];           // See prototype.
    slurW:          number;             // See prototype.
    m_x:            number;             // See prototype.
    m_y:            number;             // See prototype.

    ////////////////////
    // II. Life-cycle //
    ////////////////////
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        if (ctx.prev().type === C.Type.Placeholder) {
            this.x          = ctx.prev().x;
            ctx.x       	= this.x;
        }

        // A clef must exist on each line.
        if (!ctx.attributes.clefs[ctx.voiceIdx/*CXFIX*/]) {
            return ClefModel.createClef(ctx);
        }

        // A key signature must exist on each line.
        if (!ctx.attributes.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }

        // A time signature must exist on the first line of every page.
        if (!ctx.ts) {
            return TimeSignatureModel.createTS(ctx);
        }

        var n: Array<DurationModel> = [];
        this._beam = undefined;
        for (var i = ctx.idx; i < ctx.body.length && n.length < this.slur; ++i) {
            if (ctx.body[i].type === C.Type.BeamGroup) {
                this._beam  = <any> ctx.body[i]; // TSFIX
            }
            if (ctx.body[i].isNote) {
                n.push(<DurationModel> ctx.body[i]);
            }
        }
        this._notes         = n;
        this.isEmpty        = !n.length;

        if (!this.isEmpty) {
            var first       = this._notes[0];
            var last        = this._notes[this._notes.length - 1];
            var firstLines  = DurationModel.getLines(first, ctx);
            var lastLines   = DurationModel.getLines(last, ctx);

            this.direction  = -BeamGroupModel.decideDirection(firstLines, lastLines);
            this.m_x        = first.x;
            this.m_y    	= first.y;
            this.lines1 	= DurationModel.getLines(first, ctx);
            this.lines2 	= DurationModel.getLines(last, ctx);
            this.slurW  	= last.x - first.x;
        }

        return C.IterationStatus.Success;
    }
}

SlurGroupModel.prototype.slur       = null;
SlurGroupModel.prototype.isEmpty    = true;
SlurGroupModel.prototype.direction  = NaN;
SlurGroupModel.prototype.lines1     = null;
SlurGroupModel.prototype.lines2     = null;
SlurGroupModel.prototype.slurW      = NaN;
SlurGroupModel.prototype.m_x        = NaN;
SlurGroupModel.prototype.m_y        = NaN;

export = SlurGroupModel;
