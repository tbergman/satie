/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model                = require("./model");

import _                    = require("lodash");
import assert               = require("assert");

import Annotator            = require("./annotator");
import AttributesModel      = require("./attributes");
import BarlineModel         = require("./barline");
import BeamGroupModelType   = require("./beamGroup");       // Cyclic
import C                    = require("./contracts");
import EndMarkerModel       = require("./endMarker");
import KeySignatureModel    = require("./keySignature");
import Metre                = require("./metre");
import NewlineModel         = require("./newline");
import TimeSignatureModel   = require("./timeSignature");

/**
 * A DurationModel represents 0 (for a rest), 1, or more (for a chord) pitches that occur at
 * the same time in the same part and voice.
 *
 * DurationModel exposes two APIs, one simple, and one full-featured and MusicXML.Note-compliant.
 * To access the simple API, see DurationModel.chord, and convenience properties such as "rest".
 * To access the MusicXML-compliant API, see DurationModel._notes.
 *
 * Note that MusicXML "chords" do not need to all have the same duration. Ripieno does not support this
 * (the notes must be in separate parts).
 */
class DurationModel extends Model implements C.IPitchDuration {

    ///////////////
    // I.1 Model //
    ///////////////

    get fields()                            { return [ "_notes", "dots" ]; }
    get visible()                           { return !this.inBeam; }
    get isNote():  boolean                  { return true; }
    get note():    C.IPitchDuration         { return this; }
    get type()                              { return C.Type.Duration; }
    get xPolicy()                           { return C.RectifyXPolicy.Min; }

    //////////////////////////
    // I.2 C.IPitchDuration //
    //////////////////////////

    chord: C.IPitch[];
    get isRest() {
        return (this.chord && this.chord.length === 1 && this.chord[0].step === "r");
    }

    set isRest(r: boolean) {
        if (!!r) {
            this.chord = [{
                step: "r",
                alter: null,
                octave: null
            }];
            this.tie = false;
        } else {
            assert(!this.isRest, "Instead, set the exact pitch or chord...");
        }
    }

    get tie(): boolean          { return    this._getFlag(Flags.TIE); }
    set tie(v: boolean)         {           this._setFlag(Flags.TIE, v); }

    get isWholebar(): boolean   { return    this._getFlag(Flags.WHOLE_BAR); }
    set isWholebar(v: boolean)  {           this._setFlag(Flags.WHOLE_BAR, v); }

    accToDelete: number;

    ///////////////////////
    // I.2.1 C.IDuration //
    ///////////////////////

    get count() {
        return this._count;
    }

    set count(n: C.MusicXML.Count) {
        assert(!isNaN(n));
        this._count = n;
        this._beats = null; // Kill optimizer.
    }

    dots: number;

    /**
     * Returns the number of dots that should be rendered. This can differ
     * from the actual number of dots during a preview, for example.
     */
    get displayDots(): number {
        if (this.isWholebar && this.isRest) {
            return 0;
        }
        return this._displayDots === void 0 || this._displayDots === null ?
            this.dots : this._displayDots;
    }

    set displayDots(c: number) {
        this._displayDots = c;
    }

    get tuplet() {
        return this._tuplet;
    }

    set tuplet(t: C.ITuplet) {
        this._tuplet            = t;
        this._displayTuplet     = null;
    }

    get displayTuplet() {
        return this._displayTuplet || this._tuplet;
    }

    set displayTuplet(t: C.ITuplet) {
        this._displayTuplet     = t;
    }


    get hasFlagOrBeam() {
        return !!this.tuplet || !this.isRest && DurationModel.countToIsBeamable[this.count];
    }

    get temporary(): boolean    { return    this._getFlag(Flags.TEMPORARY); }
    set temporary(v: boolean)   {           this._setFlag(Flags.TEMPORARY, v); }

    ////////////////////////
    // I.3 Duration Model //
    ////////////////////////

    get accStrokes() {
        return _.map(this.chord, (c, idx) =>
            (c.displayAlter !== null && c.displayAlter !== undefined || this.accToDelete === idx) ? "#A5A5A5" : "#000000");
    }

    get extraWidth() {
        return this._extraWidth;
    }

    set extraWidth(w: number) {
        assert(isFinite(w));
        this._extraWidth = w;
    }

    get direction() {
        return isNaN(this.forceMiddleNoteDirection) ? undefined : this.forceMiddleNoteDirection;
    }

    /**
     * Returns the length of the beat, without dots or tuplet modifiers
     * that should be rendered. This can differ from the actual count
     * during a preview, for example.
     */
    get displayCount(): number              { return this._displayCount || this.count; }
    set displayCount(c: number) {
        assert(c !== null);
        this._displayCount = c;
    }

