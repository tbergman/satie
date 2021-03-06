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

import _                    = require("lodash");
import assert               = require("assert");

import Annotator            = require("./annotator");
import AttributesModel      = require("./attributes");
import BarlineModel         = require("./barline");
import BeamGroupModelType   = require("./beamGroup");       // Cyclic
import C                    = require("./contracts");
import EndMarkerModel       = require("./endMarker");
import FontMetrics          = require("../util/fontMetrics");
import KeySignatureModel    = require("./keySignature");
import Metre                = require("./metre");
import TimeSignatureModel   = require("./timeSignature");

/**
 * A DurationModel represents 0 (for a rest), 1, or more (for a chord) pitches that occur at
 * the same time in the same part and voice.
 * 
 * DurationModel exposes two APIs, one simple, and one full-featured and MusicXML.Note-compliant.
 * To access the simple API, see DurationModel.chord, and convenience properties such as "rest".
 * To access the MusicXML-compliant API, see DurationModel._notes.
 * 
 * Note that MusicXML "chords" do not need to all have the same duration. In Ripieno they must all
 * have the same duration.
 */
class DurationModel extends Model implements C.IPitchDuration {

    /*---- I.1 Model ----------------------------------------------------------------------------*/

    get fields()                            { return [ "_notes", "dots" ]; }
    get visible()                           { return !this.inBeam && !this.soundOnly; }
    get isNote():  boolean                  { return true; }
    get note():    C.IPitchDuration         { return this; }
    get type()                              { return C.Type.Duration; }
    get xPolicy()                           { return C.RectifyXPolicy.Min; }

    /*---- I.2 C.IPitchDuration -----------------------------------------------------------------*/

    chord: C.IPitch[];
    get isRest() {
        return (this.chord && this.chord.length === 1 && this.chord[0].step === "R");
    }

    set isRest(r: boolean) {
        if (!!r) {
            this.chord = [{
                step: "R",
                alter: null,
                octave: null
            }];
            this.tieds = [null];
        } else {
            assert(!this.isRest, "Instead, set the exact pitch or chord...");
        }
    }

    get tieds(): C.MusicXML.Tied[] {
        // Ignores all but the first.
        return _.chain(this._p_notes)
            .map(n => n.notationObj.tieds)
            .map(t => t && t.length ? t[0] : null)
            .value();
    }
    set tieds(v: C.MusicXML.Tied[]) {
        _.forEach(this._p_notes, (n, i) => {
            if (v[i]) {
                n.ensureNotationsWrittable();
                n.notationObj.tieds = [v[i]];
            } else {
                delete n.notationObj.tieds;
            }
        });
        // TODO: Also update sound (ties)
    }

    get isWholebar(): boolean   { return    this._getFlag(Flags.WHOLE_BAR); }
    set isWholebar(v: boolean)  {           this._setFlag(Flags.WHOLE_BAR, v); }

    accToDelete: number;

    /*---- I.2.1 C.IDuration --------------------------------------------------------------------*/

    get count() {
        return this._count;
    }

