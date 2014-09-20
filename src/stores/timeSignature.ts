/**
 * @file Time signature model.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import _ = require("lodash");

import C = require("./contracts");
import Annotator = require("./annotator");
import ClefModel = require("./clef");
import KeySignatureModel = require("./keySignature");

class TimeSignatureModel extends Model implements C.ITimeSignature {
    recordMetreDataImpl(mctx: C.MetreContext) {
        mctx.timeSignature = this.timeSignature;
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // A clef must exist on each line.
        var status: C.IterationStatus = C.IterationStatus.SUCCESS;
        if (!ctx.clef) { status = ClefModel.createClef(ctx); }
        if (status !== C.IterationStatus.SUCCESS) { return status; }

        // A key signature must exist on each line
        if (!ctx.keySignature) { status = KeySignatureModel.createKeySignature(ctx); }
        if (status !== C.IterationStatus.SUCCESS) { return status; }

        var intersectingNotes = _.filter(ctx.intersects(C.Type.DURATION, true), l => l.isNote);
        if (intersectingNotes.length) {
            if (_.any(intersectingNotes, n => n.containsAccidental(ctx))) {
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
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        return C.IterationStatus.SUCCESS;
    }

    constructor(spec: { timeSignature: C.ITimeSignature }) {
        super(TimeSignatureModel.normalize(spec));
        this._timeSignature = spec.timeSignature;
    }

    toLylite(lylite: Array<string>) {
        if (this.source === C.Source.ANNOTATOR) {
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
            }, source: C.Source.ANNOTATOR}));
    };

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

    get type() {
        return C.Type.TIME_SIGNATURE;
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

    _annotatedSpacing: number;
    color: string;
    actualTS: C.ITimeSignature;
    temporary: boolean;
    selected: boolean;
    private _timeSignature: C.ITimeSignature = null;
}

Model.constructorsByType[C.Type[C.Type.TIME_SIGNATURE]] = (spec: any) => new TimeSignatureModel(spec);

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = TimeSignatureModel;
