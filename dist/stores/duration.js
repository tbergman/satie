var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var _ = require("lodash");
var assert = require("assert");
var Annotator = require("./annotator");
var AttributesModel = require("./attributes");
var BarlineModel = require("./barline");
var C = require("./contracts");
var EndMarkerModel = require("./endMarker");
var KeySignatureModel = require("./keySignature");
var Metre = require("./metre");
var NewlineModel = require("./newline");
var TimeSignatureModel = require("./timeSignature");
var DurationModel = (function (_super) {
    __extends(DurationModel, _super);
    function DurationModel(spec, annotated) {
        var _this = this;
        _super.call(this, spec, annotated);
        var self = this;
        var properties = [
            "count",
            "dots",
            "displayCount",
            "displayDots",
            "displayNotation",
            "isRest",
            "tuplet",
            "displayTuplet",
            "chord",
            "_notes"
        ];
        _.forEach(properties, setIfDefined);
        if (!this._p_notes) {
            this._p_notes = _.map(this.chord, function (pitch, idx) {
                return new DurationModel.MXMLNote(_this, idx, {
                    pitch: pitch
                });
            });
        }
        if (spec.tieds) {
            this.tieds = spec.tieds;
        }
        function setIfDefined(property) {
            if (spec.hasOwnProperty(property)) {
                self[property] = spec[property];
            }
        }
    }
    Object.defineProperty(DurationModel.prototype, "fields", {
        get: function () {
            return ["_notes", "dots"];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "visible", {
        get: function () {
            return !this.inBeam && !this.soundOnly;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "isNote", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "note", {
        get: function () {
            return this;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "type", {
        get: function () {
            return 600 /* Duration */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "xPolicy", {
        get: function () {
            return 2 /* Min */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "isRest", {
        get: function () {
            return (this.chord && this.chord.length === 1 && this.chord[0].step === "R");
        },
        set: function (r) {
            if (!!r) {
                this.chord = [{
                    step: "R",
                    alter: null,
                    octave: null
                }];
                this.tieds = [null];
            }
            else {
                assert(!this.isRest, "Instead, set the exact pitch or chord...");
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "tieds", {
        get: function () {
            return _.chain(this._p_notes).map(function (n) { return n.notationObj.tieds; }).map(function (t) { return t && t.length ? t[0] : null; }).value();
        },
        set: function (v) {
            _.forEach(this._p_notes, function (n, i) {
                if (v[i]) {
                    n.ensureNotationsWrittable();
                    n.notationObj.tieds = [v[i]];
                }
                else {
                    delete n.notationObj.tieds;
                }
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "isWholebar", {
        get: function () {
            return this._getFlag(Flags.WHOLE_BAR);
        },
        set: function (v) {
            this._setFlag(Flags.WHOLE_BAR, v);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "count", {
        get: function () {
            return this._count;
        },
        set: function (n) {
            assert(!isNaN(n));
            this._count = n;
            this._divisions = null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "displayDots", {
        get: function () {
            if (this.isWholebar && this.isRest) {
                return 0;
            }
            return this._displayDots === void 0 || this._displayDots === null ? this.dots : this._displayDots;
        },
        set: function (c) {
            this._displayDots = c;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "tuplet", {
        get: function () {
            return this._tuplet;
        },
        set: function (t) {
            this._tuplet = t;
            this._displayTuplet = null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "displayTuplet", {
        get: function () {
            return this._displayTuplet || this._tuplet;
        },
        set: function (t) {
            this._displayTuplet = t;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "hasFlagOrBeam", {
        get: function () {
            return !!this.tuplet || !this.isRest && DurationModel.countToIsBeamable[this.count];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "temporary", {
        get: function () {
            return this._getFlag(Flags.TEMPORARY);
        },
        set: function (v) {
            this._setFlag(Flags.TEMPORARY, v);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "accStrokes", {
        get: function () {
            var _this = this;
            return _.map(this.chord, function (c, idx) { return (c.displayAlter !== null && c.displayAlter !== undefined || _this.accToDelete === idx) ? "#A5A5A5" : "#000000"; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "extraWidth", {
        get: function () {
            return this._extraWidth;
        },
        set: function (w) {
            assert(isFinite(w));
            this._extraWidth = w;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "direction", {
        get: function () {
            return isNaN(this.forceMiddleNoteDirection) ? undefined : this.forceMiddleNoteDirection;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "displayCount", {
        get: function () {
            return this._displayCount || this.count;
        },
        set: function (c) {
            assert(c !== null);
            this._displayCount = c;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "flag", {
        get: function () {
            return !this.inBeam && (this.displayCount in DurationModel.countToFlag) && DurationModel.countToFlag[this.displayCount];
        },
        set: function (a) {
            assert(false, "Read-only property");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "hasStem", {
        get: function () {
            return DurationModel.countToHasStem[this.displayCount];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "noteheadGlyph", {
        get: function () {
            return DurationModel.countToNotehead[this.displayCount];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "restHead", {
        get: function () {
            if (!isNaN(this.multiRest)) {
                return "restHBar";
            }
            if (this.isWholebar) {
                return DurationModel.countToRest[1];
            }
            return DurationModel.countToRest[this.count];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "strokes", {
        get: function () {
            var _this = this;
            return _.map(this.chord, function (c) { return c.temporary ? "#A5A5A5" : (_this.selected ? "#75A1D0" : "#000000"); });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "divisions", {
        get: function () {
            assert(isFinite(this._divisions));
            return this._divisions;
        },
        set: function (n) {
            assert(false, "Read-only property.");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "color", {
        get: function () {
            return this._notes[0].color;
        },
        set: function (c) {
            _.forEach(this._notes, function (n) {
                n.color = c;
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DurationModel.prototype, "_notes", {
        get: function () {
            return this._p_notes;
        },
        set: function (notes) {
            this.chord = this.chord || [];
            this.chord.length = notes.length;
            for (var i = 0; i < notes.length; ++i) {
                if (!(notes[i] instanceof DurationModel.MXMLNote)) {
                    notes[i] = new DurationModel.MXMLNote(this, i, notes[i]);
                }
            }
            this._p_notes = notes;
        },
        enumerable: true,
        configurable: true
    });
    DurationModel.prototype.modelDidLoad = function (body, idx) {
        for (var i = 0; i < this.chord.length; ++i) {
            if (this.chord[i].temporary) {
                this.chord.splice(i, 1);
                if (this._p_notes && i < this._p_notes.length) {
                    this._p_notes.splice(i, 1);
                }
            }
        }
    };
    DurationModel.prototype.recordMetreDataImpl = function (mctx) {
        if (!mctx.attributes) {
            throw new AttributesModel.AttributesUndefinedException();
        }
        if (!this.chord.length && !this._p_notes.length) {
            this.isRest = true;
            assert(this.chord.length);
        }
        if (this.chord.length !== this._p_notes.length) {
            var notes = this._p_notes;
            for (var i = 0; i < this.chord.length; ++i) {
                if (!(notes[i] instanceof DurationModel.MXMLNote)) {
                    notes[i] = new DurationModel.MXMLNote(this, i, notes[i] || {
                        pitch: this.chord[i],
                        dots: this.dots,
                        count: this.count
                    }, false);
                }
            }
            notes.length = this.chord.length;
            this._p_notes = notes;
        }
        if (!isFinite(this._count)) {
            this._implyDurationFromPerformanceData(mctx);
        }
        assert(this._count === this._notes[0].noteType.duration);
        this.ctxData = new C.MetreContext(mctx);
        assert(isFinite(this._count));
        this._divisions = this.calcDivisions(mctx, null, true);
        assert(isFinite(this._divisions) && this._divisions !== null);
        mctx.bar += Math.floor((mctx.division + this._divisions) / (mctx.ts.beats * mctx.attributes.divisions));
        mctx.division = (mctx.division + this._divisions) % (mctx.ts.beats * mctx.attributes.divisions);
    };
    DurationModel.prototype.annotateImpl = function (ctx) {
        var _this = this;
        var i;
        var j;
        if (!ctx.attributes.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }
        if (!ctx.ts) {
            return TimeSignatureModel.createTS(ctx);
        }
        var measureStyle = ctx.attributes._measureStyle;
        delete this.multiRest;
        if (measureStyle && !ctx.invisibleForBars) {
            if (measureStyle.multipleRest && measureStyle.multipleRest.count > 1) {
                var lastPotentialNote = ctx.prev(function (c) { return c.priority === 600 /* Duration */ || c.priority === 145 /* Attributes */; });
                if (lastPotentialNote.priority !== 600 /* Duration */) {
                    this.multiRest = measureStyle.multipleRest.count;
                }
            }
        }
        assert(this._divisions !== null, "Unknown beat count");
        this.isWholebar = this._divisions === -1 || this._divisions === ctx.ts.beats * ctx.attributes.divisions;
        if (ctx.isBeam || !this.inBeam) {
            if (this._divisions > ctx.ts.beats * ctx.attributes.divisions && ctx.division >= ctx.ts.beats * ctx.attributes.divisions) {
                return BarlineModel.createBarline(ctx, 0 /* Regular */);
            }
            else {
                if (ctx.division + this._divisions > ctx.ts.beats * ctx.attributes.divisions) {
                    var overfill = ctx.division + this._divisions - ctx.ts.beats * ctx.attributes.divisions;
                    if (this._divisions === overfill) {
                        var ret = BarlineModel.createBarline(ctx, 0 /* Regular */);
                        return ret;
                    }
                    else {
                        var replaceWith = Metre.subtract(this, overfill, ctx).map(function (t) { return new DurationModel(t, true); });
                        var addAfterBar = Metre.subtract(this, this._divisions - overfill, ctx).map(function (t) { return new DurationModel(t, true); });
                        for (i = 0; i < replaceWith.length; ++i) {
                            replaceWith[i].chord = this.chord ? C.JSONx.clone(this.chord) : null;
                            if ((i + 1 !== replaceWith.length || addAfterBar.length) && !this.isRest) {
                                replaceWith[i].tieds = this.chord.map(function (c) {
                                    return {
                                        type: 0 /* Start */
                                    };
                                });
                            }
                        }
                        for (i = 0; i < addAfterBar.length; ++i) {
                            addAfterBar[i].chord = this.chord ? C.JSONx.clone(this.chord) : null;
                            if (i + 1 !== addAfterBar.length && !this.isRest) {
                                replaceWith[i].tieds = this.chord.map(function (c) {
                                    return {
                                        type: 0 /* Start */
                                    };
                                });
                            }
                        }
                        BarlineModel.createBarline(ctx, 0 /* Regular */);
                        ctx.splice(ctx.idx, 0, replaceWith, 4 /* ShortenOtherVoices */);
                        ctx.splice(ctx.idx + 1 + replaceWith.length, 1, addAfterBar, 4 /* ShortenOtherVoices */);
                        return 60 /* RetryLine */;
                    }
                }
                var status = Metre.rhythmicSpellcheck(ctx);
                if (status !== 10 /* Success */) {
                    return status;
                }
            }
            assert(isFinite(this._divisions) && this._divisions !== null);
            if (ctx.smallest * ctx.attributes.divisions > this._divisions) {
                assert(this._divisions > 0);
                ctx.smallest = this._divisions / ctx.attributes.divisions;
                return 60 /* RetryLine */;
            }
            this.extraWidth = (Math.log(this._divisions) - Math.log(ctx.smallest * ctx.attributes.divisions)) / C.log2 / 3 * 40;
            if ((ctx.x + this.getWidth(ctx) > ctx.maxX) && ctx.lines[ctx.line].bar !== ctx.bar) {
                return NewlineModel.createNewline(ctx);
            }
        }
        if (!ctx.isBeam && this.hasFlagOrBeam && !this.perfectlyBeamed(ctx)) {
            var b = DurationModel.BEAMDATA;
            DurationModel.BEAMDATA = null;
            while (_.any(b, function (b) { return b.inBeam; })) {
                j = b[0].idx;
                while (ctx.body[j].inBeam) {
                    --j;
                }
                while (ctx.body[j].type !== 450 /* BeamGroup */) {
                    ++j;
                }
                var isInPast = j <= ctx.idx;
                ctx.removeFollowingBeam(j - 1, isInPast);
                ctx.idx = j;
            }
            _.each(b, function (b) {
                b.inBeam = true;
            });
            var BeamGroupModel = require("./beamGroup");
            BeamGroupModel.createBeam(ctx, b);
            return 60 /* RetryLine */;
        }
        if (!ctx.next()) {
            ctx.insertFuture(new EndMarkerModel({ endMarker: true }, true, this.engraved));
        }
        if (DurationModel.getAverageLine(this, ctx) === 3) {
            this.forceMiddleNoteDirection = this.calcMiddleNoteDirection(ctx);
        }
        else {
            this.forceMiddleNoteDirection = NaN;
        }
        this.lines = DurationModel.getLines(this, ctx);
        assert(this.lines);
        assert(_.forEach(this.lines, function (l) { return isFinite(l); }));
        for (var i = 0; i < this.lines.length; ++i) {
            ctx.minBottomPaddings[this.staff] = Math.max(ctx.minBottomPaddings[this.staff], -(this.lines[i] - 3) * 10);
            ctx.minTopPaddings[this.staff] = Math.max(ctx.minTopPaddings[this.staff], (this.lines[i] - 4) * 10);
        }
        if (!ctx.isBeam) {
            ctx.division = (ctx.loc.division || 0) + this._divisions;
        }
        if (!ctx.isBeam && this.inBeam) {
            ctx.x = this.x + this.getWidth(ctx);
            this._handleTie(ctx);
            return 10 /* Success */;
        }
        else if (!this.inBeam) {
            this._handleTie(ctx);
        }
        this.x = ctx.x;
        this._displayedAccidentals = this.getDisplayedAccidentals(ctx);
        var accidentals = this.getAccidentals(ctx);
        _.forEach(accidentals, function (a, i) {
            if (parseInt(a, 10) === 0) {
                ctx.accidentalsByStaff[_this.staff][_this.chord[i].step] = undefined;
            }
        });
        for (i = 0; i < this.chord.length; ++i) {
            ctx.accidentalsByStaff[this.staff][this.chord[i].step + this.chord[i].octave] = this.chord[i].alter;
            if ((ctx.accidentalsByStaff[this.staff][this.chord[i].step]) !== this.chord[i].alter) {
                ctx.accidentalsByStaff[this.staff][this.chord[i].step] = C.InvalidAccidental;
            }
        }
        ctx.x += this.getWidth(ctx);
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "#000000");
        if (this.multiRest !== undefined) {
            ctx.invisibleForBars = this.multiRest;
            ctx.minTopPaddings[this.staff] = Math.max(ctx.minTopPaddings[this.staff], 40);
        }
        return 10 /* Success */;
    };
    DurationModel.prototype.getWidth = function (ctx) {
        var width = 22.8 + (this.extraWidth || 0) + (this._displayedAccidentals ? 9.6 : 0);
        assert(isFinite(width));
        return width;
    };
    DurationModel.prototype.calcDivisions = function (ctx, inheritedCount, force) {
        if (!force && this._divisions) {
            return this._divisions;
        }
        return Metre.calcDivisions2(this, ctx, inheritedCount);
    };
    DurationModel.prototype.getAccWidthAfterBar = function (ctx) {
        if (!ctx.attributes || !ctx.attributes.keySignature) {
            return 0;
        }
        var staffAcc = C.NoteUtil.getAccidentals(ctx.attributes.keySignature);
        var backupAcc = ctx.accidentalsByStaff[this.staff];
        var division = ctx.division;
        ctx.accidentalsByStaff[this.staff] = staffAcc;
        ctx.division = ctx.attributes.divisions;
        ctx.idx++;
        var acc = this.getAccidentals(ctx, true);
        ctx.accidentalsByStaff[this.staff] = backupAcc;
        ctx.division = division;
        ctx.idx--;
        var parens = _.any(acc, function (v) { return typeof v === "string" && !!~v.indexOf("p"); });
        if (parens) {
            return 20;
        }
        var accs = _.any(this.getAccidentals(ctx, true), function (v) { return v === v; });
        if (accs) {
            return 10;
        }
        return 0;
    };
    DurationModel.prototype.perfectlyBeamed = function (ctx) {
        if (this.tuplet) {
            var prevNote = ctx.prev(function (c) { return c.isNote || c.endMarker; });
            if (prevNote && prevNote.isNote && prevNote.note.tuplet) {
                return true;
            }
        }
        var rebeamable = Metre.rebeamable(ctx.idx, ctx);
        var prevBeamMaybe = ctx.prev(function (m) { return m.type === 450 /* BeamGroup */ || m.type === 300 /* Barline */; }, 0);
        if (rebeamable && prevBeamMaybe && prevBeamMaybe.type === 450 /* BeamGroup */) {
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
    };
    DurationModel.prototype.calcMiddleNoteDirection = function (ctx) {
        var prevLine = ctx.prev() && ctx.prev().isNote ? DurationModel.getAverageLine(ctx.prev().note, ctx) : null;
        var nextLine = ctx.next() && ctx.next().isNote ? DurationModel.getAverageLine(ctx.next().note, ctx) : null;
        if ((nextLine !== null) && ctx.division + this._divisions + Metre.calcDivisions2(ctx.next().note, ctx, this.count) > ctx.ts.beats * ctx.attributes.divisions) {
            nextLine = null;
        }
        if (ctx.prev() && ctx.prev().forceMiddleNoteDirection) {
            prevLine -= ctx.prev().forceMiddleNoteDirection;
        }
        var check;
        if (prevLine === null && nextLine === null) {
            this.forceMiddleNoteDirection = -1;
        }
        else if (prevLine === null) {
            check = nextLine;
        }
        else if (nextLine === null) {
            check = prevLine;
        }
        else {
            var startsAt = ctx.division;
            var endsAt = ctx.division + this._divisions;
            if (Math.floor(startsAt) === Math.floor(endsAt)) {
                check = nextLine;
            }
            else if (Math.floor(startsAt) !== startsAt) {
                check = prevLine;
            }
            else if (startsAt >= ctx.ts.beats / 2) {
                check = nextLine;
            }
            else {
                check = prevLine;
            }
        }
        return (check === undefined || check >= 3) ? -1 : 1;
    };
    DurationModel.prototype.getDisplayedAccidentals = function (ctx) {
        return this.getAccidentals(ctx, true);
    };
    DurationModel.prototype.getAccidentals = function (ctx, display) {
        var chord = this.chord || [this];
        var result = new Array(chord.length || 1);
        function or3(first, second, third) {
            if (third === undefined) {
                third = null;
            }
            var a = first === null || first === undefined || first !== first ? second : first;
            return a == null || a === undefined || a !== a ? third : a;
        }
        ;
        for (var i = 0; i < result.length; ++i) {
            var pitch = chord[i];
            var actual = or3(display ? pitch.displayAlter : null, pitch.alter);
            assert(actual !== undefined);
            if (!ctx.accidentalsByStaff[this.staff]) {
                return result.map(function (a) { return NaN; });
            }
            var generalTarget = or3(ctx.accidentalsByStaff[this.staff][pitch.step], null);
            var target = or3(ctx.accidentalsByStaff[this.staff][pitch.step + pitch.octave], null);
            if (!target && generalTarget !== C.InvalidAccidental) {
                target = generalTarget;
            }
            var acc = this._p_notes[i].accidental;
            var prevDurr = null;
            _.forEach(this._p_notes, function (note) {
                if (!note.hasOwnProperty("staff")) {
                    if (!prevDurr) {
                        prevDurr = ctx.prev(function (m) { return m.isNote; });
                    }
                    if (prevDurr) {
                        note.staff = prevDurr.staff;
                    }
                }
            });
            var paren = acc && (acc.editorial || acc.parentheses || acc.bracket);
            if (!acc && actual === target) {
                var noConflicts = target === generalTarget || generalTarget === C.InvalidAccidental;
                for (var j = 0; j < ctx.accidentalsByStaff.length && noConflicts; ++j) {
                    if (ctx.accidentalsByStaff[j] && target !== or3(ctx.accidentalsByStaff[j][pitch.step + pitch.octave], ctx.accidentalsByStaff[j][pitch.step], target)) {
                        noConflicts = false;
                    }
                }
                var concurrentNotes = ctx.findVertical(function (c) { return c.isNote; });
                for (var j = 0; j < concurrentNotes.length && noConflicts; ++j) {
                    var otherChord = concurrentNotes[j].note.chord;
                    noConflicts = noConflicts && !_hasConflict(otherChord, pitch.step, target);
                }
                if (ctx.division === ctx.attributes.divisions) {
                    var prevBarOrNote = ctx.prev(function (c) { return c.isNote && !c.isRest || c.type === 300 /* Barline */; });
                    if (prevBarOrNote && prevBarOrNote.type === 300 /* Barline */) {
                        var prevNote = ctx.prev(function (c) { return c.isNote && _.any(c.note.chord, function (c) { return c.step === pitch.step; }) || c.type === 300 /* Barline */; }, 2);
                        if (prevNote && prevNote.type !== 300 /* Barline */) {
                            noConflicts = noConflicts && !_hasConflict(prevNote.note.chord, pitch.step, target);
                        }
                    }
                }
                if (noConflicts) {
                    result[i] = NaN;
                    continue;
                }
                else {
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
    };
    DurationModel.prototype._handleTie = function (ctx) {
        if (_.any(this.tieds, function (t) { return t && t.type !== 1 /* Stop */; })) {
            var nextNote = ctx.next(function (obj) { return obj.isNote; });
            if (!nextNote || nextNote.isRest) {
                this.tieds = [null];
                this.tieTo = null;
            }
            else {
                this.tieTo = nextNote;
            }
        }
        else {
            this.tieTo = null;
        }
    };
    DurationModel.prototype._implyDurationFromPerformanceData = function (mctx) {
        var factor = mctx.ts.beatType / 4;
        var beats = factor * (this._notes[0].duration / mctx.attributes.divisions);
        this._count = 4 / (this._notes[0].duration / mctx.attributes.divisions);
        var dotFactor = 1;
        var dots = 0;
        while (!isPO2(1 / (beats / dotFactor / 4)) && dots < 5) {
            ++dots;
            dotFactor += Math.pow(1 / 2, dots);
        }
        if (dots === 5) {
            dots = 0;
        }
        else if (dots !== 0) {
            this._count = (1 / (beats / dotFactor / 4 / factor));
            this.dots = dots;
        }
        if (!isPO2(this.count)) {
            if (beats === mctx.ts.beats && this.isRest) {
                this._count = -1;
            }
            else {
                var nextPO2 = Math.pow(2, Math.ceil(Math.log(this.count) / Math.log(2)));
                this._count = nextPO2;
            }
        }
        function isPO2(n) {
            if (Math.abs(Math.round(n) - n) > 0.00001) {
                return false;
            }
            n = Math.round(n);
            return !!n && !(n & (n - 1));
        }
    };
    DurationModel.prototype.getAccWidth = function (ctx) {
        var accWidth = 0;
        var accTmp = this.getAccidentals(ctx);
        if (accTmp) {
            var acc = (accTmp instanceof Array) ? accTmp : [accTmp];
            var max = _.reduce(acc, function (memo, t) { return Math.max(Math.abs(t || 0), memo); }, 0);
            accWidth = max * 6;
        }
        return Math.max(0, accWidth - 12);
    };
    Object.defineProperty(DurationModel.prototype, "staff", {
        get: function () {
            return _.chain(this._p_notes).map(function (n) { return n.staff; }).max().value();
        },
        enumerable: true,
        configurable: true
    });
    DurationModel.clefOffsets = {
        G: -3.5,
        F: 2.5,
        C: -0.5,
        PERCUSSION: -0.5,
        TAB: -0.5,
        NONE: -0.5
    };
    DurationModel.chromaticScale = {
        c: 0,
        d: 2,
        e: 4,
        f: 5,
        g: 7,
        a: 9,
        b: 11
    };
    DurationModel.countToFlag = {
        8: "flag8th",
        16: "flag16th",
        32: "flag32nd",
        64: "flag64th",
        128: "flag128th",
        256: "flag256th",
        512: "flag512th",
        1024: "flag1024th"
    };
    DurationModel.countToHasStem = {
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
    DurationModel.countToIsBeamable = {
        8: true,
        16: true,
        32: true,
        64: true,
        128: true,
        256: true,
        512: true,
        1024: true
    };
    DurationModel.countToNotehead = {
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
    DurationModel.countToRest = {
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
    DurationModel.getAverageLine = function (note, ctx) {
        var lines = DurationModel.getLines(note, ctx, { filterTemporary: true });
        return _.reduce(lines, function (memo, line) { return memo + line / lines.length; }, 0);
    };
    DurationModel.getLines = function (note, ctx, options) {
        options = options || { filterTemporary: false };
        var ret = [];
        for (var i = 0; i < note.chord.length; ++i) {
            if (!options.filterTemporary || !note.chord[i].temporary) {
                if (note.isRest) {
                    var durr = note;
                    if (durr._notes && durr._notes[i].rest.displayStep) {
                        ret.push(DurationModel.getClefOffset(ctx.attributes.clefs[note.staff - 1]) + ((parseInt(durr._notes[i].rest.displayOctave, 10) || 0) - 3) * 3.5 + DurationModel.pitchOffsets[durr._notes[i].rest.displayStep]);
                    }
                    else if (note.isWholebar) {
                        ret.push(4);
                    }
                    else {
                        ret.push(3);
                    }
                }
                else {
                    ret.push(DurationModel.getClefOffset(ctx.attributes.clefs[note.staff - 1]) + ((note.chord[i].octave || 0) - 3) * 3.5 + DurationModel.pitchOffsets[note.chord[i].step]);
                }
            }
        }
        _.forEach(ret, function (r) { return assert(isFinite(r)); });
        return ret;
    };
    DurationModel.offsetToPitch = {
        0: "C",
        0.5: "D",
        1: "E",
        1.5: "F",
        2: "G",
        2.5: "A",
        3: "B"
    };
    DurationModel.pitchOffsets = {
        C: 0,
        D: 0.5,
        E: 1,
        F: 1.5,
        G: 2,
        A: 2.5,
        B: 3
    };
    return DurationModel;
})(Model);
var DurationModel;
(function (DurationModel) {
    var MXMLNote = (function () {
        function MXMLNote(parent, idx, note, updateParent) {
            if (updateParent === void 0) { updateParent = true; }
            this._color = 0x000000;
            var self = this;
            this._parent = parent;
            this._idx = idx;
            if (note.pitch) {
                note.pitch.step = note.pitch.step.toUpperCase();
            }
            if (updateParent) {
                parent.chord[idx] = note.pitch;
                parent.dots = (note.dots || []).length;
                if (note.rest) {
                    this.rest = note.rest;
                }
                var count = note.noteType ? note.noteType.duration : parent.count;
                if (count) {
                    parent.count = count;
                }
                parent.tuplet = note.timeModification ? {
                    num: note.timeModification.normalNotes.count,
                    den: note.timeModification.actualNotes.count
                } : parent.tuplet;
            }
            var properties = [
                "unpitched",
                "noteheadText",
                "accidental",
                "instrument",
                "attack",
                "endDynamics",
                "lyrics",
                "notations",
                "stem",
                "cue",
                "ties",
                "dynamics",
                "duration",
                "play",
                "staff",
                "grace",
                "notehead",
                "release",
                "pizzicato",
                "beams",
                "voice",
                "footnote",
                "level",
                "relativeY",
                "defaultY",
                "relativeX",
                "fontFamily",
                "fontWeight",
                "fontStyle",
                "fontSize",
                "color",
                "printDot",
                "printLyric",
                "printObject",
                "printSpacing",
                "timeOnly"
            ];
            _.forEach(properties, setIfDefined);
            this.unstupidifyNotations();
            function setIfDefined(property) {
                if (note.hasOwnProperty(property)) {
                    self[property] = note[property];
                }
            }
        }
        MXMLNote.prototype.toJSON = function () {
            var clone = {};
            if (this.pitch) {
                clone["pitch"] = this.pitch;
            }
            if (this.rest) {
                clone["rest"] = this.rest;
            }
            if (this.chord) {
                clone["chord"] = this.chord;
            }
            if (this.color) {
                clone["color"] = this.color;
            }
            if (this.noteType) {
                clone["noteType"] = this.noteType;
            }
            if (this.timeModification) {
                clone["timeModification"] = this.timeModification;
            }
            for (var key in this) {
                if (this.hasOwnProperty(key) && key[0] !== "_" && !!this[key]) {
                    clone[key] = this[key];
                }
            }
            return clone;
        };
        Object.defineProperty(MXMLNote.prototype, "chord", {
            get: function () {
                return this._idx + 1 !== this._parent.chord.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MXMLNote.prototype, "pitch", {
            get: function () {
                return this._parent.isRest ? null : this._parent.chord[this._idx];
            },
            set: function (pitch) {
                this._parent.chord[this._idx].alter = pitch.alter;
                this._parent.chord[this._idx].step = pitch.step;
                this._parent.chord[this._idx].octave = pitch.octave;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MXMLNote.prototype, "rest", {
            get: function () {
                return this._parent.isRest ? {
                    measure: this._parent.isWholebar,
                    displayStep: this._restDisplayStep,
                    displayOctave: this._restDisplayOctave
                } : null;
            },
            set: function (rest) {
                this._parent.isRest = !!rest;
                if (rest) {
                    this._restDisplayStep = rest.displayStep;
                    this._restDisplayOctave = rest.displayOctave;
                }
                else {
                    if (this._restDisplayStep || this._restDisplayOctave) {
                        this._restDisplayStep = undefined;
                        this._restDisplayOctave = undefined;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MXMLNote.prototype, "dots", {
            get: function () {
                return _.times(this._parent.dots, function (idx) { return {}; });
            },
            set: function (dots) {
                this._parent.dots = dots.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MXMLNote.prototype, "noteType", {
            get: function () {
                return {
                    duration: this._parent.count,
                    size: 1 /* Full */
                };
            },
            set: function (type) {
                this._parent.count = type.duration;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MXMLNote.prototype, "timeModification", {
            get: function () {
                return this._parent.tuplet ? {
                    normalNotes: {
                        count: this._parent.tuplet.num
                    },
                    actualNotes: {
                        count: this._parent.tuplet.den
                    },
                    normalDots: [],
                    normalType: "eighth"
                } : null;
            },
            set: function (tm) {
                this._parent.tuplet = {
                    num: tm.normalNotes.count,
                    den: tm.actualNotes.count
                };
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MXMLNote.prototype, "defaultX", {
            get: function () {
                return this._parent.x;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MXMLNote.prototype, "color", {
            get: function () {
                var hex = this._color.toString(16);
                return "#" + "000000".substr(0, 6 - hex.length) + hex;
            },
            set: function (a) {
                switch (true) {
                    case !a:
                        this._color = 0;
                        break;
                    case a[0] === "#":
                        a = a.slice(1);
                    default:
                        this._color = parseInt(a, 16);
                        break;
                }
            },
            enumerable: true,
            configurable: true
        });
        MXMLNote.prototype.ensureNotationsWrittable = function () {
            this.notations = this.notations || [{}];
        };
        Object.defineProperty(MXMLNote.prototype, "notationObj", {
            get: function () {
                return this.notations ? this.notations[0] : Object.freeze({});
            },
            enumerable: true,
            configurable: true
        });
        MXMLNote.prototype.ensureArticulationsWrittable = function () {
            this.ensureNotationsWrittable();
            this.notationObj.articulations = this.notationObj.articulations || [{}];
        };
        Object.defineProperty(MXMLNote.prototype, "articulationObj", {
            get: function () {
                return this.notationObj.articulations ? this.notationObj.articulations[0] : Object.freeze({});
            },
            enumerable: true,
            configurable: true
        });
        MXMLNote.prototype.unstupidifyNotations = function () {
            if (this.notations) {
                var notations = this.notations;
                var notation = {
                    articulations: combineArticulations("articulations"),
                    accidentalMarks: combine("accidentalMarks"),
                    arpeggiates: combine("arpeggiates"),
                    dynamics: combine("dynamics"),
                    fermatas: combine("fermatas"),
                    glissandos: combine("glissandos"),
                    nonArpeggiates: combine("nonArpeggiates"),
                    ornaments: combine("ornaments"),
                    otherNotations: combine("otherNotations"),
                    slides: combine("slides"),
                    slurs: combine("slurs"),
                    technicals: combine("technicals"),
                    tieds: combine("tieds"),
                    tuplets: combine("tuplets"),
                    footnote: last("footnote"),
                    level: last("level"),
                    printObject: last("printObject")
                };
                function combine(key) {
                    return _.reduce(notations, function (memo, n) { return n[key] ? (memo || []).concat(n[key]) : memo; }, null);
                }
                function combineArticulations(key) {
                    var array = combine(key);
                    if (!array) {
                        return null;
                    }
                    var articulations = {};
                    for (var i = 0; i < array.length; ++i) {
                        for (var akey in array[i]) {
                            if (array[i].hasOwnProperty(akey)) {
                                articulations[akey] = array[i][akey];
                            }
                        }
                    }
                    return [articulations];
                }
                function last(key) {
                    return _.reduce(notations, function (memo, n) { return n[key] ? n[key] : memo; }, []);
                }
            }
        };
        return MXMLNote;
    })();
    DurationModel.MXMLNote = MXMLNote;
    function getClefOffset(clef) {
        return DurationModel.clefOffsets[clef.sign] + clef.line - C.defaultClefLines[clef.sign.toUpperCase()] - 3.5 * parseInt(clef.clefOctaveChange || "0", 10);
    }
    DurationModel.getClefOffset = getClefOffset;
})(DurationModel || (DurationModel = {}));
DurationModel.MXMLNote.prototype.staff = 1;
function _hasConflict(otherChord, step, target) {
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
var Flags;
(function (Flags) {
    Flags[Flags["TEMPORARY"] = 2 << 7] = "TEMPORARY";
    Flags[Flags["WHOLE_BAR"] = 2 << 8] = "WHOLE_BAR";
})(Flags || (Flags = {}));
module.exports = DurationModel;