    set count(n: C.MusicXML.Count) {
        assert(!isNaN(n));
        this._count = n;
        this._divisions = null; // Kill optimizer.
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

    set tuplet(t: C.MusicXML.TimeModification) {
        this._tuplet            = t;
        this._displayTuplet     = null;
    }

    get displayTuplet() {
        return this._displayTuplet || this._tuplet;
    }

    set displayTuplet(t: C.MusicXML.TimeModification) {
        this._displayTuplet     = t;
    }

    get hasFlagOrBeam() {
        return !!this.tuplet || !this.isRest && DurationModel.countToIsBeamable[this.count];
    }

    get temporary(): boolean    { return    this._getFlag(Flags.TEMPORARY); }
    set temporary(v: boolean)   {           this._setFlag(Flags.TEMPORARY, v); }

    /*---- I.3 Duration -------------------------------------------------------------------------*/

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

    get noteheadGlyph() {
        return DurationModel.countToNotehead[this.displayCount];
    }

    continuingNotations: DurationModel.IContinuingNotation[];

    get restHead() {
        if (!isNaN(this.multiRest)) {
            // TODO: MusicXML useSymbol if specified
            // TODO: Old style multi-measure rests
            // TODO: SMuFL says we're supposed to draw HBars ourselves...
            return "restHBar";
        }
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
    _divisions: number;
    private _count: C.MusicXML.Count;
    private _displayCount: number;
    private _displayDots: number;
    private _displayTuplet: C.MusicXML.TimeModification;
    private _tuplet: C.MusicXML.TimeModification;

    _displayedAccidentals: Array<number>;
    forceMiddleNoteDirection: number;
    lines: Array<number>;
    tieTo: DurationModel;

    get divisions(): number {
        assert(isFinite(this._divisions));  // Not valid before metre has been recorded.
        return this._divisions;
    }
    set divisions(n: number) {
        assert(false, "Read-only property.");
    }

    get color() {
        return this._notes[0].color;
    }

    set color(c: string) {
        _.forEach(this._notes, n => {
            n.color = c;
        });
    }

    /*---- I.4 C.MusicXML.* ---------------------------------------------------------------------*/

    _p_notes: DurationModel.MXMLNote[];
    get _notes(): C.MusicXML.Note[] {
        return this._p_notes;
    }
    set _notes(notes: C.MusicXML.Note[]) {
        this.chord        = this.chord || [];
        this.chord.length = notes.length;

        for (var i = 0; i < notes.length; ++i) {
            if (!(notes[i] instanceof DurationModel.MXMLNote)) {
                notes[i]  = new DurationModel.MXMLNote(this, i, notes[i]);
            }
        }
        this._p_notes     = <any> notes;
    }

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: C.IPitchDuration, annotated: boolean) {
        super(spec, annotated);

        // TODO: Remove this {
        var self : {[key:string]: any} = <any> this;
        var properties                 = [
            "count", "dots", "displayCount", "displayDots", "isRest", "tuplet",
            "displayTuplet", "chord", "_notes"
        ];

        _.forEach(properties, setIfDefined);

        if (!this._p_notes) {
            this._p_notes = _.map(this.chord, (pitch, idx) => {
                return new DurationModel.MXMLNote(this, idx, {
                    pitch: pitch
                });
            });
        }
        if (spec.tieds) {
            this.tieds = spec.tieds;
        }

        function setIfDefined(property: string) {
            if (spec.hasOwnProperty(property)) {
                self[property]  = <any> (<any>spec)[property];
            }
        }
        // }
    }

    modelDidLoad(body: Array<Model>, idx: number) {
        for (var i = 0; i < this.chord.length; ++i) {
            if (!this.chord[i]) {
                this.isRest = true;
                break;
            }
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
            var notes: DurationModel.MXMLNote[]  = this._p_notes;
            for (var i = 0; i < this.chord.length; ++i) {
                if (!(notes[i] instanceof DurationModel.MXMLNote)) {
                    notes[i]    = new DurationModel.MXMLNote(this, i, notes[i] || {
                        pitch:  this.chord[i],
                        dots:   this.dots,
                        count:  this.count
                    }, false /* Don't update parent */);
                }
            }
            notes.length        = this.chord.length;
            this._p_notes       = <any> notes;
        }

        // Performance data is in ctx._notes[0].duration / mctx.attributes.divisions * 4...
        // We only use it if we have to.
        if (!isFinite(this._count)) {
            this._implyDurationFromPerformanceData(mctx);
        }

        assert(this._count === this._notes[0].noteType.duration);

        // Guess bar and beat (annotation could add rests and shift it!)
        this.ctxData = new C.MetreContext(mctx);
        assert(isFinite(this._count));

        this._divisions = this.calcDivisions(mctx, null, true);
        if (!this._notes[0].grace) {
            assert(isFinite(this._divisions) && this._divisions !== null);
            mctx.bar += Math.floor((mctx.division + this._divisions) / (mctx.ts.beats*mctx.attributes.divisions));
            mctx.division = (mctx.division + this._divisions) % (mctx.ts.beats*mctx.attributes.divisions);
        }
    }

    multiRest: number;

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        var i: number;
        var j: number;

        /*---- Check context ------------------------------------------------*/

        // A key signature must exist on each line;
        // The key signature ensures a clef exists.
        if (!ctx.attributes.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }

        // A time signature must exist on the first line of every page.
        if (!ctx.ts) {
            return TimeSignatureModel.createTS(ctx);
        }

        if (ctx.attributes && !ctx.attributes.clefs[this.staff - 1]) {
            ctx.part.containsVoice[ctx._voices.length] = true;
            var ret = Annotator.initVoice(ctx._voices, ctx._voices.length);
            return ret;
        }

        // Get the measureStyle owned by the most recent attribute...
        var measureStyle: C.MusicXML.MeasureStyle = (<any>ctx.attributes)._measureStyle;
        // ... and use it to sync multi rest attributes.
        delete this.multiRest;
        if (measureStyle && !ctx.invisibleForBars) { // Either 0 or undefined
            if (measureStyle.multipleRest && measureStyle.multipleRest.count > 1) {
                var lastPotentialNote = ctx.prev(c => c.priority === C.Type.Duration || c.priority === C.Type.Attributes);
                if (lastPotentialNote.priority !== C.Type.Duration) {
                    this.multiRest = measureStyle.multipleRest.count;
                }
            }
        }

        assert(this._divisions !== null, "Unknown beat count");

        this.isWholebar = this._divisions === -1 || this._divisions === ctx.ts.beats * ctx.attributes.divisions;

        // Make sure the bar is not overfilled.
        if (ctx.isBeam || !this.inBeam) {
            // The number of beats in a bar must not exceed that specified by the time signature.
            if (!this._notes[0].grace && ctx.division + this._divisions > ctx.ts.beats * ctx.attributes.divisions) {
                var overfill = ctx.division + this._divisions - ctx.ts.beats * ctx.attributes.divisions;
                if (this._divisions === overfill) {
                    var ret = BarlineModel.createBarline(ctx, C.MusicXML.BarStyleType.Regular);
                    return ret;
                } else {
                    var replaceWith = Metre.subtract(this, overfill, ctx).map(t =>
                        new DurationModel(<any>t, true));
                    var addAfterBar = Metre.subtract(this, this._divisions - overfill, ctx)
                        .map(t => new DurationModel(<any>t, true));
                    for (i = 0; i < replaceWith.length; ++i) {
                        replaceWith[i].chord = this.chord ? C.JSONx.clone(this.chord) : null;
                        if ((i + 1 !== replaceWith.length || addAfterBar.length) && !this.isRest) {
                            replaceWith[i].tieds = this.chord.map(c => {
                                return {
                                    type: C.MusicXML.StartStopContinue.Start
                                };
                            });
                        }
                    }
                    for (i = 0; i < addAfterBar.length; ++i) {
                        addAfterBar[i].chord = this.chord ? C.JSONx.clone(this.chord) : null;
                        if (i + 1 !== addAfterBar.length && !this.isRest) {
                            replaceWith[i].tieds = this.chord.map(c => {
                                return {
                                    type: C.MusicXML.StartStopContinue.Start
                                };
                            });
                        }
                    }
                    BarlineModel.createBarline(ctx, C.MusicXML.BarStyleType.Regular);
                    ctx.splice(ctx.idx, 0, replaceWith, Annotator.SplicePolicy.ShortenOtherVoices);
                    ctx.splice(ctx.idx + 1 + replaceWith.length, 1, addAfterBar, Annotator.SplicePolicy.ShortenOtherVoices);
                    return C.IterationStatus.RetryLine;
                }
            }

            // Check rhythmic spelling
            var status = Metre.rhythmicSpellcheck(ctx);
            if (status !== C.IterationStatus.Success) { return status; }

            // All notes, chords, and rests throughout a line on a given voice must have the same scale.
            assert(isFinite(this._divisions) && this._divisions !== null);
            if (ctx.smallest * ctx.attributes.divisions > this._divisions) {
                assert(this._divisions > 0);
                ctx.smallest = this._divisions / ctx.attributes.divisions;
                return C.IterationStatus.RetryLine;
            }

            // Each note's width has a linear component proportional to the log of its duration.
            this.extraWidth = (Math.log(this._divisions) - Math.log(ctx.smallest * ctx.attributes.divisions)) /
                C.log2 / 3 * 40;
            if (this._notes[0].grace) {
                this.extraWidth /= 10; // FIXME: Ideally we have proper rythmic spacing within a grace part.
            }
        }

        // Beams must follow the beam patterns
        if (!this.engraved && !ctx.isBeam && this.hasFlagOrBeam && !this.perfectlyBeamed(ctx)) {
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
            ctx.insertFuture(new EndMarkerModel({endMarker: true}, true, this.engraved));
        }

        /*---- Set data needed for view -------------------------------------*/

        var maybePrev = ctx.prev(c => !c || c.isNote || c.priority === C.Type.Barline || c.type === C.Type.NewLine);
        if (maybePrev) {
            var space = this.x - maybePrev.x;
            if (maybePrev.isNote) {
                var p: DurationModel = <any>maybePrev;
                space -= p.getLyricWidth()/2;
            }
            ctx.x += Math.max(this.getLyricWidth()/2 - space, 0);
        }

        // Middle note directions are set by surrounding notes.
        if (DurationModel.getAverageLine(this, ctx) === 3) {
            this.forceMiddleNoteDirection = this.calcMiddleNoteDirection(ctx);
        } else {
            this.forceMiddleNoteDirection = NaN;
        }

        // Set lines
        this.lines = DurationModel.getLines(this, ctx);
        assert(this.lines);
        assert(_.forEach(this.lines, l => isFinite(l)));

        for (var i = 0; i < this.lines.length; ++i) {
            ctx.minBottomPaddings[this.staff] =
                Math.max(ctx.minBottomPaddings[this.staff], -(this.lines[i] - 3)*10);
            ctx.minTopPaddings[this.staff] =
                Math.max(ctx.minTopPaddings[this.staff], (this.lines[i] - 4)*10);
        }

        if (!ctx.isBeam && this.inBeam) {
            // this.x = Math.max(this.x, ctx.x);
            ctx.x = this.x + this.getWidth(ctx);
            this._handleTie(ctx);
            return C.IterationStatus.Success;
        } else if (!this.inBeam) {
            this._handleTie(ctx);
        }

        // Set which accidentals are displayed, and then update the accidentals currently
        // active in the bar.
        this._displayedAccidentals = this.getDisplayedAccidentals(ctx);
        var accidentals = this.getAccidentals(ctx);
        _.forEach(accidentals, (a, i) => {
            if (parseInt(a, 10) === 0) {
                ctx.accidentalsByStaff[this.staff][this.chord[i].step] = undefined;
            }
        });
        for (i = 0; i < this.chord.length; ++i) {
            // Set the octave specific accidental
            ctx.accidentalsByStaff[this.staff][this.chord[i].step + this.chord[i].octave] = this.chord[i].alter;
            // If needed, invalidate the default accidental
            if ((ctx.accidentalsByStaff[this.staff][this.chord[i].step]) !== this.chord[i].alter) {
                ctx.accidentalsByStaff[this.staff][this.chord[i].step] = C.InvalidAccidental;
            }
        }

        // Set height
        this.stemHeight = this._getStemHeight();

        // Set continuing notations.
        this.continuingNotations = <any> _(this._p_notes)
            .map((note: DurationModel.MXMLNote) => {
                var n = note.notationObj;
                if (!n) {
                    return null;
                }
                var toDisplay: any[] = [];
                if (n.tuplets && !this.inBeam) {
                    toDisplay = toDisplay.concat(n.tuplets.map(tuplet => {
                        if (tuplet.type !== C.MusicXML.StartStop.Start) {
                            return null;
                        }
                        var stop = ctx.next(t => t.isNote &&
                            _.any((<DurationModel>t)._p_notes,
                                note => _.any(note.notationObj.tuplets,
                                    t => t.type === C.MusicXML.StartStop.Stop)
                            ));

                        assert(!!stop, "Unterminated beam!!!");

                        var intermediates = [this];
                        var idx = this.idx;

                        do {
                            ++idx;
                            if (ctx.body[idx].isNote) {
                                intermediates.push(<DurationModel> ctx.body[idx]);
                            }
                        } while(ctx.body[idx] && ctx.body[idx] !== stop);

                        return {
                            body:           intermediates,
                            type:           "tuplet",
                            notation:       tuplet,
                            getDirection:   function(): number {
                                return _.reduce(intermediates, (sum, note) => sum + note.averageLine/intermediates.length, 0) >= 3 ? -1 : 1;
                            }
                        };
                    }).filter(t => !!t));
                }
                return toDisplay;
            })
            .flatten(true)
            .filter(n => !!n)
            .value();

        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");

        /*---- Update context -----------------------------------------------*/

        this.x = ctx.x;
        ctx.x += this.getWidth(ctx);

        if (!ctx.isBeam && !this._notes[0].grace) {
            ctx.division = (ctx.loc.division || 0) + this._divisions;
        }

        if (this.multiRest !== undefined) {
            ctx.invisibleForBars = this.multiRest;
            ctx.minTopPaddings[this.staff] = Math.max(ctx.minTopPaddings[this.staff], 40);
        }

        return C.IterationStatus.Success;
    }

