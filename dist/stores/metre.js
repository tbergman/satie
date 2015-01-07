var assert = require("assert");
var _ = require("lodash");
var C = require("./contracts");
var Annotator = require("./annotator");
function rhythmicSpellcheck(ctx) {
    "use strict";
    var DurationModel = require("./duration");
    if (!ctx.curr.isNote) {
        return 10 /* Success */;
    }
    if (ctx.curr.calcDivisions(ctx) + ctx.division > ctx.ts.beats * ctx.attributes.divisions) {
        return 10 /* Success */;
    }
    var pattern = getBeamingPattern(ctx.ts);
    var currNote = ctx.curr.note;
    var currNoteStartDivision = ctx.division;
    var currNoteEndDivision = currNoteStartDivision + calcDivisions2(currNote, ctx);
    var nextIdx = ctx.nextIdx(function (c) { return c.type === 600 /* Duration */ || c.priority === 300 /* Barline */; });
    var nextObj = ctx.body[nextIdx];
    var nextNote = nextObj && nextObj.isNote ? nextObj.note : null;
    var nextEquivNote = nextIdx < ctx.body.length && currNote && nextNote && !currNote.tuplet && !nextNote.tuplet && (currNote.isRest && nextObj.isRest || nextObj.isNote && _.any(currNote.tieds, function (t) { return t && t.type !== 1 /* Stop */; }) ? nextObj.note : null);
    if (currNote.tuplet && (!nextNote || !nextNote.tuplet)) {
        var base = 1;
        var partial = 0;
        for (var i = ctx.idx; ctx.body[i] && ctx.body[i].type !== 300 /* Barline */ && isTupletIfNote(ctx.body[i]); --i) {
            if (ctx.body[i].isNote) {
                partial = (partial + ctx.body[i].calcDivisions(ctx)) % base;
            }
        }
        if (partial) {
            var toRestoreUntuplet = (base - partial) * currNote.tuplet.den / currNote.tuplet.num;
            var toAdd = subtract(toRestoreUntuplet, 0, ctx, -ctx.division).map(function (m) { return new DurationModel(m, true); });
            for (var i = 0; i < toAdd.length; ++i) {
                toAdd[i].tuplet = C.JSONx.clone(currNote.tuplet);
                toAdd[i].isRest = true;
            }
            ctx.splice(ctx.idx + 1, 0, toAdd, 3 /* Masked */);
            return 60 /* RetryLine */;
        }
    }
    if (!ctx.curr.annotated) {
        return 10 /* Success */;
    }
    var excessBeats = 0;
    var patternStartDivision = 0;
    for (var p = 0; p < pattern.length; ++p) {
        var patternEndDivision = patternStartDivision + calcDivisions2(pattern[p], ctx);
        if (currNoteStartDivision > patternStartDivision && currNoteEndDivision > patternEndDivision && currNoteStartDivision < patternEndDivision) {
            excessBeats = currNoteEndDivision - patternEndDivision;
            break;
        }
        patternStartDivision = patternEndDivision;
    }
    if (excessBeats > 0) {
        return clearExcessBeats(currNote, excessBeats, ctx);
    }
    if (nextEquivNote) {
        var nextNoteEndBeat = currNoteStartDivision + calcDivisions2(nextNote, ctx);
        patternStartDivision = 0;
        for (var p = 0; p < pattern.length; ++p) {
            var patternEndDivision = patternStartDivision + calcDivisions2(pattern[p], ctx);
            if (currNoteStartDivision >= patternStartDivision && currNoteEndDivision < patternEndDivision && nextNoteEndDivision <= patternEndDivision + 0.0000001) {
                if (tryMerge(currNote, nextObj, nextIdx, ctx)) {
                    return 60 /* RetryLine */;
                }
            }
            patternStartDivision = patternEndDivision;
        }
    }
    if (nextEquivNote) {
        var nextNoteEndDivision = currNoteStartDivision + calcDivisions2(nextNote, ctx);
        patternStartDivision = 0;
        var gotFirstNote = false;
        for (var p = 0; p < pattern.length; ++p) {
            var patternEndDivision = patternStartDivision + calcDivisions2(pattern[p], ctx);
            if (!gotFirstNote) {
                if (currNoteStartDivision > patternStartDivision) {
                    break;
                }
                else if (currNoteStartDivision === patternStartDivision) {
                    gotFirstNote = true;
                    continue;
                }
            }
            else {
                if (nextNoteEndDivision > patternEndDivision) {
                    break;
                }
                else if (currNoteEndDivision === patternEndDivision) {
                    if (tryMerge(currNote, nextObj, nextIdx, ctx)) {
                        return 20 /* RetryCurrent */;
                    }
                    break;
                }
            }
            patternStartDivision = patternEndDivision;
        }
    }
    return 10 /* Success */;
}
exports.rhythmicSpellcheck = rhythmicSpellcheck;
;
function isTupletIfNote(model) {
    "use strict";
    return !model.isNote || !!model.note.tuplet;
}
function tryMerge(currNote, nextObj, nextIdx, ctx) {
    "use strict";
    if (nextObj.inBeam) {
        return false;
    }
    var replaceWithMaybe = add(currNote, nextObj.note, ctx);
    if (replaceWithMaybe.length !== 1) {
        return false;
    }
    var spec = replaceWithMaybe[0];
    currNote.count = spec.count;
    currNote.dots = spec.dots;
    currNote.tuplet = spec.tuplet;
    ctx.splice(nextIdx, 1, null);
    return true;
}
function clearExcessBeats(currNote, excessBeats, ctx) {
    "use strict";
    var nextIdx = ctx.nextIdx(function (c) { return !c.placeholder; });
    var replaceWith = subtract(currNote, excessBeats, ctx).concat(subtract(currNote, calcDivisions2(currNote, ctx) - excessBeats, ctx, calcDivisions2(currNote, ctx) - excessBeats));
    replaceWith.forEach(function (m) {
        m.chord = C.JSONx.clone(currNote.chord);
    });
    var DurationModel = require("./duration");
    ctx.splice(ctx.idx, nextIdx - ctx.idx, replaceWith.map(function (m) { return new DurationModel(m, true); }), 3 /* Masked */);
    var after = ctx.idx + replaceWith.length;
    if (!currNote.isRest) {
        for (var i = ctx.idx; i < after - 1; ++i) {
            ctx.body[i].note.tieds = _.map(ctx.body[i].note.chord, function (n) {
                return {
                    type: 0 /* Start */
                };
            });
        }
    }
    return 60 /* RetryLine */;
}
function getTSString(ts) {
    "use strict";
    return ts.beats + "/" + ts.beatType;
}
exports.getTSString = getTSString;
function getBeamingPattern(ts, alt) {
    "use strict";
    var pattern = beamingPatterns[getTSString(ts) + (alt ? "_" + alt : "")];
    var factors = {
        4: [4, 3, 2, 1],
        8: [12, 8, 4, 3, 2, 1],
        16: [4, 3, 2, 1]
    };
    if (!pattern) {
        pattern = [];
        var beatsToAdd = ts.beats;
        _.forEach(factors[ts.beatType], function (factor) {
            while (beatsToAdd >= factor) {
                pattern = pattern.concat(beamingPatterns[factor + "/" + ts.beatType]);
                beatsToAdd -= factor;
            }
        });
    }
    assert(pattern, "Unknown beaming pattern");
    return pattern;
}
function add(durr1, durr2, ctx, beatOffset) {
    "use strict";
    return subtract((isNaN(durr1) ? calcDivisions2(durr1, ctx) : durr1) + calcDivisions2(durr2, ctx), 0, ctx, beatOffset);
}
exports.add = add;
function subtract(durr1, divisions, ctx, divisionOffset) {
    "use strict";
    var tsName = getTSString(ctx.ts);
    var replaceWith = [];
    var durr1Divisions = isNaN(durr1) ? calcDivisions2(durr1, ctx) : durr1;
    var beatsToFill = durr1Divisions - divisions;
    var bp = getBeamingPattern(ctx.ts);
    var currDivision = (ctx.division + (divisionOffset || 0)) % (ctx.ts.beats * ctx.attributes.divisions);
    for (var tries = 0; tries < 20; ++tries) {
        var bpIdx = 0;
        var bpCount = 0;
        while (bp[bpIdx] && bpCount + calcDivisions(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts, ctx.attributes.divisions) <= currDivision) {
            ++bpIdx;
            if (!bp[bpIdx]) {
                return replaceWith;
            }
            bpCount += calcDivisions(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts, ctx.attributes.divisions);
        }
        if (beatsToFill <= 0) {
            return replaceWith;
        }
        _.any(allNotes, function (note) {
            var noteDivisions = calcDivisions(note.count, note.dots, null, ctx.ts, ctx.attributes.divisions);
            if (noteDivisions <= beatsToFill) {
                var completelyFills = false;
                var tmpBeats = currDivision + noteDivisions;
                for (var i = 0; bp[bpIdx + i]; ++i) {
                    if (tmpBeats < 0) {
                        break;
                    }
                    var bpBeats = calcDivisions(bp[bpIdx + i].count, bp[bpIdx + i].dots, null, ctx.ts, ctx.attributes.divisions);
                    if (tmpBeats === bpBeats) {
                        completelyFills = true;
                        break;
                    }
                    tmpBeats -= bpBeats;
                }
                if (completelyFills || (i - bpIdx <= 1)) {
                    replaceWith.push(_.clone(note));
                    beatsToFill -= noteDivisions;
                    currDivision += noteDivisions;
                    return true;
                }
            }
        });
    }
    throw new C.InvalidDurationError();
}
exports.subtract = subtract;
function rebeamable(idx, ctx, alt) {
    "use strict";
    var divisions = ctx.attributes.divisions;
    var tsName = getTSString(ctx.ts) + (alt ? "_" + alt : "");
    var replaceWith = [];
    var bp = getBeamingPattern(ctx.ts, alt);
    var body = ctx.body;
    var currDivision = ctx.division;
    var bpIdx = 0;
    var bpCount = 0;
    while (bp[bpIdx] && bpCount + calcDivisions(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts, ctx.attributes.divisions) <= currDivision) {
        ++bpIdx;
        if (!bp[bpIdx]) {
            return replaceWith;
        }
        bpCount += calcDivisions(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts, ctx.attributes.divisions);
    }
    var needsReplacement = false;
    var prevCount;
    var prevInBeam = true;
    var foundNote = false;
    var tuplet;
    for (var i = idx; body[i] && !body[i].endMarker; ++i) {
        if (body[i].type === 450 /* BeamGroup */) {
            if (idx !== i) {
                needsReplacement = true;
            }
        }
        else if (body[i].isNote) {
            if (!!tuplet !== !!body[i].note.tuplet && foundNote) {
                break;
            }
            foundNote = true;
            tuplet = body[i].note.tuplet;
            prevCount = body[i].note.count || prevCount;
            if (!body[i].note.hasFlagOrBeam || body[i].note.temporary) {
                break;
            }
            if (tsName === "4/4" && body[i].note.count >= 16 || tsName === "2/4" && body[i].note.count >= 8) {
                var alternativeOption = rebeamable(idx, ctx, "clean");
                if (alternativeOption) {
                    return alternativeOption;
                }
                else {
                    return null;
                }
            }
            var bDivisions = calcDivisions2(body[i].note, ctx, prevCount);
            var bpBeats = calcDivisions(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts, ctx.attributes.divisions);
            currDivision += bDivisions;
            if (currDivision > bpCount + bpBeats) {
                break;
            }
            if (prevInBeam && !body[i].inBeam) {
                needsReplacement = true;
                prevInBeam = false;
            }
            assert(body[i].isNote);
            replaceWith.push(body[i]);
            if (currDivision === bpCount + bpBeats) {
                break;
            }
        }
    }
    if (needsReplacement && replaceWith.length) {
        var first = replaceWith[0];
        var last = replaceWith[replaceWith.length - 1];
        if (tsName.indexOf("/4") !== -1) {
            while (((first.ctxData.division % divisions) !== 0 || (last.ctxData.division % divisions) === 0) && Math.floor(first.ctxData.division / divisions) !== Math.floor(last.ctxData.division / divisions)) {
                replaceWith.pop();
                last = replaceWith[replaceWith.length - 1];
            }
        }
        return replaceWith.length > 1 ? replaceWith : null;
    }
    return null;
}
exports.rebeamable = rebeamable;
function calcDivisions2(durr, ctx, inheritedCount) {
    "use strict";
    if (inheritedCount === void 0) { inheritedCount = NaN; }
    return calcDivisions(durr.count || inheritedCount, durr.dots, durr.tuplet, ctx.ts, ctx.attributes.divisions);
}
exports.calcDivisions2 = calcDivisions2;
function calcDivisions(count, dots, tuplet, ts, divisions) {
    "use strict";
    if (count === -1) {
        return ts.beats * divisions;
    }
    if (count === 9990 /* Breve */) {
        count = 0.5;
    }
    if (count === 9991 /* Long */) {
        count = 0.25;
    }
    if (count === 9992 /* Maxima */) {
        count = 0.125;
    }
    assert(ts, "Not supplying a ts is deprecated");
    var base = divisions * ts.beatType / count;
    if (tuplet) {
        base *= tuplet.num / tuplet.den;
    }
    var total = base;
    for (var i = 0; i < dots; ++i) {
        base /= 2;
        total += base;
    }
    return total;
}
exports.calcDivisions = calcDivisions;
;
function wholeNote(ctx) {
    "use strict";
    var tsName = getTSString(ctx.ts);
    return wholeNotePatterns[tsName];
}
exports.wholeNote = wholeNote;
var _512 = C.NoteUtil.makeDuration({ count: 512 });
var _256 = C.NoteUtil.makeDuration({ count: 256 });
var _256D = C.NoteUtil.makeDuration({ count: 256, dots: 1 });
var _128 = C.NoteUtil.makeDuration({ count: 128 });
var _128D = C.NoteUtil.makeDuration({ count: 128, dots: 1 });
var _64 = C.NoteUtil.makeDuration({ count: 64 });
var _64D = C.NoteUtil.makeDuration({ count: 64, dots: 1 });
var _32 = C.NoteUtil.makeDuration({ count: 32 });
var _32D = C.NoteUtil.makeDuration({ count: 32, dots: 1 });
var _16 = C.NoteUtil.makeDuration({ count: 16 });
var _16D = C.NoteUtil.makeDuration({ count: 16, dots: 1 });
var _16DD = C.NoteUtil.makeDuration({ count: 16, dots: 2 });
var _8 = C.NoteUtil.makeDuration({ count: 8 });
var _8D = C.NoteUtil.makeDuration({ count: 8, dots: 1 });
var _8DD = C.NoteUtil.makeDuration({ count: 8, dots: 2 });
var _4 = C.NoteUtil.makeDuration({ count: 4 });
var _4D = C.NoteUtil.makeDuration({ count: 4, dots: 1 });
var _4DD = C.NoteUtil.makeDuration({ count: 4, dots: 2 });
var _2 = C.NoteUtil.makeDuration({ count: 2 });
var _2D = C.NoteUtil.makeDuration({ count: 2, dots: 1 });
var _2DD = C.NoteUtil.makeDuration({ count: 2, dots: 2 });
var _1 = C.NoteUtil.makeDuration({ count: 1 });
var _1D = C.NoteUtil.makeDuration({ count: 1, dots: 1 });
var _1DD = C.NoteUtil.makeDuration({ count: 1, dots: 2 });
var _05 = C.NoteUtil.makeDuration({ count: 1 / 2 });
var allNotes = [_1, _2D, _2, _4DD, _4D, _4, _8DD, _8D, _8, _16DD, _16D, _16, _32D, _32, _64D, _64, _128D, _128, _256D, _256, _512];
var beamingPatterns = {
    "1/16": [_16],
    "2/16": [_16, _16],
    "1/8": [_8],
    "3/16": [_8D],
    "4/16": [_8, _8],
    "2/8": [_8, _8],
    "1/4": [_4],
    "5/16": [_8D, _8],
    "5/16_alt": [_8, _8D],
    "6/16": [_8D, _8D],
    "3/8": [_4D],
    "4/8": [_4, _4],
    "2/4": [_2],
    "2/4_clean": [_4, _4],
    "1/2": [_2],
    "9/16": [_8D, _8D, _8D],
    "5/8": [_4D, _4],
    "5/8_alt": [_4, _4D],
    "12/16": [_8D, _8D, _8D, _8D],
    "6/8": [_4D, _4D],
    "3/4": [_2D],
    "7/8": [_4, _8D],
    "7/8_alt": [_8D, _4],
    "8/8": [_4D, _4D, _4],
    "8/8_alt": [_4D, _4, _4D],
    "8/8_alt2": [_4, _4D, _4D],
    "4/4": [_2, _2],
    "4/4_clean": [_4, _4, _4, _4],
    "2/2": [_2, _2],
    "1/1": [_1],
    "9/8": [_4D, _4D, _4D],
    "10/8": [_2, _4D, _4D],
    "10/8_alt": [_4D, _2, _4D],
    "10/8_alt2": [_4D, _4D, _2],
    "5/4": [_2D, _2],
    "5/4_alt": [_2, _2D],
    "12/8": [_4D, _4D, _4D, _4D],
    "6/4": [_2D, _2D],
    "3/2": [_2, _2, _2],
    "7/4": [_1, _2D],
    "7/4_alt": [_2D, _1],
    "15/8": [_4D, _4D, _4D, _4D, _4D],
    "8/4": [_1, _1],
    "4/2": [_1, _1],
    "2/1": [_1, _1],
    "18/8": [_4D, _4D, _4D, _4D, _4D, _4D],
    "9/4": [_2D, _2D, _2D]
};
var wholeNotePatterns = {
    "2/16": [_8],
    "1/8": [_8],
    "3/16": [_8D],
    "4/16": [_4],
    "2/8": [_4],
    "1/4": [_4],
    "5/16": [_8D, _8],
    "5/16_alt": [_8, _8D],
    "6/16": [_4D],
    "3/8": [_4D],
    "4/8": [_2],
    "2/4": [_2],
    "1/2": [_2],
    "9/16": [_4D, _8D],
    "5/8": [_4D, _4],
    "5/8_alt": [_4, _4D],
    "12/16": [_2D],
    "6/8": [_2D],
    "3/4": [_2D],
    "7/8": [_2DD],
    "7/8_alt": [_2DD],
    "8/8": [_1],
    "8/8_alt": [_1],
    "8/8_alt2": [_1],
    "4/4": [_1],
    "2/2": [_1],
    "1/1": [_1],
    "9/8": [_2D, _4D],
    "10/8": [_2, _2D],
    "10/8_alt": [_4D, _2, _4D],
    "10/8_alt2": [_2D, _2],
    "5/4": [_2D, _2],
    "5/4_alt": [_2, _2D],
    "12/8": [_1D],
    "6/4": [_1D],
    "3/2": [_1D],
    "7/4": [_1DD],
    "7/4_alt": [_1DD],
    "15/8": [_2D, _2D, _4D],
    "8/4": [_05],
    "4/2": [_1, _1],
    "2/1": [_1, _1],
    "18/8": [_1D, _2D],
    "9/4": [_1D, _2D]
};
(function (Beaming) {
    Beaming[Beaming["Default"] = 0] = "Default";
    Beaming[Beaming["Alt1"] = 1] = "Alt1";
    Beaming[Beaming["Alt2"] = 2] = "Alt2";
})(exports.Beaming || (exports.Beaming = {}));
var Beaming = exports.Beaming;
;
