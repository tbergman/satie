/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import Metre = require("./metre");
import _ = require("lodash");
import assert = require("assert");

import BarlineModel = require("./barline");
import C = require("./contracts");
import Context = require("./context");
import EndMarkerModel = require("./endMarker");
import KeySignatureModel = require("./keySignature");
import NewlineModel = require("./newline");
import TimeSignatureModel = require("./timeSignature");

/**
 * A duration is a chord (if chord is set, and pitch is null), a pitch
 * (if pitch is [a-g]), or a rest (if pitch is "r").
 */
class DurationModel extends Model implements C.IPitchDuration {
    annotateImpl(ctx: Context): C.IterationStatus {
        var status: C.IterationStatus = C.IterationStatus.SUCCESS;
        var i: number;
        var j: number;

        // A key signature must exist on each line;
        // The key signature ensures a clef exists.
        if (!ctx.keySignature) { return KeySignatureModel.createKeySignature(ctx); }

        // A time signature must exist on the first line of every page.
        this.impliedTS = ctx.timeSignature;
        if (!this.impliedTS) { return TimeSignatureModel.createTS(ctx); }

        // A note's duration, when unspecified, is set by the previous note.
        if (!this._count) {
            assert(ctx.count, "Never null (the initial count is '4')");
            this.count = ctx.count;
        }

        this._beats = this.getBeats(ctx, null, !ctx.fast);

        // Update the context to reflect the current note's duration.
        ctx.count = this.count;

        var beats = this.getBeats(ctx);
        this._isWholeBar = this.getBeats(ctx) === ctx.timeSignature.beats;

        // Make sure the bar is not overfilled. Multibar rests are okay.
        if (this.getBeats(ctx) > ctx.timeSignature.beats && ctx.beats >= ctx.timeSignature.beats) {
            return BarlineModel.createBarline(ctx, C.Barline.Standard);
        } else if (!this.isMultibar) {
            // The number of beats in a bar must not exceed that specified by the time signature.
            if (ctx.beats + beats > ctx.timeSignature.beats) {
                var overfill = ctx.beats + beats - ctx.timeSignature.beats;
                if (beats === overfill) {
                    return BarlineModel.createBarline(ctx, C.Barline.Standard);
                } else {
                    var replaceWith = Metre.subtract(this, overfill, ctx).map(t => new DurationModel(<any>t));
                    var addAfterBar = Metre.subtract(this, beats - overfill, ctx).map(t => new DurationModel(<any>t));
                    for (i = 0; i < replaceWith.length; ++i) {
                        replaceWith[i].pitch = this.pitch;
                        replaceWith[i].chord = this.chord ? JSON.parse(JSON.stringify(this.chord)) : null;
                        if (i + 1 !== replaceWith.length || addAfterBar.length && !this.isRest) {
                            replaceWith[i].tie = true;
                        }
                    }
                    for (i = 0; i < addAfterBar.length; ++i) {
                        addAfterBar[i].pitch = this.pitch;
                        addAfterBar[i].chord = this.chord ? JSON.parse(JSON.stringify(this.chord)) : null;
                        if (i + 1 !== addAfterBar.length && !this.isRest) {
                            addAfterBar[i].tie = true;
                        }
                    }
                    BarlineModel.createBarline(ctx, C.Barline.Standard);
                    Array.prototype.splice.apply(ctx.body, [ctx.idx, 0].concat(<any[]>replaceWith));
                    Array.prototype.splice.apply(ctx.body, [ctx.idx + 1 + replaceWith.length, 1].concat(<any[]>addAfterBar));
                    return C.IterationStatus.RETRY_LINE;
                }
            }

            // Check rhythmic spelling
            if (!this.inBeam) {
                status = Metre.rythmicSpellcheck(ctx);
                if (status !== C.IterationStatus.SUCCESS) { return status; }
            }
        }

        // All notes, chords, and rests throughout a line must have the same spacing.
        if (ctx.smallest > beats) {
            ctx.smallest = beats;
            return C.IterationStatus.RETRY_LINE;
        }

        // Each note's width has a linear component proportional to the log of its duration.
        this.annotatedExtraWidth = (Math.log(this.getBeats(ctx)) - Math.log(ctx.smallest)) /
            DurationModel.log2 / 3;

        // The width of a line must not exceed that specified by the page layout.
        if ((ctx.x + this.getWidth(ctx) > ctx.maxX)) {
            status = NewlineModel.createNewline(ctx);
        }
        if (status !== C.IterationStatus.SUCCESS) { return status; }

        // Beams must follow the beam patterns
        if (!this.perfectlyBeamed(ctx)) {
            var b = DurationModel.BEAMDATA;
            DurationModel.BEAMDATA = null;

            while (_.any(b, (b) => b.inBeam)) {
                j = b[0].idx;
                while (ctx.body[j].inBeam) {
                    --j;
                }
                while(ctx.body[j].type !== C.Type.BEAM_GROUP) {
                    ++j;
                }
                var beam = (<any>ctx.body[j]).beam; // TSFIX
                _.each(beam, (c: DurationModel) => {
                    c.inBeam = false;
                    return true;
                });
                if (j <= ctx.idx) {
                    ctx.erasePast(j);
                } else {
                    ctx.eraseFuture(j);
                }
            }

            _.each(b, function (b: DurationModel) {
                b.inBeam = true;
            });
            var BeamGroupModel = require("./beamGroup"); // Recursive dependency
            BeamGroupModel.createBeam(ctx, b);
            return C.IterationStatus.RETRY_LINE;
        }

        // The document must end with a marker.
        if (!ctx.next()) {
            status = ctx.insertFuture(new EndMarkerModel({endMarker: true}));
        }
        if (status !== C.IterationStatus.SUCCESS) { return status; }

        // Middle note directions are set by surrounding notes.
        this.forceMiddleNoteDirection = NaN;
        if (!ctx.fast && DurationModel.getAverageLine(this, ctx) !== 3) {
            status = DurationModel.prototype.decideMiddleLineStemDirection(ctx);
        }
        if (status !== C.IterationStatus.SUCCESS) { return status; }

        // Copy information the view needs from the context.
        this.line = DurationModel.getLine(this, ctx);

        if (!ctx.isBeam) {
            ctx.beats = (ctx.beats || 0) + this.getBeats(ctx);
        }

        if (!ctx.isBeam && this.inBeam) {
            this._handleTie(ctx);
            return C.IterationStatus.SUCCESS;
        } else if (!this.inBeam) {
            this._handleTie(ctx);
        }
        this.setX(ctx.x);
        this.accidentals = this.getAccidentals(ctx);
        if (this.pitch) {
            ctx.accidentals[this.pitch.pitch] = this.pitch.acc;
        } else {
            for (i = 0; i < this.chord.length; ++i) {
                ctx.accidentals[this.chord[i].pitch] = this.chord[i].acc;
            }
        }
        ctx.x += this.getWidth(ctx);
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black");
        this.flag = !this.inBeam && (this.displayCount in DurationModel.countToFlag) &&
        DurationModel.countToFlag[this.displayCount];
        return C.IterationStatus.SUCCESS;
    }