    /*---- III. Util ----------------------------------------------------------------------------*/

    private getWidth(ctx: Annotator.Context) {
        var grace = this._notes[0].grace;
        var baseWidth = grace ? 11.4 : 22.8;

        var accidentalWidth = this._displayedAccidentals ? 9.6*(grace ? 0.6 : 1.0) : 0;
        var totalWidth = baseWidth + (this.extraWidth || 0) + accidentalWidth;

        var lyricWidth = this.getLyricWidth();
        totalWidth = Math.max(lyricWidth/2, totalWidth);

        assert(isFinite(totalWidth));
        return totalWidth;
    }

    getLyricWidth() {
        var lyrics: C.MusicXML.Lyric[] = <any[]> _.chain(this._notes)
                        .map(n => n.lyrics)
                        .filter(l => !!l)
                        .flatten(true)
                        .filter((l: C.MusicXML.Lyric) => !!l)
                        .value();

        var lyricWidth = _.reduce(lyrics, (width: number, lyric: C.MusicXML.Lyric) => {
            var words = "";
            _.forEach(lyric.lyricParts, part => {
                if (part._class === "Text") {
                    words += part.data;
                }
            });
            return Math.max(FontMetrics.getAlegreyaWidth(words, 22), width); // Font size?
        }, 0);

        return (lyricWidth ? lyricWidth + 10 : 0);
    }

