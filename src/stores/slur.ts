/**
 * @jsx React.DOM
 */

import Model = require("./model");

import BeamGroupModel = require("./beamGroup");
import ClefModel = require("./clef");
import KeySignatureModel = require("./keySignature");
import DurationModel = require("./duration");
import TimeSignatureModel = require("./timeSignature");
import Pitch = require("./pitch");

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

    annotateImpl(ctx) {
        var n = [];
        this._beam = undefined;
        this._fontSize = ctx.fontSize;
        for (var i = ctx.idx; i < ctx.body.length && n.length < this.slur; ++i) {
            if (ctx.body[i].beam) {
                this._beam = ctx.body[i];
            }
            if (ctx.body[i].pitch || ctx.body[i].chord) {
                n.push(ctx.body[i]);
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
        return true;
    }
    toLylite(lylite, unresolved) {
        var count = this.slur;
        unresolved.push((obj, lylite, unresolved) => {
            if (!obj.pitch && !obj.chord) {
                return false;
            }

            lylite.push("(");
            return true;
        });
        unresolved.push((obj, lylite, unresolved) => {
            if (!obj.pitch && !obj.chord) {
                return false;
            }

            if (!--count) {
                lylite.push(")");
                return true;
            }
        });
    }

    prereqs = SlurGroupModel.prereqs;

    static prereqs = [
        [
            function(ctx) { return ctx.clef; },
            ClefModel.createClef,
            "A clef must exist on each line."
        ],

        [
            function(ctx) { return ctx.keySignature; },
            KeySignatureModel.createKeySignature,
            "A key signature must exist on each line."
        ],

        [
            function(ctx) { return ctx.timeSignature; },
            TimeSignatureModel.createTS,
            "A time signature must exist on the first line of every page."
        ]
    ];
}

Model.length; // BUG in typescriptifier

export = SlurGroupModel;