    constructor(spec: C.IPitchDuration) {
        super(spec);
        this._tie = spec.tie;
    }

    containsAccidental(ctx: Context) {
        var nonAccidentals = KeySignatureModel.getAccidentals(ctx.keySignature);
        var pitches: Array<C.IPitch> = this.chord || [<C.IPitch>this];
        for (var i = 0; i < pitches.length; ++i) {
            if ((nonAccidentals[pitches[i].pitch]||0) !== (pitches[i].acc||0)) {
                return true;
            }
        }
    }
    perfectlyBeamed(ctx: Context) {
        if (!this.hasFlagOrBeam) {
            return true;
        }
        var rebeamable = Metre.rebeamable(ctx.idx, ctx);
        if (rebeamable) {
            DurationModel.BEAMDATA = rebeamable;
        }
        return !rebeamable;
    }

    decideMiddleLineStemDirection(ctx: Context): C.IterationStatus {
        var prevLine: number = ctx.prev() && ctx.prev().isNote ?
                DurationModel.getAverageLine(ctx.prev().note, ctx) : null;
        var nextLine: number = ctx.next() && ctx.next().isNote ?
                DurationModel.getAverageLine(ctx.next().note, ctx) : null;

        if ((nextLine !== null) && ctx.beats + this.getBeats(ctx) + ctx.next().note
                .getBeats(ctx, this.count) > ctx.timeSignature.beats) {
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
            var startsAt = ctx.beats;
            var endsAt = ctx.beats + this.getBeats(ctx);

            if (Math.floor(startsAt) === Math.floor(endsAt)) {
                check = nextLine;
            } else if (Math.floor(startsAt) !== startsAt) {
                // XXX: ASSUMES no divisions mid-beat
                check = prevLine;
            } else if (startsAt >= ctx.timeSignature.beats/2) {
                // XXX: ASSUMES 4/4 !!!
                check = nextLine;
            } else {
                check = prevLine;
            }
        }

        this.forceMiddleNoteDirection = (check === undefined || check >= 3) ? -1 : 1;

        return C.IterationStatus.SUCCESS;
    }