    get displayNotation(): C.MusicXML.Notations[] {
        return this._displayNotation || this._notes[0].notations;
    }

    set displayNotation(m: C.MusicXML.Notations[]) {
        this._displayNotation = m;
    }

    get flag() {
        return !this.inBeam && (this.displayCount in DurationModel.countToFlag) &&
            DurationModel.countToFlag[this.displayCount];
    }

    set flag(a: string) {
        assert(false, "Read-only property");
    }

    get hasStem() {
        return DurationModel.countToHasStem[this.displayCount];
    }

    get isMultibar() {
        return this.count < 1;
    }

    get noteheadGlyph() {
        return DurationModel.countToNotehead[this.displayCount];
    }

    get restHead() {
        if (this.isWholebar) {
            return DurationModel.countToRest[1];
        }
        return DurationModel.countToRest[this.count];
    }

    get strokes() {
        return _.map(this.chord, c => c.temporary ?
                "#A5A5A5" :
                (this.selected ? "#75A1D0" : "#000000"));
    }

    private _extraWidth: number;
    private _beats: number;
    /** @deprecated */
    private _count: C.MusicXML.Count;
    /** @deprecated */
    private _displayCount: number;
    /** @deprecated */
    private _displayDots: number;
    /** @deprecated */
    private _displayNotation: C.MusicXML.Notations[];
    /** @deprecated */
    private _displayTuplet: C.ITuplet;
    /** @deprecated */
    private _tuplet: C.ITuplet;

    _displayedAccidentals: Array<number>;
    forceMiddleNoteDirection: number;
    impliedTS: {
        beats: number;
        beatType: number;
    };
    lines: Array<number>;
    tieTo: DurationModel;

    get beats(): number {
        assert(false);
        return NaN;
    }
    set beats(n: number) {
        assert(false);
    }

    get notations() {
        return this._notes[0].notations;
    }

    set notations(m: C.MusicXML.Notations[]) {
        this._notes[0].notations = m;
        this.displayNotation = null;
    }

    get color() {
        return this._notes[0].color;
    }

    set color(c: string) {
        _.forEach(this._notes, n => {
            n.color = c;
        });
    }

    //////////////////////
    // I.4 C.MusicXML.* //
    //////////////////////

    _p_notes: MNote[];
    get _notes(): C.MusicXML.Note[] {
        return this._p_notes;
    }
    set _notes(notes: C.MusicXML.Note[]) {
        this.chord        = this.chord || [];
        this.chord.length = notes.length;

        for (var i = 0; i < notes.length; ++i) {
            if (!(notes[i] instanceof MNote)) {
                notes[i]  = new MNote(this, i, notes[i]);
            }
        }
        this._p_notes     = <any> notes;
    }

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    constructor(spec: C.IPitchDuration, annotated: boolean) {
        super(spec, annotated);

        // TODO: Remove this {
        var self : {[key:string]: any} = <any> this;
        var properties                 = [
            "count", "dots", "displayCount", "displayDots", "displayNotation", "isRest", "tuplet",
            "displayTuplet", "chord", "_notes"
        ];

        _.forEach(properties, setIfDefined);

        if (!this._p_notes) {
            this._p_notes = _.map(this.chord, (pitch, idx) => {
                return new MNote(this, idx, {
                    pitch: pitch
                });
            });
        }
        this.tie = this.tie;

        function setIfDefined(property: string) {
            if (spec.hasOwnProperty(property)) {
                self[property]  = <any> (<any>spec)[property];
            }
        }
        // }
    }

    modelDidLoad(body: Array<Model>, idx: number) {
        for (var i = 0; i < this.chord.length; ++i) {
            if (this.chord[i].temporary) {
                this.chord.splice(i, 1);
                if (this._p_notes && i < this._p_notes.length) {
                    this._p_notes.splice(i, 1);
                }
            }
        }
    }

