/**
 * @jsx React.DOM
 */

import Model = require("./model");

import _ = require("lodash");

import C = require("./contracts");
import Context = require("./context");
import ClefModel = require("./clef");
import DurationModel = require("./duration");
import KeySignatureModel = require("./keySignature");

class TimeSignatureModel extends Model implements C.ITimeSignature {
    constructor(spec: { timeSignature: C.ITimeSignature }) {
        super(spec);
        this._timeSignature = spec.timeSignature;
    }
    get beats() {
        return this._timeSignature.beats;
    }
    get beatType() {
        return this._timeSignature.beatType;
    }
    set timeSignature(ts: C.ITimeSignature) {
        this._timeSignature = _.clone(ts);

    }
    get timeSignature(): C.ITimeSignature {
        return this._timeSignature;
    }

    annotateImpl(ctx: Context): C.IterationStatus {
        // A clef must exist on each line.
        var status: C.IterationStatus = C.IterationStatus.SUCCESS;
        if (!ctx.clef) { status = ClefModel.createClef(ctx); }
        if (status !== C.IterationStatus.SUCCESS) { return status; }

        // A key signature must exist on each line
        if (!ctx.keySignature) { status = KeySignatureModel.createKeySignature(ctx); }
        if (status !== C.IterationStatus.SUCCESS) { return status; }

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
        ctx.timeSignature = this.actualTS || this._timeSignature;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black");
        return C.IterationStatus.SUCCESS;
    }
    toLylite(lylite: Array<string>) {
        if (this._annotated) {
            return;
        }

        lylite.push("\\time " + this._timeSignature.beats + "/" + this._timeSignature.beatType);
    }

    static createTS = (ctx: Context): C.IterationStatus => {
        return ctx.insertPast(new TimeSignatureModel({
            timeSignature: {
                beats: 4,
                beatType: 4,
                commonRepresentation: true
            }, _annotated: "createTS"}));
    };

    get type() {
        return C.Type.TIME_SIGNATURE;
    }

    _annotatedSpacing: number;
    color: string;
    actualTS: C.ITimeSignature;
    temporary: boolean;
    selected: boolean;
    private _timeSignature: C.ITimeSignature = null;
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = TimeSignatureModel;
