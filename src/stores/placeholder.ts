/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import Model                = require("./model");

import _                	= require("lodash");
import assert           	= require("assert");

import Annotator        	= require("./annotator");
import AttributesModel      = require("./attributes");
import BarlineModel     	= require("./barline");
import BeginModel       	= require("./begin");
import C                	= require("./contracts");
import ClefModel        	= require("./clef");
import DurationModel    	= require("./duration");
import EndMarkerModel   	= require("./endMarker");
import KeySignatureModel    = require("./keySignature");
import Metre                = require("./metre");
import NewlineModel         = require("./newline");
import NewpageModel         = require("./newpage");
import TimeSignatureModel   = require("./timeSignature");

/**
 * Models in the same location across voices must have:
 *  - the same priority (=== type, except in PlaceholderModel)
 *  - the same starting beat
 * 
 * PlaceholderModels fill gaps in voices to make these conditions true.
 * 
 * PlaceholderModels are used when there is no information at the current position in the current
 * voice. For example, consider this bar:
 * 
 *   Beat:     [1///2///3///4///]
 *   Voice 1:  [|#######|######|]
 *   Voice 2:  [|##############|]
 * 
 * On beat 3, Voice 2 would have a placeholder for a Duration, because it does not have a starting
 * not on beat 3.
 */
class PlaceholderModel extends Model {

    /*---- I.1 Model ----------------------------------------------------------------------------*/

    get visible()                                       { return false; }
    get xPolicy()                                       { return C.RectifyXPolicy.Invalid; }
    get fields()                                        { return ["priority",
                                                                  "item" /* For Renderer */,
                                                                  "musicLine" /* ditto */]; }
    get type():             C.Type                      { return C.Type.Placeholder; }
    get placeholder()                                   { return true; }
    set placeholder(b: boolean) {
        assert(false, "A PlaceholderModel cannot help but be a placeholder, however much it tries...");
    }

    /*---- I.2 PlaceholderModel -----------------------------------------------------------------*/