    calcDivisions(ctx: C.MetreContext, inheritedCount?: number, force?: boolean) {
        if (!force && this._divisions) {
            return this._divisions;
        }
        return Metre.calcDivisions2(this, ctx, inheritedCount);
    }

    getAccWidthAfterBar(ctx: Annotator.Context) {
        if (!ctx.attributes || !ctx.attributes.keySignature) {
            return 0;
        }
        var staffAcc = C.NoteUtil.getAccidentals(ctx.attributes.keySignature);
        var backupAcc = ctx.accidentalsByStaff[this.staff];
        ctx.accidentalsByStaff[this.staff] = staffAcc;
        ctx.idx++;
        var acc = this.getAccidentals(ctx, true);
        ctx.accidentalsByStaff[this.staff] = backupAcc;
        ctx.idx--;

        var parens = _.any(acc, v => typeof v === "string" && !!~v.indexOf("p"));

        if (parens) {
            return 20;
        }
        var accs = _.any(this.getAccidentals(ctx, true), v => v === v);
        if (accs) {
            return 10;
        }

        return 0;
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
        if (rebeamable && !rebeamable.length) {
            rebeamable = null;
        }

        if (rebeamable) {
            DurationModel.BEAMDATA = rebeamable;
        }
        return !rebeamable;
    }

