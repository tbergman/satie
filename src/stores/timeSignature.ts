/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import _ = require("lodash");

import C = require("./contracts");
import Annotator = require("./annotator");
import ClefModel = require("./clef");
import DurationModelType = require("./duration"); // Potentially cyclic. For types only.
import KeySignatureModel = require("./keySignature");

class TimeSignatureModel extends Model.StateChangeModel implements C.ITimeSignature {
    recordMetreDataImpl(mctx: C.MetreContext) {
        mctx.timeSignature = this.timeSignature;
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // A clef must exist on each line.
        var status: C.IterationStatus = C.IterationStatus.Success;
        if (!ctx.clef) { status = ClefModel.createClef(ctx); }
        if (status !== C.IterationStatus.Success) { return status; }

        // A key signature must exist on each line
        if (!ctx.keySignature) { status = KeySignatureModel.createKeySignature(ctx); }
        if (status !== C.IterationStatus.Success) { return status; }

        // Time signatures must not be redundant
        if (ctx.timeSignature && TimeSignatureModel.isEqual(this.timeSignature, ctx.timeSignature)) {
            ctx.eraseCurrent();
            return C.IterationStatus.RetryCurrent;
        }

        var intersectingNotes = _.filter(ctx.intersects(C.Type.Duration), l => l.isNote);
        if (intersectingNotes.length) {
            if (_.any(intersectingNotes, n => (<DurationModelType>n).containsAccidentalAfterBarline(ctx))) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 1.5;
            } else {
                this._annotatedSpacing = 2.5;
            }
        } else {
            this._annotatedSpacing = 1.25;
        }

        ctx.x += 0.7 + this._annotatedSpacing/4;
        ctx.timeSignature = this._timeSignature;
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        return C.IterationStatus.Success;
    }

    constructor(spec: { timeSignature: C.ITimeSignature }) {
        super(TimeSignatureModel.normalize(spec));
        this._timeSignature = spec.timeSignature;
    }

    toLylite(lylite: Array<string>) {
        if (this.source === C.Source.Annotator) {
            return;
        }
        if (!this._timeSignature.commonRepresentation) {
            lylite.push("\\numericTimeSignature");
        } else {
            lylite.push("\\defaultTimeSignature");
        }

        lylite.push("\\time " + this._timeSignature.beats + "/" + this._timeSignature.beatType + "\n");
    }

    static createTS = (ctx: Annotator.Context): C.IterationStatus => {
        return ctx.insertPast(new TimeSignatureModel({
            timeSignature: {
                beats: 4,
                beatType: 4,
                commonRepresentation: true
            }, source: C.Source.Annotator}));
    };

    get beats() {
        return this._timeSignature.beats;
    }
    get beatType() {
        return this._timeSignature.beatType;
    }
    get timeSignature(): C.ITimeSignature {
        return this._timeSignature;
    }
    set timeSignature(ts: C.ITimeSignature) {
        this._timeSignature = _.clone(ts);
    }
    get displayTimeSignature(): C.ITimeSignature {
        return this._displayTimeSignature || this._timeSignature;
    }
    set displayTimeSignature(ts: C.ITimeSignature) {
        this._displayTimeSignature = ts;
    }

    get type() {
        return C.Type.TimeSignature;
    }

    /**
     * Make sure all beats are represented as numbers, not strings.
     */
    private static normalize(spec: { timeSignature: C.ITimeSignature }) {
        spec.timeSignature.beats *= 1;
        spec.timeSignature.beatType *= 1;
        return spec;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            timeSignature: {
                beats: this.beats,
                beatType: this.beatType,
                commonRepresentation: this._timeSignature.commonRepresentation
            }
        });
    }

    static isEqual(ts1: C.ITimeSignature, ts2: C.ITimeSignature) {
        return (!!ts1 === !!ts2) &&
            (!ts1 || ts1.beats === ts2.beats && ts1.beatType === ts2.beatType &&
                ts1.commonRepresentation === ts2.commonRepresentation);
    }

    _annotatedSpacing: number;
    color: string;
    temporary: boolean;
    selected: boolean;
    private _timeSignature: C.ITimeSignature = null;
    private _displayTimeSignature: C.ITimeSignature = null;
}

export = TimeSignatureModel;
