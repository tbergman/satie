/**
 * @jsx React.DOM
 */

import Model = require("./model");

import _ = require("lodash");

import Context = require("./context");
import Contracts = require("./contracts");
import ClefModel = require("./clef");
import DurationModel = require("./duration");
import IterationStatus = require("./iterationStatus");
import SmartCondition = require("./smartCondition");
import KeySignatureModel = require("./keySignature");

class TimeSignatureModel extends Model {
    _annotatedSpacing: number;
    color: string;
    actualTS: {
        beats: number;
        beatType: number;
    }
    temporary: boolean;
    selected: boolean;
    timeSignature: {
        beats: number;
        beatType: number;
    };

    annotateImpl(ctx: Context): IterationStatus {
        var next = ctx.next();
        if (next.isNote) {
            if (_.any(_.filter(next.intersects, (l: DurationModel) => l.isNote),
                           n => n.containsAccidental(ctx)) ? 1 : 0) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 1.5;
            } else {
                this._annotatedSpacing = 2.5;
            }
        } else {
            this._annotatedSpacing = 1.25;
        }

        ctx.x += 0.7 + this._annotatedSpacing/4;
        ctx.timeSignature = this.actualTS || this.timeSignature;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black");
        return IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>) {
        if (this._annotated) {
            return;
        }

        lylite.push("\\time " + this.timeSignature.beats + "/" + this.timeSignature.beatType);
    }

    static createTS = (ctx: Context): IterationStatus => {
        return ctx.insertPast(new TimeSignatureModel({
            timeSignature: {
                beats: 4, 
                beatType: 4,
                commonRepresentation: true
            }, _annotated: "createTS"}));
    };

    prereqs = TimeSignatureModel.prereqs;

    static prereqs : Array<SmartCondition> = [
        {
            condition: function (ctx) {
                return !!ctx.clef;
            },
            correction: ClefModel.createClef,
            description: "A clef must exist on each line."
        },

        {
            condition: function (ctx) {
                return !!ctx["keySignature"];
            },
            correction: KeySignatureModel.createKeySignature,
            description: "A key signature must exist on each line."
        }
    ];

    get type() {
        return Contracts.ModelType.TIME_SIGNATURE;
    }
}

Model.length; // BUG in typescriptifier

export = TimeSignatureModel;