    recordMetreDataImpl(mctx: C.MetreContext) {
        // We require attributes to know the number of divisions.
        if (!mctx.attributes) {
            throw new AttributesModel.AttributesUndefinedException();
        }

        if (!this.chord.length && !this._p_notes.length) {
            this.isRest = true;
            assert(this.chord.length);
        }
        if (this.chord.length !== this._p_notes.length) {
            // The _notes setter updates chord, so unless this has just been created,
            // this branch means that this.chord was modified.
            // Note: the chord property should be a getter and setter, and should update
            // it auto-magically. Otherwise, you'll get mismatched properties.
            var notes: MNote[]  = this._p_notes;
            for (var i = 0; i < this.chord.length; ++i) {
                if (!(notes[i] instanceof MNote)) {
                    notes[i]    = new MNote(this, i, notes[i] || {
                        pitch:  this.chord[i],
                        dots:   this.dots,
                        count:  this.count
                    }, false /* Don't update parent */);
                }
            }
            notes.length        = this.chord.length;
            this._p_notes       = <any> notes;
        }


        // FIXME: The ACTUAL duration is this._notes[0].duration / mctx.attributes.divisions * 4...
        assert(this._count === this._notes[0].noteType.duration);

        // Guess bar and beat (annotation could add rests and shift it!)
        this.ctxData = new C.MetreContext(mctx);
        assert(isFinite(this._count));

        this._beats = this.calcBeats(mctx, null, true);
        assert(isFinite(this._beats) && this._beats !== null);
        mctx.bar += Math.floor((mctx.beat + this._beats) / mctx.ts.beats);
        mctx.beat = (mctx.beat + this._beats) % mctx.ts.beats;

        Metre.correctRoundingErrors(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        var i: number;
        var j: number;

        // A key signature must exist on each line;
        // The key signature ensures a clef exists.
        if (!ctx.attributes.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }

        // A time signature must exist on the first line of every page.
        this.impliedTS = ctx.ts;
        if (!this.impliedTS) {
            return TimeSignatureModel.createTS(ctx);
        }

        assert(this._beats !== null, "Unknown beat count");

        this.isWholebar = this._beats === ctx.ts.beats;

        // Make sure the bar is not overfilled. Multi-bar rests are okay.
        if (ctx.isBeam || !this.inBeam) {
            if (this._beats > ctx.ts.beats && ctx.beat >= ctx.ts.beats) {
                // The current note/rest is multi-bar, which is allowed. However, multi-bar rests must
                // start at beat 0.
                return BarlineModel.createBarline(ctx, C.MusicXML.BarStyleType.Regular);
            } else if (!this.isMultibar) {
                // The number of beats in a bar must not exceed that specified by the time signature.
                if (ctx.beat + this._beats > ctx.ts.beats) {
                    var overfill = ctx.beat + this._beats - ctx.ts.beats;
                    if (this._beats === overfill) {
                        var ret = BarlineModel.createBarline(ctx, C.MusicXML.BarStyleType.Regular);
                        return ret;
                    } else {
                        var replaceWith = Metre.subtract(this, overfill, ctx).map(t =>
                            new DurationModel(<any>t, true));
                        var addAfterBar = Metre.subtract(this, this._beats - overfill, ctx)
                            .map(t => new DurationModel(<any>t, true));
                        for (i = 0; i < replaceWith.length; ++i) {
                            replaceWith[i].chord = this.chord ? C.JSONx.clone(this.chord) : null;
                            if ((i + 1 !== replaceWith.length || addAfterBar.length) && !this.isRest) {
                                replaceWith[i].tie = true;
                            }
                        }
                        for (i = 0; i < addAfterBar.length; ++i) {
                            addAfterBar[i].chord = this.chord ? C.JSONx.clone(this.chord) : null;
                            if (i + 1 !== addAfterBar.length && !this.isRest) {
                                addAfterBar[i].tie = true;
                            }
                        }
                        BarlineModel.createBarline(ctx, C.MusicXML.BarStyleType.Regular);
                        ctx.splice(ctx.idx, 0, replaceWith, Annotator.SplicePolicy.ShortenOtherParts);
                        ctx.splice(ctx.idx + 1 + replaceWith.length, 1, addAfterBar, Annotator.SplicePolicy.ShortenOtherParts);
                        return C.IterationStatus.RetryLine;
                    }
                }

                // Check rhythmic spelling
                var status = Metre.rhythmicSpellcheck(ctx);
                if (status !== C.IterationStatus.Success) { return status; }
            }

            // All notes, chords, and rests throughout a line on a given part must have the same scale.
            assert(isFinite(this._beats) && this._beats !== null);
            if (ctx.smallest > this._beats) {
                ctx.smallest = this._beats;
                return C.IterationStatus.RetryLine;
            }

            // Each note's width has a linear component proportional to the log of its duration.
            this.extraWidth = (Math.log(this._beats) - Math.log(ctx.smallest)) /
                C.log2 / 3 * 40;

            // The width of a line must not exceed that specified by the page layout.
            if ((ctx.x + this.getWidth(ctx) > ctx.maxX)) {
                return NewlineModel.createNewline(ctx);
            }
        }

        // Beams must follow the beam patterns
        if (!ctx.isBeam && this.hasFlagOrBeam && !this.perfectlyBeamed(ctx)) {
            var b = DurationModel.BEAMDATA;
            DurationModel.BEAMDATA = null;

            while (_.any(b, (b) => b.inBeam)) {
                j = b[0].idx;
                while (ctx.body[j].inBeam) {
                    --j;
                }
                while(ctx.body[j].type !== C.Type.BeamGroup) {
                    ++j;
                }
                var isInPast = j <= ctx.idx;
                ctx.removeFollowingBeam(j - 1, isInPast);
                // This is kind of gross, but hey.
                ctx.idx = j;
            }

            _.each(b, function (b: DurationModel) {
                b.inBeam = true;
            });
            var BeamGroupModel: typeof BeamGroupModelType = require("./beamGroup");
            BeamGroupModel.createBeam(ctx, b);
            return C.IterationStatus.RetryLine;
        }

        // The document must end with a marker.
        if (!ctx.next()) {
            ctx.insertFuture(new EndMarkerModel({endMarker: true}, true));
        }

        // Middle note directions are set by surrounding notes.
        if (DurationModel.getAverageLine(this, ctx) === 3) {
            this.forceMiddleNoteDirection = this.calcMiddleNoteDirection(ctx);
        } else {
            this.forceMiddleNoteDirection = NaN;
        }

        // Copy information the view needs from the context.
        this.lines = DurationModel.getLines(this, ctx);
        assert(this.lines);
        assert(_.forEach(this.lines, l => isFinite(l)));

        if (!ctx.isBeam) {
            ctx.beat = (ctx.beat || 0) + this._beats;
            Metre.correctRoundingErrors(ctx);
        }

        if (!ctx.isBeam && this.inBeam) {
            // this.x = Math.max(this.x, ctx.x);
            ctx.x = this.x + this.getWidth(ctx);
            this._handleTie(ctx);
            return C.IterationStatus.Success;
        } else if (!this.inBeam) {
            this._handleTie(ctx);
        }

        this.x = ctx.x;

        // Set which accidentals are displayed, and then update the accidentals currently
        // active in the bar.
        this._displayedAccidentals = this.getDisplayedAccidentals(ctx);
        for (i = 0; i < this.chord.length; ++i) {
            // Set the octave specific accidental
            ctx.accidentalsByStave[ctx.currStaveIdx][this.chord[i].step + this.chord[i].octave] = this.chord[i].alter;
            // If needed, invalidate the default accidental
            if ((ctx.accidentalsByStave[ctx.currStaveIdx][this.chord[i].step]||null) !== this.chord[i].alter) {
                ctx.accidentalsByStave[ctx.currStaveIdx][this.chord[i].step] = C.InvalidAccidental;
            }
        }

        ctx.x += this.getWidth(ctx);
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");

        return C.IterationStatus.Success;
    }

    ///////////////
    // III. Util //
    ///////////////

    getWidth(ctx: Annotator.Context) {
        var width = 22.8 + (this.extraWidth || 0) + (this._displayedAccidentals ? 9.6 : 0);
        assert(isFinite(width));
        return width;
    }

    calcBeats(ctx: C.MetreContext, inheritedCount?: number, force?: boolean) {
        if (!force && this._beats) {
            return this._beats;
        }
        return Metre.calcBeats2(this, ctx, inheritedCount);
    }

    containsAccidentalAfterBarline(ctx: Annotator.Context, previewMode?: C.PreviewMode) {
        var nonAccidentals = C.NoteUtil.getAccidentals(ctx.attributes.keySignature);
        var pitches: Array<C.IPitch> = this.chord;
        for (var i = 0; i < pitches.length; ++i) {
            if ((nonAccidentals[pitches[i].step]||0) !== (pitches[i].alter||0)) {
                return true;
            }
            // Make sure there's no ambiguity from the previous note 
            var prevNote = ctx.prev(c => c.isNote && !c.isRest);
            if (prevNote) {
                if (_hasConflict(prevNote.note.chord, pitches[i].step, nonAccidentals[pitches[i].step]||null)) {
                    return true;
                }
            }
        }

        return false;
    }
    perfectlyBeamed(ctx: Annotator.Context) {
        if (this.tuplet) {
            var prevNote = ctx.prev(c => c.isNote || c.endMarker);
            if (prevNote && prevNote.isNote && prevNote.note.tuplet) {
                return true;
            }
        }
        var rebeamable = Metre.rebeamable(ctx.idx, ctx);

        // Sanity check to make sure the replacement isn't the same as the current.
        var prevBeamMaybe = ctx.prev(m => m.type === C.Type.BeamGroup || m.type === C.Type.Barline, 0 /* no offset, look from current */);
        if (rebeamable && prevBeamMaybe && prevBeamMaybe.type === C.Type.BeamGroup) {
            var thisBeam = prevBeamMaybe.beam;
            if (thisBeam.length === rebeamable.length) {
                var isValid = true;
                for (var i = 0; i < thisBeam.length; ++i) {
                    if (thisBeam[i] !== rebeamable[i]) {
                        isValid = false;
                        break;
                    }
                }
                if (isValid) {
                    return true;
                }
            }
        }

        if (rebeamable) {
            DurationModel.BEAMDATA = rebeamable;
        }
        return !rebeamable;
    }

    calcMiddleNoteDirection(ctx: Annotator.Context) {
        var prevLine: number = ctx.prev() && ctx.prev().isNote ?
                DurationModel.getAverageLine(ctx.prev().note, ctx) : null;
        var nextLine: number = ctx.next() && ctx.next().isNote ?
                DurationModel.getAverageLine(ctx.next().note, ctx) : null;

        if ((nextLine !== null) && ctx.beat + this._beats +
                Metre.calcBeats2(ctx.next().note, ctx, this.count) > ctx.ts.beats) {
            // Barlines aren't inserted yet.
            nextLine = null;
        }

        if (ctx.prev() && (<DurationModel>ctx.prev()).forceMiddleNoteDirection) {
            prevLine -= (<DurationModel>ctx.prev()).forceMiddleNoteDirection;
        }

        var check: number;
        if (prevLine === null && nextLine === null) {
            this.forceMiddleNoteDirection = -1;
        } else if (prevLine === null) {
            check = nextLine;
        } else if (nextLine === null) {
            check = prevLine;
        } else {
            var startsAt = ctx.beat;
            var endsAt = ctx.beat + this._beats;

            if (Math.floor(startsAt) === Math.floor(endsAt)) {
                check = nextLine;
            } else if (Math.floor(startsAt) !== startsAt) {
                // XXX: ASSUMES no divisions mid-beat
                check = prevLine;
            } else if (startsAt >= ctx.ts.beats/2) {
                // XXX: ASSUMES 4/4 !!!
                check = nextLine;
            } else {
                check = prevLine;
            }
        }

        return (check === undefined || check >= 3) ? -1 : 1;
    }

    private getDisplayedAccidentals(ctx: Annotator.Context) {
        return this.getAccidentals(ctx, true);
    }
    private getAccidentals(ctx: Annotator.Context, display?: boolean) {
        var chord: Array<C.IPitch> = this.chord || <any> [this];
        var result = new Array(chord.length || 1);
        function or3(first: number, second: number, third?: number) {
            if (third === undefined) {
                third = null;
            }
            var a = first === null || first === undefined || first !== first ? second : first;
            return a == null || a === undefined || a !== a ? third : a;
        };
        for (var i = 0; i < result.length; ++i) {
            var pitch: C.IPitch = chord[i];
            var actual = or3(display ? pitch.displayAlter : null, pitch.alter);
            assert(actual !== undefined);
            var generalTarget = or3(ctx.accidentalsByStave[ctx.currStaveIdx][pitch.step], null);
            var target = or3(ctx.accidentalsByStave[ctx.currStaveIdx][pitch.step + pitch.octave], null);
            if (!target && generalTarget !== C.InvalidAccidental) {
                target = generalTarget;
            }

            if (actual === target) {
                // We don't need to show an accidental if all of these conditions are met:

                // 1. The note has the same accidental on other octave (if the note is on other octaves)
                var noConflicts = target === generalTarget || generalTarget === C.InvalidAccidental;

                // 2. The note has the same accidental on all other part (in the same bar, in the past)
                for (var j = 0; j < ctx.accidentalsByStave.length && noConflicts; ++j) {
                    if (ctx.accidentalsByStave[j] && target !== or3(ctx.accidentalsByStave[j][pitch.step + pitch.octave],
                            ctx.accidentalsByStave[j][pitch.step], target)) {
                        noConflicts = false;
                    }
                }

                // 3. The note has the same accidental on other part with the same note(right now!)
                var concurrentNotes = ctx.findVertical(c => c.isNote);
                for (var j = 0; j < concurrentNotes.length && noConflicts; ++j) {
                    var otherChord = concurrentNotes[j].note.chord;
                    noConflicts = noConflicts && !_hasConflict(otherChord, pitch.step, target);
                }

                // 4. Ambiguity could not be caused by being directly after a barline
                var prevBarOrNote = ctx.prev(c => c.isNote && !c.isRest || c.type === C.Type.Barline);
                if (prevBarOrNote && prevBarOrNote.type === C.Type.Barline) {
                    var prevNote = ctx.prev(c => c.isNote && !c.isRest);
                    if (prevNote) {
                        noConflicts = noConflicts && !_hasConflict(prevNote.note.chord, pitch.step, target);
                    }
                }

                if (noConflicts) {
                    result[i] = NaN; // no accidental
                    continue;
                } else {
                    // XXX: Otherwise, the note should be in parentheses
                }
            }

            if (!actual) {
                ctx.accidentalsByStave[ctx.currStaveIdx][pitch.step] = undefined;
                result[i] = 0; // natural
                continue;
            }

            assert(actual !== C.InvalidAccidental, "Accidental is invalid");
            result[i] = actual;
        }
        return result;
    }

    private _handleTie(ctx: Annotator.Context) {
        if (this.tie) {
            var nextNote = ctx.next(obj => obj.isNote);
            if (!nextNote || nextNote.isRest) {
                this.tie = false;
                this.tieTo = null;
            } else {
                this.tieTo = <DurationModel> nextNote;
            }
        } else {
            this.tieTo = null;
        }
    }

    getAccWidth(ctx: Annotator.Context) {
        var accWidth: number = 0;
        var accTmp: any = this.getAccidentals(ctx);
        if (accTmp) {
            var acc: Array<number> = (accTmp instanceof Array) ? accTmp : [accTmp];
            var max = _.reduce(acc, (memo: number, t: number) =>
                Math.max(Math.abs(t || 0), memo), 0);
            accWidth = max*6;
        }
        return Math.max(0, accWidth - 12);
    }

    ////////////////
    // IV. Static //
    ////////////////

    static BEAMDATA: Array<DurationModel>;

    static clefOffsets: { [key: string]: number } = {
        G: -3.5,
        F: 2.5,
        C: -0.5
    };

    static chromaticScale: { [key: string]: number } = {
        c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11
    }; // c:12

    static countToFlag: { [key: string]: string } = {
        8: "flag8th",
        16: "flag16th",
        32: "flag32nd",
        64: "flag64th",
        128: "flag128th",
        256: "flag256th",
        512: "flag512th",
        1024: "flag1024th"
    };

    static countToHasStem: { [key: string]: boolean } = {
        0.25: true,
        0.5: false,
        1: false,
        2: true,
        4: true,
        8: true,
        16: true,
        32: true,
        64: true,
        128: true,
        256: true,
        512: true,
        1024: true
    };

    static countToIsBeamable: { [key: string]: boolean } = {
        8: true,
        16: true,
        32: true,
        64: true,
        128: true,
        256: true,
        512: true,
        1024: true
    };

    static countToNotehead: { [key: number]: string } = {
        9992: "noteheadDoubleWhole",
        9991: "noteheadDoubleWhole",
        9990: "noteheadDoubleWhole",
        1: "noteheadWhole",
        2: "noteheadHalf",
        4: "noteheadBlack",
        8: "noteheadBlack",
        16: "noteheadBlack",
        32: "noteheadBlack",
        64: "noteheadBlack",
        128: "noteheadBlack",
        256: "noteheadBlack",
        512: "noteheadBlack",
        1024: "noteheadBlack"
    };

    static countToRest: { [key: number]: string } = {
        9992: "restLonga",
        9991: "restLonga",
        9990: "restDoubleWhole",
        1: "restWhole",
        2: "restHalf",
        4: "restQuarter",
        8: "rest8th",
        16: "rest16th",
        32: "rest32nd",
        64: "rest64th",
        128: "rest128th",
        256: "rest256th",
        512: "rest512th",
        1024: "rest1024th"
    };

    static getAverageLine = (note: C.IPitchDuration, ctx: Annotator.Context) => {
        var lines = DurationModel.getLines(note, ctx, { filterTemporary: true });
        var sum = 0;
        for (var i = 0; i < lines.length; ++i) {
            sum += lines[i] / lines.length;
        }
        return sum;
    };

    static getLine = (pitch: C.IPitch,
            ctx: Annotator.Context, options?: { filterTemporary: boolean }): number => {
        options = options || {filterTemporary: false};

        if (pitch.isRest) {
            return 3;
        }

        if (!ctx) {
            assert(pitch.line !== undefined,
                    "Must be first annotated in duration.jsx");
            return pitch.line;
        }
        assert(ctx.attributes.clef, "A clef must be inserted before the first note");
        return DurationModel.clefOffsets[ctx.attributes.clef.sign] +
            (pitch.octave || 0) * 3.5 + DurationModel.pitchOffsets[pitch.step];
    };

    static getLines = (note: C.IPitchDuration,
            ctx: Annotator.Context, options?: { filterTemporary: boolean }): Array<number> => {
        options = options || {filterTemporary: false};
        var ret: Array<number> = [];
        for (var i = 0; i < note.chord.length; ++i) {
            if (!options.filterTemporary || !note.chord[i].temporary) {
                ret.push(note.isRest ? 3 :
                    DurationModel.clefOffsets[ctx.attributes.clef.sign] +
                    (note.chord[i].octave || 0) * 3.5 +
                    DurationModel.pitchOffsets[note.chord[i].step]);
            }
        }
        for (var i = 0; i < ret.length; ++i) {
            assert(!isNaN(ret[i]));
        }
        return ret;
    };

    static getPitch = (line: number, ctx: Annotator.Context) => {
        assert(ctx.attributes.clef, "A clef must be inserted before the first note");
        var pitch = DurationModel.offsetToPitch[((
                line - DurationModel.clefOffsets[ctx.attributes.clef.sign]) % 3.5 + 3.5) % 3.5];
        var octave = Math.floor((line - DurationModel.clefOffsets[ctx.attributes.clef.sign]) / 3.5);
        var alter = ctx.accidentalsByStave[ctx.currStaveIdx][pitch + octave] ||
            ctx.accidentalsByStave[ctx.currStaveIdx][pitch] || null;

        return {
            step: DurationModel.offsetToPitch[((
                line - DurationModel.clefOffsets[ctx.attributes.clef.sign]) % 3.5 + 3.5) % 3.5],
            octave: octave,
            alter: alter === C.InvalidAccidental ? null : alter
        };
    };

    static offsetToPitch: { [key: string]: string } = {
        0: "c",
        0.5: "d",
        1: "e",
        1.5: "f",
        2: "g",
        2.5: "a",
        3: "b"
    };

    static pitchOffsets: { [key: string]: number } = {
        c: 0,
        d: 0.5,
        e: 1,
        f: 1.5,
        g: 2,
        a: 2.5,
        b: 3
    };
}

class MNote implements C.MusicXML.NoteComplete {
    /* Parent */
    _parent: DurationModel;
    _idx : number;