    calcMiddleNoteDirection(ctx: Annotator.Context) {
        var prevLine: number = ctx.prev() && ctx.prev().isNote ?
                DurationModel.getAverageLine(<DurationModel> ctx.prev().note, ctx) : null;
        var nextLine: number = ctx.next() && ctx.next().isNote ?
                DurationModel.getAverageLine(<DurationModel> ctx.next().note, ctx) : null;

        if ((nextLine !== null) && ctx.division + this._divisions +
                Metre.calcDivisions2(ctx.next().note, ctx, this.count) > ctx.ts.beats * ctx.attributes.divisions) {
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
            var startsAt = ctx.division;
            var endsAt = ctx.division + this._divisions;

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
            return a === null || a === undefined || a !== a ? third : a;
        };
        for (var i = 0; i < result.length; ++i) {
            var pitch: C.IPitch = chord[i];
            var actual = or3(display ? pitch.displayAlter : null, pitch.alter);
            assert(actual !== undefined);
            if (!ctx.accidentalsByStaff[this.staff]) {
                // WARNING: This probably means there is no key signature yet.
                return result.map(a => NaN);
            }
            var generalTarget = or3(ctx.accidentalsByStaff[this.staff][pitch.step], null);
            var target = or3(ctx.accidentalsByStaff[this.staff][pitch.step + pitch.octave], null);

            if (!target && generalTarget !== C.InvalidAccidental) {
                target = generalTarget;
            }

            var acc = this._p_notes[i].accidental;
            var prevDurr: DurationModel = null;
            _.forEach(this._p_notes, note => {
                if (!note.hasOwnProperty("staff")) {
                    if (!prevDurr) {
                        prevDurr = <DurationModel> ctx.prev(m => m.isNote);
                    }
                    if (prevDurr) {
                        note.staff = prevDurr.staff;
                    }
                }
            });
            var paren = acc && (acc.editorial || acc.parentheses || acc.bracket);

            // If the encoding software tells us what kind of accidental we have, we trust it. Otherwise...
            if (!acc && actual === target) {
                // We don't need to show an accidental if all of these conditions are met:

                // 1. The note has the same accidental on other octave (if the note is on other octaves)
                var noConflicts = target === generalTarget || generalTarget === C.InvalidAccidental;

                // 2. The note has the same accidental on all other voice (in the same bar, in the past)
                for (var j = 0; j < ctx.accidentalsByStaff.length && noConflicts; ++j) {
                    if (ctx.accidentalsByStaff[j] && target !== or3(ctx.accidentalsByStaff[j][pitch.step + pitch.octave],
                            ctx.accidentalsByStaff[j][pitch.step], target)) {
                        noConflicts = false;
                    }
                }

                // 3. The note has the same accidental on other voices with the same note (right now!)
                var concurrentNotes = ctx.findVertical(c => c.isNote);
                for (var j = 0; j < concurrentNotes.length && noConflicts; ++j) {
                    var otherChord = concurrentNotes[j].note.chord;
                    noConflicts = noConflicts && !_hasConflict(otherChord, pitch.step, target);
                }

                // 4. There isn't ambiguity because or a barline and this is the first beat.
                if (ctx.division === 0) {
                    var prevBarOrNote = ctx.prev(c => c.isNote && !c.isRest || c.type === C.Type.Barline);
                    if (prevBarOrNote && prevBarOrNote.type === C.Type.Barline) {
                        var prevNote = ctx.prev(
                            c => c.isNote && _.any(c.note.chord, c => c.step === pitch.step) ||
                            c.type === C.Type.Barline, 2);
                        if (prevNote && prevNote.type !== C.Type.Barline) {
                            noConflicts = noConflicts && !_hasConflict(prevNote.note.chord, pitch.step, target);
                        }
                    }
                }

                if (noConflicts) {
                    result[i] = NaN; // no accidental
                    continue;
                } else {
                    paren = true;
                }
            }

            if (!actual) {
                result[i] = paren ? "0p" : "0";
                continue;
            }

            assert(actual !== C.InvalidAccidental, "Accidental is invalid");
            result[i] = paren ? actual + "p" : actual;
        }
        return result;
    }

    private _handleTie(ctx: Annotator.Context) {
        if (_.any(this.tieds, t => t && t.type !== C.MusicXML.StartStopContinue.Stop)) {
            var nextNote = ctx.next(obj => obj.isNote);
            if (!nextNote || nextNote.isRest) {
                this.tieds = [null];
                this.tieTo = null;
            } else {
                this.tieTo = <DurationModel> nextNote;
            }
        } else {
            this.tieTo = null;
        }
    }