    _priority:              C.Type;                     // See Object.prototype._priority
    get priority()                                      { return this._priority; }
    set priority(c: C.Type)                             { this._priority = c; }

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: {priority: number}, annotated: boolean) {
        super(spec, annotated);
        this.annotated = annotated;
    }

    recordMetreDataImpl(mctx: C.MetreContext) {
        // EXCEPTION -- if we are a DurationModel at beat 0, we actually should be
        // at the end of the bar. See duration.ts
        // if (this.priority === C.Type.Duration && mctx.beat === 0) {
        //     this.ctxData = new C.MetreContext({
        //         attributes: mctx.attributes,
        //         beat: mctx.ts.beats,
        //         bar: mctx.bar - 1,
        //         endMarker: false,
        //         ts: mctx.ts
        //     });
        // } else {
        this.ctxData = new C.MetreContext(mctx);
        // }
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Make sure a model (be it a placeholder or not) is needed here because either:
        //  1) One of the models at the current location is not a placeholder
        //  2) The starting beat is different (this isn't a stable situation -- the
        //     annotation process will eventually either make (1) true, or decide that no
        //     model is required at this index). If we haven't gotten to writing the
        //     starting beat, conservatively assume this placeholder is needed.
        var loc = new C.Location(ctx.loc);
        var usefulItems = ctx.findVertical(obj => obj.type !== C.Type.Placeholder || !obj.ctxData || !loc.eq(obj.ctxData));
        if (!usefulItems.length) {
            return ctx.eraseCurrent();
        }

        var realItems = ctx.findVertical(obj => obj.type !== C.Type.Placeholder);

        // Remove extraneous placeholders that may have been caused by the above operation.
        while (ctx.next() && !ctx.findVertical(obj => obj.type !== C.Type.Placeholder, ctx.idx + 1).length) {
            ctx.eraseFuture(ctx.idx + 1);
        }

        if (this.priority !== realItems[0].type) {
            console.warn("Dangerously correcting a mismatched type.");
            this.priority = realItems[0].type;
        }

        // Only correct rhythm if the beat is valid (otherwise, our rhythmicSpellcheck
        // won't give sensible results!)
        if (ctx.ts && ctx.__globalDivision__ < ctx.ts.beats*ctx.attributes.divisions) {
            // Add in rests, if needed. (This is part of the reason (2) is needed above).
            if (ctx.division < ctx.__globalDivision__) {
                return PlaceholderModel.fillMissingBeats(ctx);
            }

            if (ctx.division === ctx.__globalDivision__ && this.priority === C.Type.Duration) {
                assert(realItems[0], "We can't have an entire column of fake durations,");
                return PlaceholderModel.fillMissingBeats(ctx, realItems[0].calcDivisions(ctx));
            }
        }

        // Type specific logic.
        switch(this.priority) {
            case C.Type.Attributes:
                if (!ctx.idxInPart) {
                    ctx.body.splice(ctx.idx, 1, new AttributesModel({}, true));
                    return C.IterationStatus.RetryCurrent;
                } else {
                    ctx.attributes = ctx._voices[
                        _.chain(ctx.part.containsVoice)
                            .keys()
                            .map(a => parseInt(a, 10))
                            .min()
                            .value()
                        ].body[ctx.idx];
                    if (!ctx.ts) {
                        ctx.ts = {
                            beats: 4,
                            beatType: 4
                        };
                    }
                }
                break;
            case C.Type.Barline:
                ctx.body.splice(ctx.idx, 1, new BarlineModel({ barStyle: {data: C.MusicXML.BarStyleType.Regular }}, true, false));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.Begin:
                ctx.body.splice(ctx.idx, 1, new BeginModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.Clef:
                if (ctx.part.staveCount > ctx.idxInPart) {
                    var newClef: ClefModel;
                    if (!ctx.attributes.clefs[ctx.idxInPart]) {
                        newClef = new ClefModel({ sign: "G", line: 2, clefOctaveChange: null }, true);
                    } else if (!("priority" in ctx.attributes.clefs[ctx.idxInPart])) { // This checks if it's a model
                        newClef = new ClefModel(ctx.attributes.clefs[ctx.idxInPart], true);
                    }

                    if (newClef) {
                        ctx.body.splice(ctx.idx, 1, newClef); // FIXME
                        ctx.attributes.clefs[ctx.idxInPart] = newClef;
                        ctx.body[ctx.idx].annotated = this.annotated;
                        ctx.body[ctx.idx].proposed  = this.proposed;
                        return C.IterationStatus.RetryCurrent;
                    }
                }
                break;
            case C.Type.Duration:
                assert(!ctx.findVertical(c => c.priority !== C.Type.Duration).length);
                var next = ctx.next(null, 1, true);
                if (next && next.type /* not priority! */ === C.Type.BeamGroup) {
                    var bodies: Array<Model> = ctx.findVertical(() => true, this.idx + 1);
                    ctx.eraseFuture(this.idx + 1);
                    ctx.insertPastVertical(bodies);
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed  = this.proposed;
                    return C.IterationStatus.RetryCurrent;
                }
                break;
            case C.Type.EndMarker:
                ctx.body.splice(ctx.idx, 1, new EndMarkerModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.KeySignature:
                if (ctx.part.staveCount > ctx.idxInPart) {
                    var ks = C.JSONx.clone(<KeySignatureModel>realItems[0]);
                    assert(ks, "Undefined prevKeySignature!!");
                    ctx.body.splice(ctx.idx, 1, new KeySignatureModel({ keySignature: ks }, true));
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed  = this.proposed;
                    return C.IterationStatus.RetryCurrent;
                }
                break;
            case C.Type.NewLine:
                ctx.body.splice(ctx.idx, 1, new NewlineModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.NewPage:
                ctx.body.splice(ctx.idx, 1, new NewpageModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.TimeSignature:
                if (ctx.part.staveCount > ctx.idxInPart) {
                    var tses = ctx.findVertical(obj => obj.type === C.Type.TimeSignature);
                    assert(tses.length, "Staves cannot all be placeholders!");
                    ctx.body.splice(ctx.idx, 1, new TimeSignatureModel(<TimeSignatureModel> (<any>tses[0]).toMXMLObject(), true));
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed  = this.proposed;
                    return C.IterationStatus.RetryCurrent;
                }
                break;
        }

        // HACK HACK HACK! Sometimes recordMetreDataImpl isn't run when only Placeholders have been added or removed.
        if (this.priority !== C.Type.Print && ctx.attributes && ctx.attributes.time) {
            this.recordMetreDataImpl(ctx);
        }

        return C.IterationStatus.Success;
    }

    /*---- IV. Static ---------------------------------------------------------------------------*/

    static fillMissingBeats(ctx: Annotator.Context, extraDivisions?: number): C.IterationStatus {
        extraDivisions = extraDivisions || 0;
        var rest: {} = { chord: [{ step: "R", octave: null, acc: null }] };
        var missingBeats = Metre.subtract(ctx.__globalDivision__ + extraDivisions, ctx.division, ctx).map(
                spec => new DurationModel(<C.IPitchDuration>_.extend(spec, rest),
                    true));
        ctx.splice(ctx.idx, 1, missingBeats, Annotator.SplicePolicy.Masked);
        return C.IterationStatus.RetryLine;
    }
}

PlaceholderModel.prototype._priority = C.Type.Unknown;

export = PlaceholderModel;