    visible() {
        return !this.inBeam;
    }


    getAccWidth(ctx: Context) {
        var accWidth: number = 0;
        var accTmp: any = this.getAccidentals(ctx);
        if (accTmp) {
            var acc: Array<number> = (accTmp instanceof Array) ? accTmp : [accTmp];
            var max = _.reduce(acc, (memo: number, t: number) =>
                Math.max(Math.abs(t || 0), memo), 0);
            accWidth = max*0.15;
        }
        return Math.max(0, accWidth - 0.3);
    }

    getWidth(ctx: Context) {
        return 0.67 + (this.annotatedExtraWidth || 0);
    }

    toLylite(lylite: Array<string>) {
        var str: string;
        if (this.pitch) {
            str = this._lyPitch(this);
        } else if (this.chord) {
            str = "< " + _.map(this.chord, a => this._lyPitch(a)).join(" ") + " >";
        }
        str += this.count;
        if (this.dots) {
            _.times(this.dots, d => str += ".");
        }
        if (this.tie) {
            str += "~";
        }
        lylite.push(str);
    }

    getBeats(ctx: Context, inheritedCount?: number, force?: boolean) {
        if (!force && this._beats) {
            return this._beats;
        }
        return getBeats(
            this.count || inheritedCount,
            this.getDots(),
            this.getTuplet(),
            ctx.timeSignature);
    }

    getDots() {
        return DurationModel.getDots(this);
    }

    getTuplet() {
        return DurationModel.getTuplet(this);
    }

    get accStrokes() {
        if (this.chord) {
            return _.map(this.chord, c => c.accTemporary ? "#A5A5A5" : "black");
        }
        return [this.accTemporary ? "#A5A5A5" : "black"];
    }

    get annotatedExtraWidth() {
        return this._annotatedExtraWidth;
    }

    set annotatedExtraWidth(w: number) {
        this._annotatedExtraWidth = w;
    }

    get count() {
        return 1*this._count;
    }

    set count(n: number) {
        this._count = n;
        this._beats = null; // Kill optimizer.
    }

    get direction() {
        return isNaN(this.forceMiddleNoteDirection) ? undefined : this.forceMiddleNoteDirection;
    }

    get dots() {
        return this._dots;
    }

    set dots(n: number) {
        this._dots = n;
        this._beats = null; // Kill optimizer.
    }


    /**
     * Returns the length of the beat, without dots or tuplet modifiers
     * that should be rendered. This can differ from the actual count
     * during a preview, for example.
     */
    get displayCount(): number {
        return this._displayCount || this.count;
    }
    set displayCount(c: number) {
        this._displayCount = c;
    }

