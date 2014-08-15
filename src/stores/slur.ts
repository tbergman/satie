/**
 * @jsx React.DOM
 */

import Model = require("./model");

import BeamGroupModel = require("./beamGroup");
import ClefModel = require("./clef");
import Context = require("./context");
import Contracts = require("./contracts");
import KeySignatureModel = require("./keySignature");
import DurationModel = require("./duration");
import IterationStatus = require("./iterationStatus");
import TimeSignatureModel = require("./timeSignature");
import SmartCondition = require("./smartCondition");

class SlurGroupModel extends Model {
    slur: number;
    _beam = BeamGroupModel;
    _notes: Array<DurationModel>;
    isEmpty: boolean;
    direction: number;
    line1: number;
    line2: number;
    width: number;
    m_x: number;
    m_y: number;

    annotateImpl(ctx: Context): IterationStatus {
        var n: Array<DurationModel> = [];
        this._beam = undefined;
        this._fontSize = ctx.fontSize;
        for (var i = ctx.idx; i < ctx.body.length && n.length < this.slur; ++i) {
            if ((<any>ctx.body[i])["beam"]) {
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
                DurationModel.getLine(first, ctx),
                DurationModel.getLine(last, ctx));
            this.m_x = first.x();
            this.m_y = first.y();
            this.line1 = DurationModel.getLine(first, ctx);
            this.line2 = DurationModel.getLine(last, ctx);
            this.width = last.x() - first.x();
        }
        return IterationStatus.SUCCESS;
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

    prereqs = SlurGroupModel.prereqs;

    static prereqs: Array<SmartCondition> = [
        {
            condition: function (ctx) { return !!ctx.clef; },
            correction: ClefModel.createClef,
            description: "A clef must exist on each line."
        },

        {
            condition: function (ctx) { return !!ctx.keySignature; },
            correction: KeySignatureModel.createKeySignature,
            description: "A key signature must exist on each line."
        },

        {
            condition: function (ctx) { return !!ctx.timeSignature; },
            correction: TimeSignatureModel.createTS,
            description: "A time signature must exist on the first line of every page."
        }
    ];

    get type() {
        return Contracts.ModelType.SLUR;
    }
}

Model.length; // BUG in typescriptifier

export = SlurGroupModel;