    constructor(parent: DurationModel, idx: number, note: C.MusicXML.Note, updateParent: boolean = true) {
        var self : {[key:string]: any} = <any> this;

        /* Link to parent */
        this._parent            =   parent;
        this._idx               =   idx;

        /* Properties owned by parent */
        if (updateParent) {
            parent.chord[idx]   =   note.pitch;
            parent.dots         =  (note.dots || []).length;
            parent.isRest       = !!note.rest || parent.isRest;
            parent.count        =   note.noteType ? note.noteType.duration : (parent.count || 4);

            parent.tuplet       =   note.timeModification ? {
                num:                note.timeModification.normalNotes.count,
                den:                note.timeModification.actualNotes.count
            }                           : parent.tuplet;
        }

        /* Properties owned by MNote */
        var properties          = [
            "unpitched", "noteheadText", "accidental", "instrument",
            "attack", "endDynamics", "lyrics", "notations", "stem", "cue", "ties", "dynamics", "duration",
            "play", "staff", "grace", "notehead", "release", "beams", "voice", "footnote", "level",
            "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight", "fontStyle", "fontSize",
            "color", "printDot", "printLyric", "printObject", "printSpacing", "timeOnly" ];

        _.forEach(properties, setIfDefined);

        function setIfDefined(property: string) {
            if (note.hasOwnProperty(property)) {
                self[property]  = <any> (<any>note)[property];
            }
        }
    }

