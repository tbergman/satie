/**
 * @file Occurs before notes of a slur. The notes are neighbors, not children.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import BeamGroupModel = require("./beamGroup");
import C = require("./contracts");
import ClefModel = require("./clef");
import Context = require("./context");
import KeySignatureModel = require("./keySignature");
import DurationModel = require("./duration");
import TimeSignatureModel = require("./timeSignature");

class SlurGroupModel extends Model {
    slur: number;
    _beam = BeamGroupModel;
    _notes: Array<DurationModel>;
    isEmpty: boolean;
    direction: number;
    lines1: Array<number>;
    lines2: Array<number>;
    width: number;
    m_x: number;
    m_y: number;

    annotateImpl(ctx: Context): C.IterationStatus {
        // A clef must exist on each line.
        if (!ctx.clef) {
            return ClefModel.createClef(ctx);
        }

        // A key signature must exist on each line.
        if (!ctx.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }

        // A time signature must exist on the first line of every page.
        if (!ctx.timeSignature) {
            return TimeSignatureModel.createTS(ctx);
        }

        var n: Array<DurationModel> = [];
        this._beam = undefined;
        for (var i = ctx.idx; i < ctx.body.length && n.length < this.slur; ++i) {
            if (ctx.body[i].type === C.Type.BEAM_GROUP) {
                this._beam = <any> ctx.body[i]; // TSFIX
            }
            if (ctx.body[i].isNote) {
                n.push(<DurationModel> ctx.body[i]);
            }
        }
        this._notes = n;
        this.isEmpty = !n.length;
        if (!this.isEmpty) {
            var first = this._notes[0];
            var last = this._notes[this._notes.length - 1];
            this.direction = - BeamGroupModel.decideDirection(
                DurationModel.getLines(first, ctx),
                DurationModel.getLines(last, ctx));
            this.m_x = first.x();
            this.m_y = first.y();
            this.lines1 = DurationModel.getLines(first, ctx);
            this.lines2 = DurationModel.getLines(last, ctx);
            this.width = last.x() - first.x();
        }
        return C.IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>, unresolved?: Array<(obj: Model) => boolean>) {
        var count = this.slur;
        unresolved.push((obj) => {
            if (!obj.isNote) {
                return false;
            }

            lylite.push("(");
            return true;
        });
        unresolved.push((obj: Model) => {
            if (!obj.isNote) {
                return false;
            }

            if (!--count) {
                lylite.push(")");
                return true;
            }
        });
    }

    get type() {
        return C.Type.SLUR;
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = SlurGroupModel;