    /**
     * Returns the number of dots that should be rendered. This can differ
     * from the actual number of dots during a preview, for example.
     */
    get displayDots(): number {
        if (this.isWholebar && this.isRest) {
            return 0;
        }
        return this._displayDots || this.dots;
    }

    set displayDots(c: number) {
        this._displayDots = c;
    }

    get hasStem() {
        return DurationModel.countToHasStem[this.displayCount];
    }

    get hasFlagOrBeam() {
        return DurationModel.countToIsBeamable[this.count];
    }

    get isMultibar() {
        return this.count < 1;
    }

    get isRest() {
        if (this.chord && this.chord.length === 1 && this.chord[0].pitch === "r") {
            // This isn't valid, so once we stop this case from occurring,
            // remove this logic.
            return true;
        }
        return this.pitch === "r";
    }

    set isRest(r: boolean) {
        assert(!!r, "Instead, set the exact pitch or chord...");
        this.chord = null;
        this.pitch = "r";
        this.tie = false;
    }

    get isNote() : boolean {
        return true;
    }

    get isWholebar() {
        return this._isWholeBar;
    }

    get note(): C.IPitchDuration {
        return this;
    }

    get notehead() {
        return DurationModel.countToNotehead[this.displayCount];
    }

    get restHead() {
        if (this.isWholebar) {
            return DurationModel.countToRest["1"];
        }
        return DurationModel.countToRest[this.count];
    }