    /* JSON */
    toJSON(): {} {
        var clone: {[key: string]: any} = {};

        /* Properties owned by parent */
        if (this.pitch) {
            clone["pitch"]              = this.pitch;
        }
        if (this.rest) {
            clone["rest"]               = this.rest;
        }
        if (this.chord) {
            clone["chord"]              = this.chord;
        }
        if (this.color) {
            clone["color"]              = this.color;
        }
        if (this.noteType) {
            clone["noteType"]           = this.noteType;
        }
        if (this.timeModification) {
            clone["timeModification"]   = this.timeModification;
        }

        /* Properties owned by MNote */
        for (var key in this) {
            if (this.hasOwnProperty(key) && key[0] !== "_" && !!(<any>this)[key]) {
                clone[key] = (<any>this)[key];
            }
        }
        return clone;
    }

    /* C.MusicXML.Note */

    /* C.MusicXML.Note > Core */
    get chord(): C.MusicXML.Chord {
        return this._idx + 1 !== this._parent.chord.length;
    }


    get pitch(): C.MusicXML.Pitch {
        return this._parent.isRest ? null : this._parent.chord[this._idx ];
    }
    set pitch(pitch: C.MusicXML.Pitch) {
        this._parent.chord[this._idx ].alter  = pitch.alter;
        this._parent.chord[this._idx ].step   = pitch.step;
        this._parent.chord[this._idx ].octave = pitch.octave;
    }