    private _implyDurationFromPerformanceData(mctx: C.MetreContext) {
        var factor = mctx.ts.beatType/4;
        var beats = factor * (this._notes[0].duration / mctx.attributes.divisions);
        this._count = 4 / (this._notes[0].duration / mctx.attributes.divisions);

        // Try dots
        var dotFactor = 1;
        var dots = 0;
        while (!isPO2(1/(beats/dotFactor/4)) && dots < 5) { // /8?
            ++dots;
            dotFactor += Math.pow(1/2, dots);
        }
        if (dots === 5) {
            dots = 0;
        } else if (dots !== 0) {
            this._count = (1/(beats/dotFactor/4/factor));
            this.dots = dots;
        }

        // Try tuplets
        // TODO

        // Try ties
        if (!isPO2(this.count)) {
            // Whole bar rests can still exist even when there's no single NOTE duration
            // that spans a bar.
            if (beats === mctx.ts.beats && this.isRest) {
                this._count = -1;
            } else {
                var nextPO2 = Math.pow(2, Math.ceil(Math.log(this.count)/Math.log(2)));
                this._count = nextPO2;
                // TODO: Add 1+ tie.
            }
        }

        // TODO: Find the best match for performance data

        function isPO2(n: number) {
            if (Math.abs(Math.round(n) - n) > 0.00001) {
                return false;
            }
            n = Math.round(n);
            return !!n && !(n & (n - 1));
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

    /**
     * Durations can (unfortunately) span multiple staves.
     * 
     * Staves are rendered from top to bottom, so this returns the index of the final
     * staff. Otherwise, a note could be covered by other Models.
     */
    get staff() {
        return _.chain(this._p_notes).map(n => n.staff).max().value();
    }

    set staff(n: number) {
        _.forEach(this._p_notes, note => note.staff = n);
    }

    /*---- III.2 Vertical layout ----------------------------------------------------------------*/

    get direction(): number {
        if (!isNaN(this.forceMiddleNoteDirection)) {
            return this.forceMiddleNoteDirection;
        }

        var average = this.averageLine;

        if (this._notes[0].grace || average <= 3) {
            return 1;
        }

        return -1;
    }
    get averageLine(): number {
        return _.reduce(this.lines, (memo: number, i: number) => memo + i/this.lines.length, 0);
    }
    get lowestLine() {
        return _.reduce(this.lines, (a: number, b: number) => Math.min(a, b), C.MAX_NUM);
    }
    get highestLine() {
        return _.reduce(this.lines, (a: number, b: number) => Math.max(a, b), -C.MAX_NUM);
    }
    get startingLine() {
        return this.direction === 1 ? this.lowestLine : this.highestLine;
    }
    get heightDeterminingLine() {
        return this.direction === 1 ? this.highestLine : this.lowestLine;
    }

    stemHeight: number;
    private _getStemHeight(): number {
        var heightFromOtherNotes = (this.highestLine - this.lowestLine) * 10;
        var idealStemHeight = DurationModel.IDEAL_STEM_HEIGHT + heightFromOtherNotes;
        var minStemHeight = DurationModel.MIN_STEM_HEIGHT + heightFromOtherNotes;

        var start = this.heightDeterminingLine*10;
        var idealExtreme = start + this.direction*idealStemHeight;

        var result: number;
        if (idealExtreme >= 65) {
            result = Math.max(minStemHeight, idealStemHeight - (idealExtreme - 65));
        } else if (idealExtreme <= -15) {
            result = Math.max(minStemHeight, idealStemHeight - (-15 - idealExtreme));
        } else {
            result = 35;
        }

        // All stems should in the main voice should touch the center line.
        if (start > 30 && this.direction === -1 && start - result > 30) {
            result = start - 30;
        } else if (start < 30 && this.direction === 1 && start + result < 30) {
            result = 30 - start;
        }

        // Grace note stems are short (though still proportionally pretty tall)
        if (this._notes[0].grace) {
            result *= 0.75;
        }

        return result;
    }
    get onLedger() {
        var lowest = this.lowestLine;
        var highest = this.highestLine;
        return lowest < 0.5 || highest > 5.5;
    }

    /*---- IV. Statics --------------------------------------------------------------------------*/

    static BEAMDATA: Array<DurationModel>;
}

module DurationModel {
    "use strict";
    export class MXMLNote implements C.MusicXML.NoteComplete {
        _parent: DurationModel;
        _idx : number;

        constructor(parent: DurationModel, idx: number, note: C.MusicXML.Note, updateParent: boolean = true) {
            var self : {[key:string]: any} = <any> this;

            /* Link to parent */
            this._parent            =   parent;
            this._idx               =   idx;

            if (note.pitch) {
                note.pitch.step     = note.pitch.step.toUpperCase();
            }

            /* Properties owned by parent */
            if (updateParent) {
                parent.chord[idx]   =   note.pitch;
                parent.dots         =  (note.dots || []).length;
                if (note.rest) {
                    this.rest       =   note.rest; // Assigns parent
                }
                var count           =   note.noteType ? note.noteType.duration : parent.count;
                if (count) {
                    parent.count    =   count;
                }

                parent.tuplet       =   note.timeModification || parent.tuplet;
            }

            /* Properties owned by MXMLNote */
            var properties          = [
                "unpitched", "noteheadText", "accidental", "instrument",
                "attack", "endDynamics", "lyrics", "notations", "stem", "cue", "ties", "dynamics", "duration",
                "play", "staff", "grace", "notehead", "release", "pizzicato", "beams", "voice", "footnote", "level",
                "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight", "fontStyle", "fontSize",
                "color", "printDot", "printLyric", "printObject", "printSpacing", "timeOnly" ];

            _.forEach(properties, setIfDefined);

            this.unstupidifyNotations();

            function setIfDefined(property: string) {
                if (note.hasOwnProperty(property) && (<any>note)[property] !== null) {
                    self[property]  = <any> (<any>note)[property];
                }
            }
        }

        /*---- MXMLNote -------------------------------------------------------------------------*/

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

        /*---- C.MusicXML.Note ------------------------------------------------------------------*/

        /*---- C.MusicXML.Note > Core -----------------------------------------------------------*/

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
            return this._parent.isRest ? {
                measure: this._parent.isWholebar,
                displayStep: this._restDisplayStep,
                displayOctave: this._restDisplayOctave
            } : null;
        }
        set rest(rest: C.MusicXML.Rest) {
            this._parent.isRest = !!rest;
            if (rest) {
                this._restDisplayStep = rest.displayStep;
                this._restDisplayOctave = rest.displayOctave;
            } else {
                if (this._restDisplayStep || this._restDisplayOctave) {
                    this._restDisplayStep = undefined;
                    this._restDisplayOctave = undefined;
                }
            }
        }
        _restDisplayStep: string;
        _restDisplayOctave: string;

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
            return this._parent.tuplet;
        }

        set timeModification(tm: C.MusicXML.TimeModification) {
            this._parent.tuplet = tm;
        }

        /*---- C.MusicXML.Note > Extended -------------------------------------------------------*/
        unpitched:          C.MusicXML.Unpitched;
        noteheadText:       C.MusicXML.NoteheadText;
        accidental:         C.MusicXML.Accidental;
        instrument:         C.MusicXML.Instrument;
        attack:             number;
        endDynamics:        number;
        lyrics:             C.MusicXML.Lyric[];
        /**
         * DO NOT MODIFY. Don't even think about it. Instead use notationObj and articulationObj
         */
        notations:          C.MusicXML.Notations[];
        stem:               C.MusicXML.Stem;
        cue:                C.MusicXML.Cue;
        duration:           number;
        /**
         * This applies to the sound only.
         * s.a. notationObj.tieds
         */
        ties:               C.MusicXML.Tie[];
        dynamics:           number;
        play:               C.MusicXML.Play;
        staff:              number;                 // See prototype.
        grace:              C.MusicXML.Grace;
        notehead:           C.MusicXML.Notehead;
        release:            number;
        pizzicato:          boolean;
        beams:              C.MusicXML.Beam[];

        /*---- C.MusicXML.PrintStyle ------------------------------------------------------------*/

        /*---- C.MusicXML.PrintStyle >> EditorialVoice ------------------------------------------*/

        voice:              number;
        footnote:           C.MusicXML.Footnote;
        level:              C.MusicXML.Level;

        /*---- C.MusicXML.PrintStyle >> Position ------------------------------------------------*/

        get defaultX(): number {
            return this._parent.x;
        }
        relativeY:          number;
        defaultY:           number;
        relativeX:          number;

        /*---- C.MusicXML.PrintStyle >> Font ----------------------------------------------------*/

        fontFamily:         string;
        fontWeight:         C.MusicXML.NormalBold;
        fontStyle:          C.MusicXML.NormalItalic;
        fontSize:           string;

        /*---- C.MusicXML.PrintStyle >> Color ---------------------------------------------------*/

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
                    this._color = parseInt(a, 16);
                    break;
                default:
                    this._color = parseInt(a, 16);
                    break;
            }
        }

        private _color:     number = 0x000000;

        /*---- C.MusicXML.Printout --------------------------------------------------------------*/

        printDot:           boolean;
        printLyric:         boolean;

        /*---- C.MusicXML.Printout >> PrintObject -----------------------------------------------*/

        printObject:        boolean;

        /*---- C.MusicXML.Printout >> PrintSpacing ----------------------------------------------*/

        printSpacing:       boolean;

        /*---- C.MusicXML.TimeOnly --------------------------------------------------------------*/

        timeOnly:           string;

        /*---- Util -----------------------------------------------------------------------------*/

        ensureNotationsWrittable() {
            this.notations = this.notations || [{}];
        }
        get notationObj(): C.MusicXML.Notations {
            return this.notations ? this.notations[0] : Object.freeze({});
        }

        ensureArticulationsWrittable() {
            this.ensureNotationsWrittable();
            this.notationObj.articulations = this.notationObj.articulations || [{}];
        }
        get articulationObj(): C.MusicXML.Articulations {
            return this.notationObj.articulations ? this.notationObj.articulations[0] : Object.freeze({});
        }

        /**
         * Flattens notations.
         * All of the following are valid and equivalent in MusicXML:
         * 
         * 1. <notations>
         *      <articulations>
         *        <staccato placement="above"/>
         *      </articulations>
         *    </notations>
         *    <notations>
         *      <articulations>
         *        <accent placement="above"/>
         *      </articulations>
         *    </notations>
         * 
         * 2. <notations>
         *      <articulations>
         *        <staccato placement="above"/>
         *      </articulations>
         *      <articulations>
         *        <accent placement="above"/>
         *      </articulations>
         *    </notations>
         * 
         * 3. <notations>
         *      <articulations>
         *        <staccato placement="above"/>
         *        <accent placement="above"/>
         *      </articulations>
         *    </notations>
         * 
         * This function makes the structure like the third version. So there's only ever 0 or
         * 1 notations and 0 or 1 articulations. This makes the notationObj and articualtionObj
         * function above fast.
         * 
         * In practice, different groups of notations could have different editorials.
         * I'm not willing to put up with that.
         */
        unstupidifyNotations() {
            if (this.notations) {
                var notations = this.notations;
                var notation: C.MusicXML.Notations = {
                    articulations:          combineArticulations                ("articulations"),
                    accidentalMarks:        combine<C.MusicXML.AccidentalMark>  ("accidentalMarks"),
                    arpeggiates:            combine<C.MusicXML.Arpeggiate>      ("arpeggiates"),
                    dynamics:               combine<C.MusicXML.Dynamics>        ("dynamics"),
                    fermatas:               combine<C.MusicXML.Fermata>         ("fermatas"),
                    glissandos:             combine<C.MusicXML.Glissando>       ("glissandos"),
                    nonArpeggiates:         combine<C.MusicXML.NonArpeggiate>   ("nonArpeggiates"),
                    ornaments:              combine<C.MusicXML.Ornaments>       ("ornaments"),
                    otherNotations:         combine<C.MusicXML.OtherNotation>   ("otherNotations"),
                    slides:                 combine<C.MusicXML.Slide>           ("slides"),
                    slurs:                  combine<C.MusicXML.Slur>            ("slurs"),
                    technicals:             combine<C.MusicXML.Technical>       ("technicals"),
                    tieds:                  combine<C.MusicXML.Tied>            ("tieds"),
                    tuplets:                combine<C.MusicXML.Tuplet>          ("tuplets"),
                    footnote:                  last<C.MusicXML.Footnote>        ("footnote"),
                    level:                     last<C.MusicXML.Level>           ("level"),
                    printObject:               last<boolean>                    ("printObject")
                };
                this.notations = [notation];
            }

            function combine<T>(key: string): T[] {
                return _.reduce(notations, (memo: any, n:any) =>
                    n[key] ? (memo||<T[]>[]).concat(n[key]) : memo, null);
            }

            function combineArticulations(key: string): C.MusicXML.Articulations[] {
                var array = combine<C.MusicXML.Articulations>(key);
                if (!array) {
                    return null;
                }
                var articulations: C.MusicXML.Articulations = <any> {};
                for (var i = 0; i < array.length; ++i) {
                    for (var akey in array[i]) {
                        if (array[i].hasOwnProperty(akey)) {
                            (<any>articulations)[akey] = (<any>array[i])[akey];
                        }
                    }
                }
                return [articulations];
            }

            function last<T>(key: string): T {
                return _.reduce(notations, (memo: any, n:any) =>
                    n[key] ? n[key] : memo, []);
            }
        }
    }

    export function getClefOffset(clef: C.MusicXML.Clef) {
        return DurationModel.clefOffsets[clef.sign] + clef.line - C.defaultClefLines[clef.sign.toUpperCase()]
            - 3.5*parseInt(clef.clefOctaveChange||"0", 10);
    }

    export interface IContinuingNotation {
        body:           DurationModel[];
        type:           string;
        notation:       any;
        getDirection:   () => number;
    }

    export var IDEAL_STEM_HEIGHT: number = 35;
    export var MIN_STEM_HEIGHT: number = 25;

    export var clefOffsets: { [key: string]: number } = {
        G:              -3.5,
        F:               2.5,
        C:              -0.5,
        PERCUSSION:     -0.5,
        TAB:            -0.5,
        NONE:           -0.5
    };

    export var chromaticScale: { [key: string]: number } = {
        c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11
    }; // c:12

    export var countToFlag: { [key: string]: string } = {
        8: "flag8th",
        16: "flag16th",
        32: "flag32nd",
        64: "flag64th",
        128: "flag128th",
        256: "flag256th",
        512: "flag512th",
        1024: "flag1024th"
    };

    export var countToHasStem: { [key: string]: boolean } = {
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

    export var countToIsBeamable: { [key: string]: boolean } = {
        8: true,
        16: true,
        32: true,
        64: true,
        128: true,
        256: true,
        512: true,
        1024: true
    };

    export var countToNotehead: { [key: number]: string } = {
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

    export var countToRest: { [key: number]: string } = {
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

    export var getAverageLine = (note: DurationModel, ctx: Annotator.Context) => {
        var lines = DurationModel.getLines(note, ctx, { filterTemporary: true });
        return _.reduce(lines, (memo, line) => memo + line/lines.length, 0);
    };

    export var getLines = (note: DurationModel,
            ctx: Annotator.Context, options?: { filterTemporary: boolean }): Array<number> => {
        options = options || {filterTemporary: false};
        var ret: Array<number> = [];
        for (var i = 0; i < note.chord.length; ++i) {
            if (!options.filterTemporary || !note.chord[i].temporary) {
                if (note.isRest) {
                    var durr = <DurationModel> note;
                    if (durr._notes && durr._notes[i].rest.displayStep) {
                        ret.push(
                            DurationModel.getClefOffset(ctx.attributes.clefs[note.staff - 1]) +
                            ((parseInt(durr._notes[i].rest.displayOctave, 10) || 0) - 3) * 3.5 +
                            DurationModel.pitchOffsets[durr._notes[i].rest.displayStep]);
                    } else if (note.isWholebar) {
                        ret.push(4);
                    } else {
                        ret.push(3);
                    }
                } else {
                    ret.push(
                        DurationModel.getClefOffset(ctx.attributes.clefs[note.staff - 1]) +
                        ((note.chord[i].octave || 0) - 3) * 3.5 +
                        DurationModel.pitchOffsets[note.chord[i].step]);
                }
            }
        }
        _.forEach(ret, r => assert(isFinite(r)));
        return ret;
    };

    export var offsetToPitch: { [key: string]: string } = {
        0: "C",
        0.5: "D",
        1: "E",
        1.5: "F",
        2: "G",
        2.5: "A",
        3: "B"
    };

    export var pitchOffsets: { [key: string]: number } = {
        C: 0,
        D: 0.5,
        E: 1,
        F: 1.5,
        G: 2,
        A: 2.5,
        B: 3
    };
}

DurationModel.MXMLNote.prototype.staff = 1;
function _hasConflict(otherChord: Array<C.IPitch>, step: string, target: number) {
    "use strict";
    for (var k = 0; k < otherChord.length; ++k) {
        var actual = (otherChord[k].alter !== otherChord[k].alter) ? NaN : (otherChord[k].alter || 0);
        var target = (target !== target) ? NaN : (target || 0);
        if (otherChord[k].step === step && actual !== target) {
            return true;
        }
    }
    return false;
}

enum Flags {
    TEMPORARY   = 2 << 7,
    WHOLE_BAR   = 2 << 8
}

export = DurationModel;
