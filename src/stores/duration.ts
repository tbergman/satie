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
import Annotator = require("./annotator");
import EndMarkerModel = require("./endMarker");
import KeySignatureModel = require("./keySignature");
import NewlineModel = require("./newline");
import TimeSignatureModel = require("./timeSignature");

/**
 * A duration is a chord (if chord is set, and pitch is null), a pitch
 * (if pitch is [a-g]), or a rest (if pitch is "r").
 */
class DurationModel extends Model implements C.IPitchDuration {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);

        this._beats = this.getBeats(mctx, null, true);
        assert(this._beats !== null);
        mctx.bar += Math.floor((mctx.beat + this._beats) / mctx.timeSignature.beats);
        mctx.beat = (mctx.beat + this._beats) % mctx.timeSignature.beats;
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
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
            assert(ctx.defaultCount, "Never null (the initial count is '4')");
            this.count = ctx.defaultCount;
        }

        assert(this._beats !== null);

        // Update the context to reflect the current note's duration.
        ctx.defaultCount = this.count;

        this.isWholeBar = this._beats === ctx.timeSignature.beats;

        this.getWholebarRestX = null;
        if (this.isWholebar && this.isRest) {
            var prev = ctx.prev();
            var next = ctx.next();
            this.getWholebarRestX = () => (prev.x && next.x) ? (prev.x + next.x) / 2 : this.x;
        }

        // Make sure the bar is not overfilled. Multi-bar rests are okay.
        if (ctx.isBeam || !this.inBeam) {
            if (this._beats > ctx.timeSignature.beats && ctx.beat >= ctx.timeSignature.beats) {
                // The current note/rest is multi-bar, which is allowed. However, multi-bar notes must
                // start at beat 0.
                return BarlineModel.createBarline(ctx, C.Barline.Standard);
            } else if (!this.isMultibar) {
                // The number of beats in a bar must not exceed that specified by the time signature.
                if (ctx.beat + this._beats > ctx.timeSignature.beats) {
                    var overfill = ctx.beat + this._beats - ctx.timeSignature.beats;
                    if (this._beats === overfill) {
                        var ret = BarlineModel.createBarline(ctx, C.Barline.Standard);
                        return ret;
                    } else {
                        var replaceWith = Metre.subtract(this, overfill, ctx).map(t =>
                            new DurationModel(<any>t, C.Source.ANNOTATOR));
                        var addAfterBar = Metre.subtract(this, this._beats - overfill, ctx)
                            .map(t => new DurationModel(<any>t, C.Source.ANNOTATOR));
                        for (i = 0; i < replaceWith.length; ++i) {
                            replaceWith[i].chord = this.chord ? JSON.parse(JSON.stringify(this.chord)) : null;
                            if ((i + 1 !== replaceWith.length || addAfterBar.length) && !this.isRest) {
                                replaceWith[i].tie = true;
                            }
                        }
                        for (i = 0; i < addAfterBar.length; ++i) {
                            addAfterBar[i].chord = this.chord ? JSON.parse(JSON.stringify(this.chord)) : null;
                            if (i + 1 !== addAfterBar.length && !this.isRest) {
                                addAfterBar[i].tie = true;
                            }
                        }
                        BarlineModel.createBarline(ctx, C.Barline.Standard);
                        ctx.splice(ctx.idx, 0, replaceWith);
                        ctx.splice(ctx.idx + 1 + replaceWith.length, 1, addAfterBar);
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
            if (ctx.smallest > this._beats) {
                ctx.smallest = this._beats;
                return C.IterationStatus.RETRY_LINE;
            }

            // Each note's width has a linear component proportional to the log of its duration.
            this.annotatedExtraWidth = (Math.log(this._beats) - Math.log(ctx.smallest)) /
                DurationModel.log2 / 3;

            // The width of a line must not exceed that specified by the page layout.
            if ((ctx.x + this.getWidth(ctx) > ctx.maxX)) {
                status = NewlineModel.createNewline(ctx);
            }
            if (status !== C.IterationStatus.SUCCESS) { return status; }
        }

        // Beams must follow the beam patterns
        if ((ctx.isBeam || !this.inBeam) && this.hasFlagOrBeam && !this.perfectlyBeamed(ctx)) {
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
        if (DurationModel.getAverageLine(this, ctx) === 3) {
            this.forceMiddleNoteDirection = NaN;
            status = this.decideMiddleLineStemDirection(ctx);
        }
        if (status !== C.IterationStatus.SUCCESS) { return status; }

        // Copy information the view needs from the context.
        this.lines = DurationModel.getLines(this, ctx);

        if (!ctx.isBeam) {
            ctx.beat = (ctx.beat || 0) + this._beats;
        }

        if (!ctx.isBeam && this.inBeam) {
            this._handleTie(ctx);
            return C.IterationStatus.SUCCESS;
        } else if (!this.inBeam) {
            this._handleTie(ctx);
        }

        this.x = ctx.x;

        // Set which accidentals are displayed, and then update the accidentals currently
        // active in the bar.
        this.displayedAccidentals = this.getAccidentals(ctx);
        for (i = 0; i < this.chord.length; ++i) {
            ctx.accidentals[this.chord[i].pitch] = this.chord[i].acc;
        }

        ctx.x += this.getWidth(ctx);
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");

        return C.IterationStatus.SUCCESS;
    }

    constructor(spec: C.IPitchDuration, source: C.Source) {
        super(spec);
        if (!isNaN(source)) {
            this.source = source;
        }
        this.tie = this.tie;
    }

    containsAccidental(ctx: Annotator.Context, previewMode?: C.PreviewMode) {
        var nonAccidentals = KeySignatureModel.getAccidentals(ctx.keySignature);
        var pitches: Array<C.IPitch> = this.chord;
        for (var i = 0; i < pitches.length; ++i) {
            if (!isNaN(pitches[i].accTemporary) && pitches[i].accTemporary !== null) {
                continue;
            }
            if ((nonAccidentals[pitches[i].pitch]||0) !== (pitches[i].acc||0)) {
                return true;
            }
        }
        return false;
    }
    perfectlyBeamed(ctx: Annotator.Context) {
        var rebeamable = Metre.rebeamable(ctx.idx, ctx);
        if (rebeamable) {
            DurationModel.BEAMDATA = rebeamable;
        }
        return !rebeamable;
    }

    decideMiddleLineStemDirection(ctx: Annotator.Context): C.IterationStatus {
        var prevLine: number = ctx.prev() && ctx.prev().isNote ?
                DurationModel.getAverageLine(ctx.prev().note, ctx) : null;
        var nextLine: number = ctx.next() && ctx.next().isNote ?
                DurationModel.getAverageLine(ctx.next().note, ctx) : null;

        if ((nextLine !== null) && ctx.beat + this._beats + ctx.next().note
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
            var startsAt = ctx.beat;
            var endsAt = ctx.beat + this._beats;

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


    getAccWidth(ctx: Annotator.Context) {
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

    getWidth(ctx: Annotator.Context) {
        return 0.67 + (this.annotatedExtraWidth || 0);
    }

    toLylite(lylite: Array<string>, unresolved?: Array<(obj: Model) => boolean>) {
        var i: number;
        for (i = 0; this.markings && i < this.markings.length; ++i) {
            switch (this.markings[i]) {
                case "keyboardPedalPed":
                case "keyboardPedalUp":
                case "keyboardPedalHalf2":
                case "keyboardPedalHalf3":
                case "keyboardPedalHalf2":
                case "keyboardPedalUpSpecial":
                    lylite.push("\set Staff.pedalSustainStyle = #'text");
                    // 1
                    break;
                case "keyboardPedalHalf":
                case "keyboardPedalUpNotch":
                case "keyboardPedalUpSpecial":
                case "keyboardLeftPedalPictogram":
                case "keyboardMiddlePedalPictogram":
                case "keyboardRightPedalPictogram":
                case "keyboardPedalHeel1":
                    lylite.push("\set Staff.pedalSustainStyle = #'mixed");
            }
        }
        var str: string;
        if (this.chord.length === 1) {
            str = this._lyPitch(this.chord[0]);
        } else if (this.chord) {
            str = "< " + _.map(this.chord, a => this._lyPitch(a)).join(" ") + " >";
        }
        str += this.count;
        if (this.dots) {
            _.times(this.dots, d => str += ".");
        }
        for (i = 0; this.markings && i < this.markings.length; ++i) {
            switch (this.markings[i]) {
                case "fermata":
                    if (this.isMultibar) {
                        str += "\\fermataMarkup";
                    } else {
                        str += "\\fermata";
                    }
                    break;
                case "breathMarkComma":
                    unresolved.push((obj) => {
                        lylite.push("\\rcomma");
                        return true;
                    });
                    break;
                case "caesura":
                    unresolved.push((obj) => {
                        lylite.push("\\override BreathingSign.text = \\markup { \\musicglyph #\"scripts.caesura.straight\"");
                        lylite.push("\\breathe\n");
                        return true;
                    });
                    break;

                default:
                    var sym = DurationModel.lilypondSymbols[this.markings[i]];
                    if (sym) {
                        str += sym;
                    } else {
                        assert(false, "Unknown or misplaced marking");
                    }
            }
        }
        if (this.tie) {
            str += "~";
        }
        lylite.push(str);
    }
    static lilypondSymbols: { [key: string]: string } = {
        "articAccent": "->",
        "articStaccato": "-.",
        "articTenuto": "--",
        "articMarcato": "-^",
        "articMarcatoStaccato": "-^-.",
        "articAccentStaccato": "->-.",
        "articTenutoStaccato": "---.",
        "articTenutoAccent": "--->",
        "ornamentTrill": "\\trill",
        "ornamentTurn": "\\turn",
        "ornamentMordent": "\\mordent",
        "ornamentHaydn": "\\_ripienoHaydn", // non-std
        // dynamicCrescendoHairpin: \\< \\!
        // dynamicDiminuendoHairpin: \\> \\!
        "dynamicPPP": "\\ppp",
        "dynamicPP": "\\pp",
        "dynamicPiano": "\\p",
        "dynamicMP": "\\mp",
        "dynamicMF": "\\mf",
        "dynamicForte": "\\f",
        "dynamicFF": "\\ff",
        "dynamicFFF": "\\ff",
        "dynamicForzando": "\\fz",
        "dynamicSforzando1": "\\sf",
        "dynamicSforzandoPiano": "\\sfp",
        "dynamicSforzandoPianissimo": "\\sfpp",
        "glissandoUp": "\\glissando",
        "glissandoDown": "\\glissando",
        "articStress": "\\_ripienoStress", // non-std
        "articUnstress": "\\_ripienoUnstress", // non-std
        "articLaissezVibrer": "\\laissezVibrer",
        "articStaccatissimo": "-|",
        "articStaccatissimoWedge": "\\_ripienoStaccatissimoWedge", // non-str
        "articStaccatissimoStroke": "\\_ripienoStaccatissimoStroke",

        "dynamicNiente": "\\_ripienoNiente",
        "dynamicPPPP": "\\pppp",
        "dynamicFFFF": "\\ffff",
        "dynamicPF": "\\pf",
        "dynamicFortePiano": "\\fp",
        // Repeats should not be handled here.
        "dynamicSforzato": "\\sfz",
        "dynamicSforzatoPiano": "\\sfzp",
        "dynamicSforzatoFF": "\\sffz",
        "dynamicRinforzando1": "\\rf",
        "dynamicRinforzando2": "\\rfz",

        "brassScoop": "\\_ripienoScoop",
        "brassDoitShort": "\\_ripienoDoitShort",
        "brassDoitMedium": "\\_ripienoDoitMedium",
        "brassDoitLong": "\\_ripienoDoitLong",
        "brassPlop": "\\_ripienoPlop",
        "brassFallLipShort": "\\_ripienoFallLipShort",
        "brassFallLipMedium": "\\_ripienoFallLipMedium",
        "brassFallLipLong": "\\_ripienoFallLipLong",
        "brassFallSmoothShort": "\\_ripienoFallSmoothShort",
        "brassFallSmoothMedium": "\\_ripienoFallSmoothMedium",
        "brassFallSmoothLong": "\\_ripienoFallSmoothLong",
        "brassFallRoughShort": "\\_ripienoFallSmoothShort",
        "brassFallRoughMedium": "\\_ripienoFallSmoothMedium",
        "brassFallRoughLong": "\\_ripienoFallSmoothLong",

        "brassFlip": "\\_ripienoFlip",
        "brassSmear": "\\_ripienoSmear",

        "brassBend": "\\_ripienoBend",
        "brassJazzTurn": "\\_ripienoTurn",
        "brassMuteClosed": "\\_ripienoMuteClosed",
        "brassMuteHalfClosed": "\\_ripienoMuteHalfClosed",
        "brassMuteOpen": "\\_ripienoMuteOpen",
        "brassHarmonMuteClosed": "\\_ripienoHarmonMuteClosed",
        "brassHarmonMuteStemHalfLeft": "\\_ripienoHarmonMuteStemHalfLeft",
        "brassHarmonMuteStemHalfRight": "\\_ripienoHarmonMuteStemHalfRight",
        "brassHarmonMuteStemOpen": "\\_ripienoHarmonMuteStemOpen",
        "doubleTongue": "\\_ripienodoubleTongue",
        "tripleTongue": "\\_ripienotripleTongue",
        "windClosedHole": "\\_ripienoWindClosedHole",
        "windThreeQuartersClosedHole": "\\_ripienoWindThreeQuartersClosedHole",
        "windHalfClosedHole1": "\\_ripienoWindHalfClosedHole1",
        "windHalfClosedHole2": "\\_ripienoWindHalfClosedHole2",
        "windHalfClosedHole3": "\\_ripienoWindHalfClosedHole3",
        "windOpenHole": "\\_ripienoWindOpenHole",
        "windTrillKey": "\\_ripienoWindTrillKey",
        "windFlatEmbouchure": "\\_ripienoWindFlatEmbouchure",
        "windSharpEmbouchure": "\\_ripienoWindSharpEmbouchure",
        "windRelaxedEmbouchure": "\\_ripienoWindRelaxedEmbouchure",
        "windLessRelaxedEmbouchure": "\\_ripienoWindLessRelaxedEmbouchure",
        "windTightEmbouchure": "\\_ripienoWindTightEmbouchure",
        "windLessTightEmbouchure": "\\_ripienoWindLessTightEmbouchure",
        "windVeryTightEmbouchure": "\\_ripienoWindVeryTightEmbouchure",
        "windWeakAirPressure": "\\_ripienoWindWeakAirPressure",
        "windStrongAirPressure": "\\_ripienoWindStrongAirPressure",
        "windReedPositionNormal": "\\_ripienoWindReedPositionNormal",
        "windReedPositionOut": "\\_ripienoWindReedPositionOut",
        "windReedPositionIn": "\\_ripienoWindReedPositionIn",
        "windMultiphonicsBlackStem": "\\_ripienoWindMultiphonicsBlackStem",
        "windMultiphonicsWhiteStem": "\\_ripienoWindMultiphonicsWhiteStem",
        "windMultiphonicsBlackWhiteStem": "\\_ripienoWindMultiphonicsBlackWhiteStem",
        "stringsDownBow": "\\downbow",
        "stringsUpBow": "\\upbow",
        "stringsDownBowTurned": "\\_ripienoDownbowTurned",
        "stringsUpBowTurned": "\\_ripienoUpbowTurned",
        "stringsHarmonic": "\\flageolet",
        "stringsHalfHarmonic": "\\_ripienoHalfHarmonic",
        "stringsMuteOn": "\\_ripienoMuteOn",
        "stringsMuteOff": "\\_ripienoMuteOff",
        "stringsBowBehindBridge": "\\_ripienoBowBeingBridge",
        "stringsBowOnBridge": "\\_ripienoBowOnBridge",
        "stringsBowOnTailpiece": "\\_ripienoBowOnTailpiece",
        "stringsChangeBowDirection": "\\_ripienoChangeBowDirection",
        "stringsOverpressureDownBow": "\\_ripienoOverpressureDownBow",
        "stringsOverpressureUpBow": "\\_ripienoOverpressureUpBow",
        "stringsOverpressurePossibileDownBow": "\\_ripienoOverpressurePossibleDownBow",
        "stringsOverpressurePossibileUpBow": "\\_ripienoOverpressurePossibleUpBow",
        "stringsOverpressureNoDirection": "\\_ripienoOverpressureNoDirection",
        "stringsJete": "\\_ripienoJete",
        "stringsFouette": "\\_ripienoFouette",
        "stringsVibratoPulse": "\\_ripienoVibratoPulse",
        "stringsThumbPosition": "\\_ripienoThumbPosition",
        "pluckedSnapPizzicatoAbove": "\\snappizzicato",
        "pluckedBuzzPizzicato": "\\_ripienoBuzzPizzicato",
        "pluckedLeftHandPizzicato": "\\_ripienoPluckedLeftHandPizzicato",
        "pluckedWithFingernails": "\\_ripienoPluckedWithFingernails",
        "pluckedFingernailFlick": "\\_ripienoPluckedFingernailFlick",
        "pluckedDamp": "\\_ripienoPluckedDamp",
        "pluckedDampAll": "\\_ripienoPluckedDampAll",
        "pluckedPlectrum": "\\_ripienoPluckedPlectrum",
        "pluckedDampOnStem": "\\_ripienoPluckedDampOnStem",
        "vocalMouthClosed": "\\_ripienovocalMouthClosed",
        "vocalMouthSlightlyOpen": "\\_ripienovocalMouthSlightlyOpen",
        "vocalMouthOpen": "\\_ripienovocalMouthOpen",
        "vocalMouthWideOpen": "\\_ripienovocalMouthWideOpen",
        "vocalMouthPursed": "\\_ripienovocalMouthPursed",
        "vocalSprechgesang": "\\_ripienovocalSprechgesang",
        "vocalsSussurando": "\\_ripienovocalsSussurando",

        "keyboardPedalPed": "\\sustainOn",
        "keyboardPedalUp": "\\sustainOff",
        "keyboardPedalHalf2": "\\_ripienoHalf2",
        "keyboardPedalHalf3": "\\_ripienoHalf3",
        "keyboardPedalHalf": "\\_ripienoHalf",
        "keyboardPedalUpNotch": "\\sustainOff\\sustainOn",
        "keyboardPedalUpSpecial": "\\_ripienoKeyboardPedalUpSpecial",
        "keyboardPedalSost": "\\sostenuntoOn",
        "keyboardLeftPedalPictogram": "\\_ripienoKeyboardLeftPedalPictogram",
        "keyboardMiddlePedalPictogram": "\\_ripienoKeyboardMiddlePedalPictogram",
        "keyboardRightPedalPictogram": "\\_ripienoKeyboardRightPedalPictogram",
        "keyboardPedalHeel1": "\\_ripienoKeyboardPedalHeel1",
        "keyboardPedalToe1": "\\_ripienoKeyboardPedalToe1",
        "keyboardPedalHeelToe": "\\_ripienoKeyboardPedalHeelToe",
        "keyboardPluckInside": "\\_ripienoKeyboardPluckInside",
        "keyboardBebung2Dots": "\\_ripienoKeyboardBebung2Dots",
        "keyboardBebung3Dots": "\\_ripienoKeyboardBebung3Dots",
        "keyboardBebung4Dots": "\\_ripienoKeyboardBebung4Dots",
        "keyboardPlayWithRH": "\\_ripienoKeyboardPlayWithRH",
        "keyboardPlayWithRHEnd": "\\_ripienoKeyboardPlayWithRHEnd",
        "keyboardPlayWithLH": "\\_ripienoKeyboardPlayWithLH",
        "keyboardPlayWithLHEnd": "\\_ripienoKeyboardPlayWithLHEnd",
        "harpPedalRaised": "\\_ripienoharpPedalRaised",
        "harpPedalCentered": "\\_ripienoharpPedalCentered",
        "harpPedalLowered": "\\_ripienoharpPedalLowered",
        "harpPedalDivider": "\\_ripienoharpPedalDivider",
        "harpSalzedoSlideWithSuppleness": "\\_ripienoHarpSalzedoSlideWithSuppleness",
        "harpSalzedoOboicFlux": "\\_ripienoHarpSalzedoOboicFlux",
        "harpSalzedoThunderEffect": "\\_ripienoHarpSalzedoThunderEffect",
        "harpSalzedoWhistlingSounds": "\\_ripienoHarpSalzedoWhistlingSounds",
        "harpSalzedoMetallicSounds": "\\_ripienoHarpSalzedoMetallicSounds",
        "harpSalzedoTamTamSounds": "\\_ripienoHarpSalzedoTamTamSounds",
        "harpSalzedoPlayUpperEnd": "\\_ripienoHarpSalzedoPlayUpperEnd",
        "harpSalzedoTimpanicSounds": "\\_ripienoHarpSalzedoTimpanicSounds",
        "harpSalzedoMuffleTotally": "\\_ripienoHarpSalzedoMuffleTotally",
        "harpSalzedoFluidicSoundsLeft": "\\_ripienoHarpSalzedoFluidicSoundsLeft",
        "harpSalzedoFluidicSoundsRight": "\\_ripienoHarpSalzedoFluidicSoundsRight",
        "harpMetalRod": "\\_ripienoHarpMetalRod",
        "harpTuningKey": "\\_ripienoHarpTuningKey",
        "harpTuningKeyHandle": "\\_ripienoHarpTuningKeyHandle",
        "harpTuningKeyShank": "\\_ripienoHarpTuningKeyShank",
        "harpTuningKeyGlissando": "\\_ripienoHarpTuningKeyGlissando",
        "harpStringNoiseStem": "\\_ripienoHarpStringNoiseStem",
        "pictGlsp": "\\_ripienoPictGlsp",
        "pictXyl": "\\_ripienoPictXyl",
        "pictXylTenor": "\\_ripienoPictXylTenor",
        "pictXylBass": "\\_ripienoPictXylBass",
        "pictXylTrough": "\\_ripienoPictXylTrough",
        "pictXylTenorTrough": "\\_ripienoPictXylTenorTrough",
        "pictMar": "\\_ripienoPictMar",
        "pictVib": "\\_ripienoPictVib",
        "pictVibMotorOff": "\\_ripienoPictVibMotorOff",
        "pictEmptyTrap": "\\_ripienoPictEmptyTrap",
        "pictGlspSmithBrindle": "\\_ripienoPictGlspSmithBrindle",
        "pictXylSmithBrindle": "\\_ripienoPictXylSmithBrindle",
        "pictMarSmithBrindle": "\\_ripienoPictMarSmithBrindle",
        "pictVibSmithBrindle": "\\_ripienoPictVibSmithBrindle",
        "pictCrotales": "\\_ripienoPictCrotales",
        "pictSteelDrums": "\\_ripienoPictSteelDrums",
        "pictCelesta": "\\_ripienoPictCelesta",
        "pictLithophone": "\\_ripienoPictLithophone",
        "pictTubaphone": "\\_ripienoPictTubaphone",
        "pictTubularBells": "\\_ripienoPictTubularBells",
        "pictWindChimesGlass": "\\_ripienoPictWindChimesGlass",
        "pictChimes": "\\_ripienoPictChimes",
        "pictBambooChimes": "\\_ripienoPictBambooChimes",
        "pictShellChimes": "\\_ripienoPictShellChimes",
        "pictGlassTubeChimes": "\\_ripienoPictGlassTubeChimes",
        "pictGlassPlateChimes": "\\_ripienoPictGlassPlateChimes",
        "pictMetalTubeChimes": "\\_ripienoPictMetalTubeChimes",
        "pictMetalPlateChimes": "\\_ripienoPictMetalPlateChimes",
        "pictWoodBlock": "\\_ripienoPictWoodBlock",
        "pictTempleBlocks": "\\_ripienoPictTempleBlocks",
        "pictClaves": "\\_ripienoPictClaves",
        "pictGuiro": "\\_ripienoPictGuiro",
        "pictRatchet": "\\_ripienoPictRatchet",
        "pictFootballRatchet": "\\_ripienoPictFootballRatchet",
        "pictWhip": "\\_ripienoPictWhip",
        "pictBoardClapper": "\\_ripienoPictBoardClapper",
        "pictCastanets": "\\_ripienoPictCastanets",
        "pictCastanetsWithHandle": "\\_ripienoPictCastanetsWithHandle",
        "pictQuijada": "\\_ripienoPictQuijada",
        "pictBambooScraper": "\\_ripienoPictBambooScraper",
        "pictRecoReco": "\\_ripienoPictRecoReco",
        "pictTriangle": "\\_ripienoPictTriangle",
        "pictAnvil": "\\_ripienoPictAnvil",
        "pictCrashCymbals": "\\_ripienoPictCrashCymbals",
        "pictSuspendedCymbal": "\\_ripienoPictSuspendedCymbal",
        "pictHiHat": "\\_ripienoPictHiHat",
        "pictHiHatOnStand": "\\_ripienoPictHiHatOnStand",
        "pictSizzleCymbal": "\\_ripienoPictSizzleCymbal",
        "pictVietnameseHat": "\\_ripienoPictVietnameseHat",
        "pictChineseCymbal": "\\_ripienoPictChineseCymbal",
        "pictFingerCymbals": "\\_ripienoPictFingerCymbals",
        "pictCymbalTongs": "\\_ripienoPictCymbalTongs",
        "pictBellOfCymbal": "\\_ripienoPictBellOfCymbal",
        "pictEdgeOfCymbal": "\\_ripienoPictEdgeOfCymbal",
        "pictTamTam": "\\_ripienoPictTamTam",
        "pictTamTamWithBeater": "\\_ripienoPictTamTamWithBeater",
        "pictGong": "\\_ripienoPictGong",
        "pictGongWithButton": "\\_ripienoPictGongWithButton",
        "pictSlideBrushOnGong": "\\_ripienoPictSlideBrushOnGong",
        "pictFlexatone": "\\_ripienoPictFlexatone",
        "pictMaraca": "\\_ripienoPictMaraca",
        "pictMaracas": "\\_ripienoPictMaracas",
        "pictCabasa": "\\_ripienoPictCabasa",
        "pictThundersheet": "\\_ripienoPictThundersheet",
        "pictVibraslap": "\\_ripienoPictVibraslap",
        "pictSistrum": "\\_ripienoPictSistrum",
        "pictRainstick": "\\_ripienoPictRainstick",
        "pictChainRattle": "\\_ripienoPictChainRattle",
        "pictSlideWhistle": "\\_ripienoPictSlideWhistle",
        "pictBirdWhistle": "\\_ripienoPictBirdWhistle",
        "pictPoliceWhistle": "\\_ripienoPictPoliceWhistle",
        "pictSiren": "\\_ripienoPictSiren",
        "pictWindMachine": "\\_ripienoPictWindMachine",
        "pictCarHorn": "\\_ripienoPictCarHorn",
        "pictKlaxonHorn": "\\_ripienoPictKlaxonHorn",
        "pictDuckCall": "\\_ripienoPictDuckCall",
        "pictWindWhistle": "\\_ripienoPictWindWhistle",
        "pictMegaphone": "\\_ripienoPictMegaphone",
        "pictLotusFlute": "\\_ripienoPictLotusFlute",
        "pictPistolShot": "\\_ripienoPictPistolShot",
        "pictCannon": "\\_ripienoPictCannon",
        "pictSandpaperBlocks": "\\_ripienoPictSandpaperBlocks",
        "pictLionsRoar": "\\_ripienoPictLionsRoar",
        "pictGlassHarp": "\\_ripienoPictGlassHarp",
        "pictGlassHarmonica": "\\_ripienoPictGlassHarmonica",
        "pictMusicalSaw": "\\_ripienoPictMusicalSaw",
        "pictJawHarp": "\\_ripienoPictJawHarp",
        "pictBeaterSoftXylophoneUp": "\\_ripienoPictBeaterSoftXylophoneUp",
        "pictBeaterMediumXylophoneUp": "\\_ripienoPictBeaterMediumXylophoneUp",
        "pictBeaterHardXylophoneUp": "\\_ripienoPictBeaterHardXylophoneUp",
        "pictBeaterWoodXylophoneUp": "\\_ripienoPictBeaterWoodXylophoneUp",
        "pictBeaterSoftGlockenspielUp": "\\_ripienoPictBeaterSoftGlockenspielUp",
        "pictBeaterHardGlockenspielUp": "\\_ripienoPictBeaterHardGlockenspielUp",
        "pictBeaterSoftTimpaniUp": "\\_ripienoPictBeaterSoftTimpaniUp",
        "pictBeaterHardTimpaniUp": "\\_ripienoPictBeaterHardTimpaniUp",
        "pictBeaterMediumTimpaniUp": "\\_ripienoPictBeaterMediumTimpaniUp",
        "pictBeaterWoodTimpaniUp": "\\_ripienoPictBeaterWoodTimpaniUp",
        "pictBeaterSoftBassDrumUp": "\\_ripienoPictBeaterSoftBassDrumUp",
        "pictBeaterHardBassDrumUp": "\\_ripienoPictBeaterHardBassDrumUp",
        "pictBeaterMediumBassDrumUp": "\\_ripienoPictBeaterMediumBassDrumUp",
        "pictBeaterMetalBassDrumUp": "\\_ripienoPictBeaterMetalBassDrumUp",
        "pictBeaterSuperballUp": "\\_ripienoPictBeaterSuperballUp",
        "pictWoundHardUp": "\\_ripienoPictWoundHardUp",
        "pictGumSoftUp": "\\_ripienoPictGumSoftUp",
        "pictGumMediumUp": "\\_ripienoPictGumMediumUp",
        "pictGumHardUp": "\\_ripienoPictGumHardUp",
        "pictBeaterMetalUp": "\\_ripienoPictBeaterMetalUp",
        "pictBeaterHammerWoodUp": "\\_ripienoPictBeaterHammerWoodUp",
        "pictBeaterHammerPlasticUp": "\\_ripienoPictBeaterHammerPlasticUp",
        "pictBeaterHammerMetalUp": "\\_ripienoPictBeaterHammerMetalUp",
        "pictBeaterSnareSticksUp": "\\_ripienoPictBeaterSnareSticksUp",
        "pictBeaterJazzSticksUp": "\\_ripienoPictBeaterJazzSticksUp",
        "pictBeaterTriangleUp": "\\_ripienoPictBeaterTriangleUp",
        "pictBeaterWireBrushesUp": "\\_ripienoPictBeaterWireBrushesUp",
        "pictBeaterBrassMalletsUp": "\\_ripienoPictBeaterBrassMalletsUp",
        "pictBeaterSoftXylophoneDown": "\\_ripienoPictBeaterSoftXylophoneDown",
        "pictBeaterMediumXylophoneDown": "\\_ripienoPictBeaterMediumXylophoneDown",
        "pictBeaterHardXylophoneDown": "\\_ripienoPictBeaterHardXylophoneDown",
        "pictBeaterWoodXylophoneDown": "\\_ripienoPictBeaterWoodXylophoneDown",
        "pictBeaterSoftGlockenspielDown": "\\_ripienoPictBeaterSoftGlockenspielDown",
        "pictBeaterHardGlockenspielDown": "\\_ripienoPictBeaterHardGlockenspielDown",
        "pictBeaterSoftTimpaniDown": "\\_ripienoPictBeaterSoftTimpaniDown",
        "pictBeaterHardTimpaniDown": "\\_ripienoPictBeaterHardTimpaniDown",
        "pictBeaterMediumTimpaniDown": "\\_ripienoPictBeaterMediumTimpaniDown",
        "pictBeaterWoodTimpaniDown": "\\_ripienoPictBeaterWoodTimpaniDown",
        "pictBeaterSoftBassDrumDown": "\\_ripienoPictBeaterSoftBassDrumDown",
        "pictBeaterHardBassDrumDown": "\\_ripienoPictBeaterHardBassDrumDown",
        "pictBeaterMediumBassDrumDown": "\\_ripienoPictBeaterMediumBassDrumDown",
        "pictBeaterMetalBassDrumDown": "\\_ripienoPictBeaterMetalBassDrumDown",
        "pictBeaterSuperballDown": "\\_ripienoPictBeaterSuperballDown",
        "pictWoundHardDown": "\\_ripienoPictWoundHardDown",
        "pictGumSoftDown": "\\_ripienoPictGumSoftDown",
        "pictGumMediumDown": "\\_ripienoPictGumMediumDown",
        "pictGumHardDown": "\\_ripienoPictGumHardDown",
        "pictBeaterMetalDown": "\\_ripienoPictBeaterMetalDown",
        "pictBeaterHammerWoodDown": "\\_ripienoPictBeaterHammerWoodDown",
        "pictBeaterHammerPlasticDown": "\\_ripienoPictBeaterHammerPlasticDown",
        "pictBeaterHammerMetalDown": "\\_ripienoPictBeaterHammerMetalDown",
        "pictBeaterSnareSticksDown": "\\_ripienoPictBeaterSnareSticksDown",
        "pictBeaterJazzSticksDown": "\\_ripienoPictBeaterJazzSticksDown",
        "pictBeaterTriangleDown": "\\_ripienoPictBeaterTriangleDown",
        "pictBeaterWireBrushesDown": "\\_ripienoPictBeaterWireBrushesDown",
        "pictBeaterBrassMalletsDown": "\\_ripienoPictBeaterBrassMalletsDown",
        "pictBeaterDoubleBassDrumUp": "\\_ripienoPictBeaterDoubleBassDrumUp",
        "pictBeaterSoftYarnUp": "\\_ripienoPictBeaterSoftYarnUp",
        "pictBeaterHardYarnUp": "\\_ripienoPictBeaterHardYarnUp",
        "pictBeaterMediumYarnUp": "\\_ripienoPictBeaterMediumYarnUp",
        "pictBeaterDoubleBassDrumDown": "\\_ripienoPictBeaterDoubleBassDrumDown",
        "pictBeaterSoftYarnDown": "\\_ripienoPictBeaterSoftYarnDown",
        "pictBeaterHardYarnDown": "\\_ripienoPictBeaterHardYarnDown",
        "pictBeaterMediumYarnDown": "\\_ripienoPictBeaterMediumYarnDown",
        "pictSuperball": "\\_ripienoPictSuperball",
        "pictBeaterSoftXylophone": "\\_ripienoPictBeaterSoftXylophone",
        "pictBeaterSpoonWoodenMallet": "\\_ripienoPictBeaterSpoonWoodenMallet",
        "pictBeaterGuiroScraper": "\\_ripienoPictBeaterGuiroScraper",
        "pictBeaterBow": "\\_ripienoPictBeaterBow",
        "pictBeaterMallet": "\\_ripienoPictBeaterMallet",
        "pictBeaterMetalHammer": "\\_ripienoPictBeaterMetalHammer",
        "pictBeaterHammer": "\\_ripienoPictBeaterHammer",
        "pictBeaterKnittingNeedle": "\\_ripienoPictBeaterKnittingNeedle",
        "pictBeaterHand": "\\_ripienoPictBeaterHand",
        "pictBeaterFinger": "\\_ripienoPictBeaterFinger",
        "pictBeaterFist": "\\_ripienoPictBeaterFist",
        "pictBeaterFingernails": "\\_ripienoPictBeaterFingernails",
        "pictCoins": "\\_ripienoPictCoins",
        "pictDrumStick": "\\_ripienoPictDrumStick",
        "pictStickShot": "\\_ripienoPictStickShot",
        "pictScrapeCenterToEdge": "\\_ripienoPictScrapeCenterToEdge",
        "pictScrapeEdgeToCenter": "\\_ripienoPictScrapeEdgeToCenter",
        "pictScrapeAroundRim": "\\_ripienoPictScrapeAroundRim",
        "pictOnRim": "\\_ripienoPictOnRim",
        "pictOpenRimShot": "\\_ripienoPictOpenRimShot",
        "pictHalfOpen1": "\\_ripienoPictHalfOpen1",
        "pictHalfOpen2": "\\_ripienoPictHalfOpen2",
        "pictOpen": "\\_ripienoPictOpen",
        "pictDamp1": "\\_ripienoPictDamp1",
        "pictRimShotOnStem": "\\_ripienoPictRimShotOnStem",
        "pictCenter1": "\\_ripienoPictCenter1",
        "pictRim1": "\\_ripienoPictRim1",
        "pictNormalPosition": "\\_ripienoPictNormalPosition",
        "pictChokeCymbal": "\\_ripienoPictChokeCymbal",
        "pictRightHandSquare": "\\_ripienoPictRightHandSquare",
        "pictLeftHandCircle": "\\_ripienoPictLeftHandCircle",
        "pictSwishStem": "\\_ripienoPictSwishStem",
        "pictTurnRightStem": "\\_ripienoPictTurnRightStem",
        "pictTurnLeftStem": "\\_ripienoPictTurnLeftStem",
        "pictTurnRightLeftStem": "\\_ripienoPictTurnRightLeftStem",
        "pictCrushStem": "\\_ripienoPictCrushStem",
        "pictDeadNoteStem": "\\_ripienoPictDeadNoteStem",
        "handbellsMartellato": "\\_ripienoHandbellsMartellato",
        "handbellsMalletBellSuspended": "\\_ripienoHandbellsMalletBellSuspended",
        "handbellsMalletBellOnTable": "\\_ripienoHandbellsMalletBellOnTable",
        "handbellsMalletLft": "\\_ripienoHandbellsMalletLft",
        "handbellsPluckLift": "\\_ripienoHandbellsPluckLift",
        "handbellsSwingUp": "\\_ripienoHandbellsSwingUp",
        "handbellsSwingDown": "\\_ripienoHandbellsSwingDown",
        "handbellsSwing": "\\_ripienoHandbellsSwing",
        "handbellsEcho1": "\\_ripienoHandbellsEcho1",
        "handbellsGyro": "\\_ripienoHandbellsGyro",
        "handbellsDamp3": "\\_ripienoHandbellsDamp3",
        "handbellsBelltree": "\\_ripienoHandbellsBelltree",
        "handbellsTableSingleBell": "\\_ripienoHandbellsTableSingleBell",
        "handbellsTablePairBells": "\\_ripienoHandbellsTablePairBells",
        "analyticsHauptstimme": "\\_ripienoAnalyticsHauptstimme",
        "analyticsNebenstimme": "\\_ripienoAnalyticsNebenstimme",
        "analyticsStartStimme": "\\_ripienoAnalyticsStartStimme",
        "analyticsEndStimme": "\\_ripienoAnalyticsEndStimme",
        "analyticsTheme": "\\_ripienoAnalyticsTheme",
        "analyticsThemeRetrograde": "\\_ripienoAnalyticsThemeRetrograde",
        "analyticsThemeRetrogradeInversion": "\\_ripienoAnalyticsThemeRetrogradeInversion",
        "analyticsThemeInversion": "\\_ripienoAnalyticsThemeInversion",
        "analyticsTheme1": "\\_ripienoAnalyticsTheme1",
        "analyticsInversion1": "\\_ripienoAnalyticsInversion1",
        "conductorStrongBeat": "\\_ripienoConductorStrongBeat",
        "conductorLeftBeat": "\\_ripienoConductorLeftBeat",
        "conductorRightBeat": "\\_ripienoConductorRightBeat",
        "conductorWeakBeat": "\\_ripienoConductorWeakBeat",
        "conductorBeat2Simple": "\\_ripienoConductorBeat2Simple",
        "conductorBeat3Simple": "\\_ripienoConductorBeat3Simple",
        "conductorBeat4Simple": "\\_ripienoConductorBeat4Simple",
        "conductorBeat2Compound": "\\_ripienoConductorBeat2Compound",
        "conductorBeat3Compound": "\\_ripienoConductorBeat3Compound",
        "conductorBeat4Compound": "\\_ripienoConductorBeat4Compound"
    };
    static symbolByLilypondName: { [key: string]: string } = _.invert(DurationModel.lilypondSymbols);

    getBeats(ctx: C.MetreContext, inheritedCount?: number, force?: boolean) {
        if (!force && this._beats) {
            return this._beats;
        }
        return getBeats(
            this.count || inheritedCount,
            this.dots,
            this.getTuplet(),
            ctx.timeSignature);
    }

    getTuplet() {
        return DurationModel.getTuplet(this);
    }

    get accStrokes() {
        return _.map(this.chord, (c, idx) =>
            !isNaN(c.accTemporary) && c.accTemporary !== null || this.accToDelete === idx ? "#A5A5A5" : "#000000");
    }

    get annotatedExtraWidth() {
        return this._annotatedExtraWidth;
    }

    set annotatedExtraWidth(w: number) {
        this._annotatedExtraWidth = w;
    }

    get count() {
        return this._count;
    }

    set count(n: number) {
        assert(!isNaN(n));
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
        this._displayDots = null; // Kill preview.
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
        assert(c !== null);
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
        return this._displayDots === undefined ? this.dots : this._displayDots;
    }

    set displayDots(c: number) {
        this._displayDots = c;
    }

    get displayMarkings(): Array<string> {
        return this._displayMarkings || this._markings;
    }

    set displayMarkings(m: Array<string>) {
        this._displayMarkings = m;
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

    get hasFlagOrBeam() {
        return DurationModel.countToIsBeamable[this.count];
    }

    get isMultibar() {
        return this.count < 1;
    }

    get isRest() {
        return (this.chord && this.chord.length === 1 && this.chord[0].pitch === "r");
    }

    set isRest(r: boolean) {
        assert(!!r, "Instead, set the exact pitch or chord...");
        this.chord = [{
            pitch: "r",
            acc: null,
            octave: null
        }];
        this.tie = false;
    }

    get isNote() : boolean {
        return true;
    }

    get markings() {
        return this._markings;
    }

    set markings(m: Array<string>) {
        this._markings = m;
        this._displayMarkings = null;
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
                    (this.selected ? "#75A1D0" : "#000000"));
        }
        return [this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000" )];
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

    static getAverageLine = (note: C.IPitchDuration, ctx: Annotator.Context) => {
        var lines = DurationModel.getLines(note, ctx, { filterTemporary: true });
        var sum = 0;
        for (var i = 0; i < lines.length; ++i) {
            sum += lines[i] / lines.length;
        }
        return sum;
    };

    static getLine = (pitch: C.IPitch,
            ctx: Annotator.Context, options?: { filterTemporary: boolean }): any => { // TSFIX
        options = options || {filterTemporary: false};

        if (pitch.isRest) {
            return 3;
        }

        if (!ctx) {
            assert(pitch.line !== undefined,
                    "Must be first annotated in duration.jsx");
            return pitch.line;
        }
        assert(ctx.clef, "A clef must be inserted before the first note");
        return DurationModel.clefOffsets[ctx.clef] +
            (pitch.octave || 0) * 3.5 + DurationModel.pitchOffsets[pitch.pitch];
    };

    static getLines = (note: C.IPitchDuration,
            ctx: Annotator.Context, options?: { filterTemporary: boolean }): Array<number> => {
        options = options || {filterTemporary: false};
        var ret: Array<number> = [];
        for (var i = 0; i < note.chord.length; ++i) {
            if (!options.filterTemporary || !note.chord[i].temporary) {
                ret.push(note.chord[i].isRest ? 3 :
                    DurationModel.clefOffsets[ctx.clef] +
                    (note.chord[i].octave || 0) * 3.5 +
                    DurationModel.pitchOffsets[note.chord[i].pitch]);
            }
        }
        return ret;
    };

    static getPitch = (line: number, ctx: Annotator.Context) => {
        assert(ctx.clef, "A clef must be inserted before the first note");
        var pitch = DurationModel.offsetToPitch[((
                line - DurationModel.clefOffsets[ctx.clef]) % 3.5 + 3.5) % 3.5];
        var acc = ctx.accidentals[pitch] || null;

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

    private getAccidentals(ctx: Annotator.Context) {
        var chord: Array<C.IPitch> = this.chord || <any> [this];
        var result = new Array(chord.length || 1);
        for (var i = 0; i < result.length; ++i) {
            var pitch: C.IPitch = chord[i];
            var actual = pitch.acc;
            assert(actual !== undefined);
            var target = ctx.accidentals[pitch.pitch] || null;

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

    private _handleTie(ctx: Annotator.Context) {
        if (this.tie) {
            var nextNote = ctx.next(obj => obj.isNote);
            if (nextNote.isRest) {
                this.tie = false;
                this.tieTo = null;
            } else {
                this.tieTo = <DurationModel> nextNote;
            }
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

    getWholebarRestX: () => number;

    get temporary(): boolean { return !!(this._flags & Flags.TEMPORARY); }
    set temporary(v: boolean) {
        if (v) { this._flags = this._flags | Flags.TEMPORARY;
        } else { this._flags = this._flags & ~Flags.TEMPORARY; } }

    get relative(): boolean { return !!(this._flags & Flags.RELATIVE); }
    set relative(v: boolean) {
        if (v) { this._flags = this._flags | Flags.RELATIVE;
        } else { this._flags = this._flags & ~Flags.RELATIVE; } }

    get isWholebar(): boolean { return !!(this._flags & Flags.WHOLE_BAR); }
    set isWholeBar(v: boolean) {
        if (v) { this._flags = this._flags | Flags.WHOLE_BAR;
        } else { this._flags = this._flags & ~Flags.WHOLE_BAR; } }

    get tie(): boolean { return !!(this._flags & Flags.TIE); }
    set tie(v: boolean) {
        assert(!this.isRest || !v);
        if (v) { this._flags = this._flags | Flags.TIE;
        } else { this._flags = this._flags & ~Flags.TIE; } }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            _count: this._count,
            _dots: this._dots,
            _markings: this._markings,
            chord: _.map(this.chord, pitch => sanitizePitch(pitch))
        });
    }

    private _annotatedExtraWidth: number;
    private _beats: number;
    private _color: number = 0x000000;
    private _count: number;
    private _displayCount: number;
    private _displayDots: number = undefined;
    private _displayMarkings: Array<string>;
    private _dots: number;
    private _markings: Array<string>;
    accToDelete: number;
    actualTuplet: C.ITuplet;
    chord: Array<C.IPitch>;
    displayedAccidentals: Array<number>;
    forceMiddleNoteDirection: number;
    impliedTS: {
        beats: number;
        beatType: number;
    };
    lines: Array<number>;
    tieTo: DurationModel;
    tuplet: C.ITuplet;

    get color(): string {
        var hex = this._color.toString(16);
        return "#" + "000000".substr(0, 6 - hex.length) + hex;
    }

    set color(a: string) {
        if (a.length && a[0] === "#") {
            a = a.slice(1);
        }
        this._color = parseInt(a, 16);
    }

    get beats(): number {
        assert(false);
        return NaN;
    }
    set beats(n: number) {
        assert(false);
    }
}

var getBeats = Metre.getBeats;

enum Flags {
    TEMPORARY = 2 << 7,
    RELATIVE = 2 << 8,
    WHOLE_BAR = 2 << 9,
    TIE = 2 << 10
}

function sanitizePitch(pitch: C.IPitch): C.IPitch {
    "use strict";
    return {
        acc: pitch.acc || null,
        octave: pitch.octave || null,
        pitch: pitch.pitch
    };
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = DurationModel;