    get rest(): C.MusicXML.Rest {
        // TODO: full measure
        // TODO: display step
        // TODO: display octave
        return this._parent.isRest ? {
            measure: this._parent.isWholebar,
            displayStep: null, // TODO
            displayOctave: null
        } : null;
    }
    set rest(rest: C.MusicXML.Rest) {
        this._parent.isRest = !!rest;
    }

    get dots(): C.MusicXML.Dot[] {
        return _.times(this._parent.dots, idx => <C.MusicXML.Dot> {
            // TODO: save/restore dot formatting
            // TODO: display dot formatting
        });
    }
    set dots(dots: C.MusicXML.Dot[]) {
        this._parent.dots = dots.length;
    }

    get noteType(): C.MusicXML.Type {
        return {
            duration: this._parent.count,
            size: C.MusicXML.SymbolSize.Full // TODO: grace, cue
        };
    }

    set noteType(type: C.MusicXML.Type) {
        // TODO: grace, cue
        this._parent.count = type.duration;
    }

    get timeModification(): C.MusicXML.TimeModification {
        return this._parent.tuplet ? {
            normalNotes: {
                count:      this._parent.tuplet.num
            },
            actualNotes: {
                count:      this._parent.tuplet.den
            },
            normalDots:     [],
            normalType:     "eighth"    // MXFIX
        } : null;
    }

