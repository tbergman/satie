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
    if (ctx.curr.calcBeats(ctx) + ctx.beat > ctx.ts.beats) {
        return 10 /* Success */;
    }
    var pattern = beamingPatterns[getTSString(ctx.ts)];
    assert(pattern, "Unknown beaming pattern");
    var currNote = ctx.curr.note;
    var currNoteStartBeat = ctx.beat;
    var currNoteEndBeat = currNoteStartBeat + calcBeats2(currNote, ctx);
    var nextIdx = ctx.nextIdx(function (c) { return c.type === 600 /* Duration */ || c.priority === 300 /* Barline */; });
    var nextObj = ctx.body[nextIdx];
    var nextNote = nextObj && nextObj.isNote ? nextObj.note : null;
    var nextEquivNote = nextIdx < ctx.body.length && currNote && nextNote && !currNote.tuplet && !nextNote.tuplet && (currNote.isRest && nextObj.isRest || nextObj.isNote && currNote.tie ? nextObj.note : null);
    if (currNote.tuplet && (!nextNote || !nextNote.tuplet)) {
        var base = 1;
        var partial = 0;
        for (var i = ctx.idx; ctx.body[i] && ctx.body[i].type !== 300 /* Barline */ && isTupletIfNote(ctx.body[i]); --i) {
            if (ctx.body[i].isNote) {
                partial = (partial + ctx.body[i].calcBeats(ctx)) % base;
            }
        }
        if (partial) {
            var toRestoreUntuplet = (base - partial) * currNote.tuplet.den / currNote.tuplet.num;
            var toAdd = subtract(toRestoreUntuplet, 0, ctx, -ctx.beat).map(function (m) { return new DurationModel(m, true); });
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
    var patternStartBeat = 0;
    for (var p = 0; p < pattern.length; ++p) {
        var patternEndBeat = patternStartBeat + calcBeats2(pattern[p], ctx);
        if (currNoteStartBeat > patternStartBeat && currNoteEndBeat > patternEndBeat && currNoteStartBeat < patternEndBeat) {
            excessBeats = currNoteEndBeat - patternEndBeat;
            break;
        }
        patternStartBeat = patternEndBeat;
    }
    if (excessBeats > 0) {
        return clearExcessBeats(currNote, excessBeats, ctx);
    }
    if (nextEquivNote) {
        var nextNoteEndBeat = currNoteStartBeat + calcBeats2(nextNote, ctx);
        patternStartBeat = 0;
        for (var p = 0; p < pattern.length; ++p) {
            var patternEndBeat = patternStartBeat + calcBeats2(pattern[p], ctx);
            if (currNoteStartBeat >= patternStartBeat && currNoteEndBeat < patternEndBeat && nextNoteEndBeat <= patternEndBeat + 0.0000001) {
                if (tryMerge(currNote, nextObj, nextIdx, ctx)) {
                    return 60 /* RetryLine */;
                }
            }
            patternStartBeat = patternEndBeat;
        }
    }
    if (nextEquivNote) {
        var nextNoteEndBeat = currNoteStartBeat + calcBeats2(nextNote, ctx);
        patternStartBeat = 0;
        var gotFirstNote = false;
        for (var p = 0; p < pattern.length; ++p) {
            var patternEndBeat = patternStartBeat + calcBeats2(pattern[p], ctx);
            if (!gotFirstNote) {
                if (currNoteStartBeat > patternStartBeat) {
                    break;
                }
                else if (currNoteStartBeat === patternStartBeat) {
                    gotFirstNote = true;
                    continue;
                }
            }
            else {
                if (nextNoteEndBeat > patternEndBeat) {
                    break;
                }
                else if (currNoteEndBeat === patternEndBeat) {
                    if (tryMerge(currNote, nextObj, nextIdx, ctx)) {
                        return 20 /* RetryCurrent */;
                    }
                    break;
                }
            }
            patternStartBeat = patternEndBeat;
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
    var replaceWith = subtract(currNote, excessBeats, ctx).concat(subtract(currNote, calcBeats2(currNote, ctx) - excessBeats, ctx, calcBeats2(currNote, ctx) - excessBeats));
    replaceWith.forEach(function (m) {
        m.chord = C.JSONx.clone(currNote.chord);
    });
    var DurationModel = require("./duration");
    ctx.splice(ctx.idx, nextIdx - ctx.idx, replaceWith.map(function (m) { return new DurationModel(m, true); }), 3 /* Masked */);
    var after = ctx.idx + replaceWith.length;
    if (!currNote.isRest) {
        for (var i = ctx.idx; i < after - 1; ++i) {
            ctx.body[i].note.tie = true;
        }
    }
    return 60 /* RetryLine */;
}
function getTSString(ts) {
    "use strict";
    return ts.beats + "/" + ts.beatType;
}
exports.getTSString = getTSString;
function add(durr1, durr2, ctx, beatOffset) {
    "use strict";
    return subtract((isNaN(durr1) ? calcBeats2(durr1, ctx) : durr1) + calcBeats2(durr2, ctx), 0, ctx, beatOffset);
}
exports.add = add;
function subtract(durr1, beats, ctx, beatOffset) {
    "use strict";
    var tsName = getTSString(ctx.ts);
    var replaceWith = [];
    var durr1Beats = isNaN(durr1) ? calcBeats2(durr1, ctx) : durr1;
    var beatsToFill = durr1Beats - beats;
    var bp = beamingPatterns[tsName];
    var currBeat = (ctx.beat + (beatOffset || 0)) % ctx.ts.beats;
    for (var tries = 0; tries < 20; ++tries) {
        var bpIdx = 0;
        var bpCount = 0;
        while (bp[bpIdx] && bpCount + calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts) <= currBeat) {
            ++bpIdx;
            if (!bp[bpIdx]) {
                return replaceWith;
            }
            bpCount += calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts);
        }
        if (beatsToFill <= 0) {
            return replaceWith;
        }
        _.any(allNotes, function (note) {
            var noteBeats = calcBeats(note.count, note.dots, null, ctx.ts);
            if (noteBeats <= beatsToFill) {
                var completelyFills = false;
                var tmpBeats = currBeat + noteBeats;
                for (var i = 0; bp[bpIdx + i]; ++i) {
                    if (tmpBeats < 0) {
                        break;
                    }
                    var bpBeats = calcBeats(bp[bpIdx + i].count, bp[bpIdx + i].dots, null, ctx.ts);
                    if (tmpBeats === bpBeats) {
                        completelyFills = true;
                        break;
                    }
                    tmpBeats -= bpBeats;
                }
                if (completelyFills || (i - bpIdx <= 1)) {
                    replaceWith.push(_.clone(note));
                    beatsToFill -= noteBeats;
                    currBeat += noteBeats;
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
    var body = ctx.body;
    var tsName = getTSString(ctx.ts) + (alt ? "_" + alt : "");
    var replaceWith = [];
    var bp = beamingPatterns[tsName];
    var currBeat = ctx.beat;
    var bpIdx = 0;
    var bpCount = 0;
    while (bp[bpIdx] && bpCount + calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts) <= currBeat) {
        ++bpIdx;
        if (!bp[bpIdx]) {
            return replaceWith;
        }
        bpCount += calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts);
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
            var bBeats = calcBeats2(body[i].note, ctx, prevCount);
            var bpBeats = calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts);
            currBeat += bBeats;
            if (currBeat > bpCount + bpBeats) {
                break;
            }
            if (prevInBeam && !body[i].inBeam) {
                needsReplacement = true;
                prevInBeam = false;
            }
            assert(body[i].isNote);
            replaceWith.push(body[i]);
            if (currBeat === bpCount + bpBeats) {
                break;
            }
        }
    }
    if (needsReplacement && replaceWith.length) {
        var first = replaceWith[0];
        var last = replaceWith[replaceWith.length - 1];
        if (tsName.indexOf("/4") !== -1) {
            while (((first.ctxData.beat % 1) !== 0 || (last.ctxData.beat % 1) === 0) && Math.floor(first.ctxData.beat) !== Math.floor(last.ctxData.beat)) {
                replaceWith.pop();
                last = replaceWith[replaceWith.length - 1];
            }
        }
        return replaceWith.length > 1 ? replaceWith : null;
    }
    return null;
}
exports.rebeamable = rebeamable;
function calcBeats2(durr, ctx, inheritedCount) {
    "use strict";
    if (inheritedCount === void 0) { inheritedCount = NaN; }
    return calcBeats(durr.count || inheritedCount, durr.dots, durr.tuplet, ctx.ts);
}
exports.calcBeats2 = calcBeats2;
function calcBeats(count, dots, tuplet, ts) {
    "use strict";
    assert(ts, "Not supplying a ts is deprecated");
    var base = ts.beatType / count;
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
exports.calcBeats = calcBeats;
;
function wholeNote(ctx) {
    "use strict";
    var tsName = getTSString(ctx.ts);
    return wholeNotePatterns[tsName];
}
exports.wholeNote = wholeNote;
function correctRoundingErrors(mctx) {
    "use strict";
    var huge = 1000000000;
    var rounded = Math.round(mctx.beat * huge) / huge;
    if (Math.abs(rounded - mctx.beat) < 0.00000001) {
        mctx.beat = Math.round(mctx.beat * 10000000) / 10000000;
    }
}
exports.correctRoundingErrors = correctRoundingErrors;
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