    get strokes() {
        if (this.chord) {
            return _.map(this.chord, c => c.temporary ?
                    "#A5A5A5" :
                    (this.selected ? "#75A1D0" : "black"));
        }
        return [this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black" )];
    }

    get tie() {
        return this._tie;
    }

    set tie(t: boolean) {
        assert(!this.isRest || !t);
        this._tie = t;
    }

    get type() {
        return C.Type.DURATION;
    }

    static BEAMDATA: Array<DurationModel>;

    static clefOffsets: { [key: string]: number } = {
        treble: -3.5,
        bass: 2.5,
        alto: -0.5,
        tenor: 0.5,


        gClef15mb: -3.5 + 3.5*2,
        gClef8vb: -3.5 + 3.5,
        gClef8va: -3.5 - 3.5,
        gClef15ma: -3.5 - 3.5*2,
        gClef8vbOld: -3.5 +3.5*2,
        gClef8vbCClef: -3.5 + 3.5,
        gClef8vbParens: -3.5 + 3.5,

        fClef15mb: 2.5 + 3.5*2,
        fClef8vb: 2.5 + 3.5,
        fClef8va: 2.5 - 3.5,
        fClef15ma: 2.5 - 3.5*2,

        cClef8vb: -0.5 +3.5*2,

        unpitchedPercussionClef1: 0,
        unpitchedPercussionClef2: 0,
        semipitchedPercussionClef1: 0,
        semipitchedPercussionClef2: 0,
        "6stringTabClef": 0,
        "4stringTabClef": 0,
        "bridgeClef": 0,
        "accdnDiatonicClef": 0,

        "cClefTriangular": -0.5,
        "fClefTriangular": 2.5,
        "cClefTriangularToFClef": 2.5,
        "fClefTriangularToCClef": -0.5,

        "gClefReversed": -3.5,
        "gClefTurned": -3.5,
        "cClefReversed": -0.5,
        "fClefReversed": 2.5,
        "fClefTurned": 2.5
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

    static countToNotehead: { [key: string]: string } = {
        0.25: "noteheadDoubleWhole",
        0.5: "noteheadDoubleWhole",
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

    static countToRest: { [key: string]: string } = {
        0.25: "restLonga",
        0.5: "restDoubleWhole",
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

    static getAverageLine = (pitch: C.IPitchDuration, ctx: Context) => {
        var line = DurationModel.getLine(pitch, ctx, { filterTemporary: true });
        if (!isNaN(<any>line)) {
            return line;
        }
        return _.reduce(line, (memo:number, l: number) => memo + l, 0)/line.length;
    };

    static getDots = (obj: C.IPitchDuration) =>
        isNaN(obj.actualDots) ? obj.dots : obj.actualDots;

    static getLine = (pitch: C.IPitch,
            ctx: Context, options?: { filterTemporary: boolean }): any => { // TSFIX
        options = options || {filterTemporary: false};

        if (!ctx) {
            assert(pitch.line !== undefined,
                    "Must be first annotated in duration.jsx");
            return pitch.line;
        }
        assert(ctx.clef, "A clef must be inserted before the first note");
        if (pitch.chord) {
            return _(pitch.chord
                .filter(p => !options.filterTemporary || !p.temporary))
                .map(p => DurationModel.getLine(p, ctx))
                .value();
        }
        if (pitch.isRest) {
            return 3;
        }
        return DurationModel.clefOffsets[ctx.clef] +
            (pitch.octave || 0) * 3.5 + DurationModel.pitchOffsets[pitch.pitch];
    };

    static getPitch = (line: number, ctx: Context) => {
        assert(ctx.clef, "A clef must be inserted before the first note");
        var pitch = DurationModel.offsetToPitch[((
                line - DurationModel.clefOffsets[ctx.clef]) % 3.5 + 3.5) % 3.5];
        var acc = ctx.accidentals[pitch];

        return {
            pitch: DurationModel.offsetToPitch[((
                line - DurationModel.clefOffsets[ctx.clef]) % 3.5 + 3.5) % 3.5],
            octave: Math.floor((line - DurationModel.clefOffsets[ctx.clef])/3.5),
            acc: acc
        };
    };

    static getTuplet = (obj: C.IPitchDuration) =>
        (obj.actualTuplet !== undefined) ? obj.actualTuplet : obj.tuplet;

    static log2 = Math.log(2);

    static noteNames =
        ["C", "C\u266F", "D\u266D", "D", "D\u266F", "E\u266D", "E", "F", "F\u266F",
            "G\u266D", "G", "G\u266F", "A\u266D", "A", "A\u266F", "B\u266D", "B"];

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

    private getAccidentals(ctx: Context) {
        var chord: Array<C.IPitch> = this.chord || <any> [this];
        var result = new Array(chord.length || 1);
        for (var i = 0; i < result.length; ++i) {
            var pitch: C.IPitch = chord[i];
            var actual = pitch.acc;
            var target = ctx.accidentals[pitch.pitch];
            if (actual === target) {
                result[i] = NaN; // no accidental
                continue;
            }

            if (!actual) {
                ctx.accidentals[pitch.pitch] = undefined;
                result[i] = 0; // natural
                continue;
            }

            result[i] = actual;
        }
        return result;
    }

    private _handleTie(ctx: Context) {
        if (this.tie) {
            this.tieTo = <DurationModel> ctx.next(obj => obj.isNote);
        } else {
            this.tieTo = null;
        }
    }

    private _lyPitch(pitch: C.IPitch) {
        var str = pitch.pitch;
        if (pitch.acc === 1) {
            str += "is";
        } else if (pitch.acc === -1) {
            str += "es";
        }
        if (pitch.octave > 0) {
            _.times(pitch.octave, () => str += "'");
        } else if (pitch.octave < 0) {
            _.times(-pitch.octave, () => str += ",");
        }

        return str;
    }

    private _annotatedExtraWidth: number;
    private _beats: number;
    private _count: number;
    private _displayCount: number;
    private _displayDots: number;
    private _dots: number;
    private _isWholeBar: boolean;
    private _tie: boolean;
    acc: any;
    accidentals: any;
    accTemporary: number;
    actualTuplet: C.ITuplet;
    chord: Array<C.IPitch>;
    color: string;
    flag: string;
    forceMiddleNoteDirection: number;
    impliedTS: {
        beats: number;
        beatType: number;
    };
    line: any;
    octave: number;
    pitch: any;
    relative: boolean;
    selected: boolean;
    temporary: boolean;
    tieTo: DurationModel;
    tuplet: C.ITuplet;
}

var getBeats = Metre.getBeats;


/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = DurationModel;