    set timeModification(tm: C.MusicXML.TimeModification) {
        // TODO: normalDots
        // TODO: normalType
        this._parent.tuplet = {
            num: tm.normalNotes.count,
            den: tm.actualNotes.count
        };
    }

    /* C.MusicXML.Note > Extended */
    unpitched:          C.MusicXML.Unpitched;
    noteheadText:       C.MusicXML.NoteheadText;
    accidental:         C.MusicXML.Accidental;
    instrument:         C.MusicXML.Instrument;
    attack:             number;
    endDynamics:        number;
    lyrics:             C.MusicXML.Lyric[];
    notations:          C.MusicXML.Notations[];
    stem:               C.MusicXML.Stem;
    cue:                C.MusicXML.Cue;
    duration:           number;                     // Currently ignored! We just use the note appearance for timing!
    ties:               C.MusicXML.Tie[];
    dynamics:           number;
    play:               C.MusicXML.Play;
    staff:              C.MusicXML.Staff;
    grace:              C.MusicXML.Grace;
    notehead:           C.MusicXML.Notehead;
    release:            number;
    beams:              C.MusicXML.Beam[];


    /* C.MusicXML.PrintStyle */

    /* C.MusicXML.PrintStyle >> EditorialVoice */
    voice:              string;
    footnote:           C.MusicXML.Footnote;
    level:              C.MusicXML.Level;

    /* C.MusicXML.PrintStyle >> Position */
    get defaultX(): number {
        return this._parent.x;
    }
    relativeY:          number;
    defaultY:           number;
    relativeX:          number;

    /* C.MusicXML.PrintStyle >> Font */
    fontFamily:         string;
    fontWeight:         C.MusicXML.NormalBold;
    fontStyle:          C.MusicXML.NormalItalic;
    fontSize:           string;

    /* C.MusicXML.PrintStyle >> Color */
    get color(): string {
        var hex = this._color.toString(16);
        return "#" + "000000".substr(0, 6 - hex.length) + hex;
    }
    set color(a: string) {
        switch(true) {
            case !a:
                this._color = 0;
                break;
            case a[0] === "#":
                a = a.slice(1);
                // passthrough
            default:
                this._color = parseInt(a, 16);
                break;
        }
    }


    /* C.MusicXML.Printout */
    printDot:           boolean;
    printLyric:         boolean;

    /* C.MusicXML.Printout >> PrintObject */
    printObject:        boolean;

    /* C.MusicXML.Printout >> PrintSpacing */
    printSpacing:       boolean;


    /* C.MusicXML.TimeOnly */
    timeOnly:           boolean;


    private _color:     number = 0x000000;
}

function _hasConflict(otherChord: Array<C.IPitch>, pitch: string, target: number) {
    "use strict";
    for (var k = 0; k < otherChord.length; ++k) {
        if (otherChord[k].step === pitch && otherChord[k].alter !== target) {
            return true;
        }
    }
    return false;
}

enum Flags {
    TEMPORARY   = 2 << 7,
    WHOLE_BAR   = 2 << 8,
    TIE         = 2 << 9
}

export = DurationModel;
