/**
 * @file Utilities for rhythm arithmetic and spelling rhythms according to the
 * time signature.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import assert = require("assert");
import _ = require("lodash");

import C = require("./contracts");
import DurationModelType = require("./duration"); // Cyclic dependency. For types only.
import Annotator = require("./annotator");
import Model = require("./model");

/**
 * Checks if the duration at the current index is rhythSmically spelled correctly
 * within its context according to the time signature ("ts"), and fixes errors
 * if it is not.
 * 
 * It returns C.IterationStatus.SUCCESS if all of the following conditions are met:
 * 
 *  1. Rests and ties are not more verbose than needed according to
 *     the above chart.
 * 
 *  2. Rests and untied, non-dotted notes either fill an integer number
 *     of segments, or less than 1
 * 
 * These conditions can be overly strict. They're a good guess at what the user
 * wanted to convey, but the user can override any of these rules. If _annotate
 * is set to true, rhythmicSpellcheck won't change anything.
 * 
 * Otherwise, the function returns false. To correct the rhythmic spelling, run
 * correctMetre.
 * 
 * @prop context: Give timeSignature, and current index.
 */
export function rhythmicSpellcheck(ctx: Annotator.Context) {
    "use strict";

    var DurationModel: typeof DurationModelType = require("./duration");

    // Only durations can be spell-checked.
    if (!ctx.curr.isNote) {
        return C.IterationStatus.Success;
    }

    // This function does not deal with overfilled bars. Instead, the BarModel
    // will split the note, and the line will be re-annotated.
    if (ctx.curr.calcBeats(ctx) + ctx.beat > ctx.ts.beats) {
        return C.IterationStatus.Success;
    }

    // TODO: allow custom beam patterns
    var pattern = beamingPatterns[getTSString(ctx.ts)];
    assert(pattern, "Unknown beaming pattern");

    var currNote = ctx.curr.note;
    var currNoteStartBeat = ctx.beat;
    var currNoteEndBeat = currNoteStartBeat + calcBeats2(currNote, ctx);

    var nextIdx = ctx.nextIdx(c => c.type === C.Type.Duration || c.priority === C.Type.Barline);
    var nextObj = ctx.body[nextIdx];

    var nextNote = nextObj && nextObj.isNote ? nextObj.note : null;

    var nextEquivNote = nextIdx < ctx.body.length && // There needs to be a model...
        currNote && nextNote &&
        !currNote.tuplet && !nextNote.tuplet &&
        (currNote.isRest && nextObj.isRest || // which is either a rest, or is...
                nextObj.isNote && currNote.tie ? // ... tied to the current note
            nextObj.note : null);

    //////////////////////////////////////////////////////////////////////
    // Checks that should be done even if the annotation status is User //
    //////////////////////////////////////////////////////////////////////

    // Check 0: Make sure tuplet groups don't end part of the way through
    if (currNote.tuplet && (!nextNote || !nextNote.tuplet)) {
        var base = 1;
        var partial = 0;
        for (var i = ctx.idx; ctx.body[i] && ctx.body[i].type !== C.Type.Barline && isTupletIfNote(ctx.body[i]); --i) {
            if (ctx.body[i].isNote) {
                partial = (partial + ctx.body[i].calcBeats(ctx)) % base;
            }
        }

        if (partial) {
            // subtract does not yet support tuplets yet, so...
            var toRestoreUntuplet = (base - partial) * currNote.tuplet.den / currNote.tuplet.num;
            var toAdd = subtract(toRestoreUntuplet, 0, ctx, -ctx.beat).map(m => new DurationModel(m, true));
            for (var i = 0; i < toAdd.length; ++i) {
                toAdd[i].tuplet = C.JSONx.clone(currNote.tuplet);
                toAdd[i].isRest = true;
            }
            ctx.splice(ctx.idx + 1, 0, toAdd, Annotator.SplicePolicy.Masked);
            return C.IterationStatus.RetryLine;
        }
    }

    // User-created durations cannot be spell-checked.
    if (!ctx.curr.annotated) {
        return C.IterationStatus.Success;
    }

    /////////////////////////////////////////////////////////////////////////
    // Checks that should be done only if the annotation status isn't User //
    /////////////////////////////////////////////////////////////////////////

    // Check 1: Separate durations that cross a boundary and only partially fill that boundary.
    var excessBeats = 0;
    var patternStartBeat = 0;
    for (var p = 0; p < pattern.length; ++p) {
        var patternEndBeat = patternStartBeat + calcBeats2(pattern[p], ctx);
        if (currNoteStartBeat > patternStartBeat &&
                currNoteEndBeat > patternEndBeat &&
                currNoteStartBeat < patternEndBeat) {
            excessBeats = currNoteEndBeat - patternEndBeat;
            break;
        }
        patternStartBeat = patternEndBeat;
    }

    if (excessBeats > 0) {
        return clearExcessBeats(currNote, excessBeats, ctx);
    }

    // Check 2: Join rests and tied notes that don't cross a boundary.
    // XXX: Right now this only considers combinations of two notes.
    if (nextEquivNote) {
        var nextNoteEndBeat = currNoteStartBeat + calcBeats2(nextNote, ctx);
        patternStartBeat = 0;

        for (var p = 0; p < pattern.length; ++p) {
            var patternEndBeat = patternStartBeat + calcBeats2(pattern[p], ctx);
            if (currNoteStartBeat >= patternStartBeat &&
                    currNoteEndBeat < patternEndBeat &&
                    nextNoteEndBeat <= patternEndBeat + 0.0000001) {
                if (tryMerge(currNote, nextObj, nextIdx, ctx)) {
                    return C.IterationStatus.RetryLine; // Should be bar
                }
            }
            patternStartBeat = patternEndBeat;
        }
    }

    // Check 3: Join rests and tied notes that fully cover multiple boundaries.
    // XXX: Right now this only covers combinations of two notes.
    if (nextEquivNote) {
        var nextNoteEndBeat = currNoteStartBeat + calcBeats2(nextNote, ctx);
        patternStartBeat = 0;

        var gotFirstNote = false;
        for (var p = 0; p < pattern.length; ++p) {
            var patternEndBeat = patternStartBeat + calcBeats2(pattern[p], ctx);
            if (!gotFirstNote) {
                if (currNoteStartBeat > patternStartBeat) {
                    break;
                } else if (currNoteStartBeat === patternStartBeat) {
                    gotFirstNote = true;
                    continue;
                }
            } else {
                if (nextNoteEndBeat > patternEndBeat) {
                    break;
                } else if (currNoteEndBeat === patternEndBeat) {
                    if (tryMerge(currNote, nextObj, nextIdx, ctx)) {
                        return C.IterationStatus.RetryCurrent;
                    }
                    break;
                }
            }
            patternStartBeat = patternEndBeat;
        }
    }

    return C.IterationStatus.Success;
};

function isTupletIfNote(model: Model): boolean {
    "use strict";
    return !model.isNote || !!model.note.tuplet;
}

/**
 * Convenience function which tries to merge two notes.
 * 
 * @returns true on success, false otherwise.
 * 
 * @internal
 */
function tryMerge(currNote: C.IPitchDuration, nextObj: Model, nextIdx: number, ctx: Annotator.Context) {
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

/**
 * Convenience function which splits a note or rest into two correct parts.
 * 
 * @internal
 */
function clearExcessBeats(currNote: C.IPitchDuration, excessBeats: number, ctx: Annotator.Context) {
    "use strict";
    var nextIdx = ctx.nextIdx(c => !c.placeholder);
    var replaceWith = subtract(currNote, excessBeats, ctx).concat(
        subtract(currNote, calcBeats2(currNote, ctx) - excessBeats,
            ctx, calcBeats2(currNote, ctx) - excessBeats));
    replaceWith.forEach((m: any) => {
        // Ideally there would be a PitchDuration constructor that would do this for us.
        m.chord = C.JSONx.clone(currNote.chord);
    });

    var DurationModel: typeof DurationModelType = require("./duration");
    ctx.splice(ctx.idx, nextIdx - ctx.idx,
        replaceWith.map(m => new DurationModel(m, true)),
        Annotator.SplicePolicy.Masked);
    var after = ctx.idx + replaceWith.length;
    if (!currNote.isRest) {
        for (var i = ctx.idx; i < after - 1; ++i) {
            ctx.body[i].note.tie = true;
        }
    }

    return C.IterationStatus.RetryLine;
}

/**
 * @returns a TS string for lookup in the beamingPatterns array.
 */
export function getTSString(ts: C.ISimpleTimeSignature) {
    "use strict";

    return ts.beats + "/" + ts.beatType;
}

/**
 * @returns an array of Duration specs that is the result of adding "durr2" to "durr1"
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function add(durr1: C.IPitchDuration, durr2: C.IPitchDuration, ctx: Annotator.Context, beatOffset?: number): Array<C.IDuration>;
export function add(durr1: number, durr2: C.IPitchDuration, ctx: Annotator.Context, beatOffset?: number): Array<C.IDuration>;

export function add(durr1: any, durr2: C.IPitchDuration, ctx: Annotator.Context, beatOffset?: number): Array<C.IDuration> {
    "use strict";

    // Bizarrely, we use subtract to add. That's just because I wrote subtract first.
    return subtract((isNaN(durr1) ? calcBeats2(durr1, ctx) : durr1) + calcBeats2(durr2, ctx), 0, ctx, beatOffset);
}

/**
 * @returns an array of Duration specs that is the result of subtracting "beats" from "durr1".
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function subtract(durr1: C.IPitchDuration, beats: number,
    ctx: Annotator.Context, beatOffset?: number): Array<C.IDuration>;
/**
 * @returns an array of Duration specs that is the result of subtracting "beats" from "durr1".
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function subtract(durr1: number, beats: number,
    ctx: Annotator.Context, beatOffset?: number): Array<C.IDuration>;

export function subtract(durr1: any, beats: number,
        ctx: Annotator.Context, beatOffset?: number): Array<C.IDuration> {
    "use strict";

    var tsName = getTSString(ctx.ts);
    var replaceWith: Array<C.IDuration> = [];
    var durr1Beats: number = isNaN(<any>durr1) ? calcBeats2(durr1, ctx) : <number> durr1;
    var beatsToFill = durr1Beats - beats;
    var bp = beamingPatterns[tsName];
    var currBeat = (ctx.beat + (beatOffset || 0)) % ctx.ts.beats;

    for (var tries = 0; tries < 20; ++tries) {
        var bpIdx = 0;
        var bpCount = 0;
        while (bp[bpIdx] &&
            bpCount + calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null,
                ctx.ts) <= currBeat) {
            ++bpIdx;
            if (!bp[bpIdx]) {
                return replaceWith;
            }
            bpCount += calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts);
        }

        if (beatsToFill <= 0) {
            /* Exit! */
            return replaceWith;
        }
        _.any(allNotes, function(note) { // stop at first 'true'
            var noteBeats = calcBeats(note.count, note.dots, null, ctx.ts);

            if (noteBeats <= beatsToFill) {
                // The subtraction is allowed to completely fill multiple pattern sections
                // but cannot partially fill more than 1.
                var completelyFills = false;
                var tmpBeats = currBeat + noteBeats;
                for (var i = 0; bp[bpIdx + i]; ++i) {
                    if (tmpBeats < 0) {
                        break;
                    }
                    var bpBeats = calcBeats(bp[bpIdx + i].count, bp[bpIdx + i].dots, null,
                        ctx.ts);
                    if (tmpBeats === bpBeats) {
                        completelyFills = true;
                        break;
                    }
                    tmpBeats -= bpBeats;
                }

                if (completelyFills || (i - bpIdx <= 1)) {
                    // This either fills multiple parts perfectly, or fills less than one
                    // part.
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

/**
 * If there is a "better" way to beam the notes starting at "idx", return an array
 * of notes that make up that beam, else return null.
 * 
 * @param idx the index where the beam would start
 * @param alt a string representing an alternative beaming. See beamingPatterns.
 */
export function rebeamable(idx: number, ctx: Annotator.Context, alt?: string): Array<DurationModelType> {
    "use strict";

    var body = ctx.body;
    var tsName = getTSString(ctx.ts) + (alt ? "_" + alt : "");
    var replaceWith: Array<DurationModelType> = [];
    var bp = beamingPatterns[tsName];
    var currBeat = ctx.beat;

    var bpIdx = 0;
    var bpCount = 0;
    while (bp[bpIdx] &&
        bpCount + calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null,
            ctx.ts) <= currBeat) {
        ++bpIdx;
        if (!bp[bpIdx]) {
            return replaceWith;
        }
        bpCount += calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts);
    }

    var needsReplacement = false;
    var prevCount: number;

    var prevInBeam = true;

    var foundNote = false;
    var tuplet: C.ITuplet;

    for (var i = idx; body[i] && !body[i].endMarker; ++i) {
        if (body[i].type === C.Type.BeamGroup) {
            if (idx !== i) {
                needsReplacement = true;
            }
        } else if (body[i].isNote) {
            if (!!tuplet !== !!body[i].note.tuplet && foundNote) {
                break;
            }
            foundNote = true;
            tuplet = body[i].note.tuplet;
            prevCount = body[i].note.count || prevCount;

            if (!body[i].note.hasFlagOrBeam || body[i].note.temporary) {
                break;
            }

            if (tsName === "4/4" && body[i].note.count >= 16 ||
                tsName === "2/4" && body[i].note.count >= 8) {
                var alternativeOption = rebeamable(idx, ctx, "clean");
                if (alternativeOption) {
                    return alternativeOption;
                } else {
                    return null;
                }
            }

            var bBeats = calcBeats2(body[i].note, ctx, prevCount);

            var bpBeats = calcBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.ts);

            // Note: A quarter note between a division should have ALREADY been made 2
            // tied eighth notes by now.

            currBeat += bBeats;
            if (currBeat > bpCount + bpBeats) {
                break;
            }
            if (prevInBeam && !body[i].inBeam) {
                needsReplacement = true;
                prevInBeam = false;
            }

            assert(body[i].isNote);
            replaceWith.push(<DurationModelType> body[i]);

            if (currBeat === bpCount + bpBeats) {
                break;
            }
        }
    }

    if (needsReplacement && replaceWith.length) {
        var first = replaceWith[0];
        var last = replaceWith[replaceWith.length - 1];
        if (tsName.indexOf("/4") !== -1) {
            // Rhythmic figures that are not part of a repeated pattern may be best beamed into separate beats,
            // so that they are not mistaken for triplets nor for groups of three quavers in compound time.
            // (Note doesn't solve the root issue)
            while (((first.ctxData.beat % 1) !== 0 || (last.ctxData.beat % 1) === 0) &&
                Math.floor(first.ctxData.beat) !== Math.floor(last.ctxData.beat)) {
                replaceWith.pop();
                last = replaceWith[replaceWith.length - 1];
            }
        }
        return replaceWith.length > 1 ? replaceWith : null;
    }
    return null;
}

export function calcBeats2(durr: C.IPitchDuration, ctx: C.MetreContext, inheritedCount: number = NaN) {
    "use strict";
    return calcBeats(
        durr.count || inheritedCount,
        durr.dots,
        durr.tuplet,
        ctx.ts);
}

export function calcBeats(count: number, dots: number,
        tuplet: C.ITuplet, ts: C.ISimpleTimeSignature) {
    "use strict";

    assert(ts, "Not supplying a ts is deprecated");
    var base = ts.beatType/count;
    if (tuplet) {
        base *= tuplet.num / tuplet.den;
    }

    var total = base;
    for (var i = 0; i < dots; ++i) {
        base /= 2;
        total += base;
    }
    return total;
};

/**
 * @returns a spec array for a whole note. Note that in some time signatures,
 * a whole note is composed of several notes, so the length of the array is not
 * always 1.
 */
export function wholeNote(ctx: Annotator.Context): Array<C.IDuration> {
    "use strict";
    var tsName = getTSString(ctx.ts);
    return wholeNotePatterns[tsName];
}

export function correctRoundingErrors(mctx: C.MetreContext): void {
    "use strict";
    // Correct rounding errors
    var huge = 1000000000;
    var rounded = Math.round(mctx.beat * huge) / huge;
    if (Math.abs(rounded - mctx.beat) < 0.00000001) {
        mctx.beat = Math.round(mctx.beat * 10000000) / 10000000;
    }
}

var _512   = C.NoteUtil.makeDuration({ count: 512          });
var _256   = C.NoteUtil.makeDuration({ count: 256          });
var _256D  = C.NoteUtil.makeDuration({ count: 256, dots: 1 });
var _128   = C.NoteUtil.makeDuration({ count: 128          });
var _128D  = C.NoteUtil.makeDuration({ count: 128, dots: 1 });
var _64    = C.NoteUtil.makeDuration({ count: 64           });
var _64D   = C.NoteUtil.makeDuration({ count: 64,  dots: 1 });
var _32    = C.NoteUtil.makeDuration({ count: 32           });
var _32D   = C.NoteUtil.makeDuration({ count: 32,  dots: 1 });
var _16    = C.NoteUtil.makeDuration({ count: 16           });
var _16D   = C.NoteUtil.makeDuration({ count: 16,  dots: 1 });
var _16DD  = C.NoteUtil.makeDuration({ count: 16,  dots: 2 });
var _8     = C.NoteUtil.makeDuration({ count: 8            });
var _8D    = C.NoteUtil.makeDuration({ count: 8,   dots: 1 });
var _8DD   = C.NoteUtil.makeDuration({ count: 8,   dots: 2 });
var _4     = C.NoteUtil.makeDuration({ count: 4            });
var _4D    = C.NoteUtil.makeDuration({ count: 4,   dots: 1 });
var _4DD   = C.NoteUtil.makeDuration({ count: 4,   dots: 2 });
var _2     = C.NoteUtil.makeDuration({ count: 2            });
var _2D    = C.NoteUtil.makeDuration({ count: 2,   dots: 1 });
var _2DD   = C.NoteUtil.makeDuration({ count: 2,   dots: 2 }); // Warning: should be included in allNotes depending on TS
var _1     = C.NoteUtil.makeDuration({ count: 1            });
var _1D    = C.NoteUtil.makeDuration({ count: 1,   dots: 1 }); // Warning: should be included in allNotes depending on TS
var _1DD   = C.NoteUtil.makeDuration({ count: 1,   dots: 2 }); // Warning: should be included in allNotes depending on TS
var _05    = C.NoteUtil.makeDuration({ count: 1/2          }); // Warning: should be included in allNotes depending on TS

var allNotes = [_1, _2D, _2,
    _4DD, _4D, _4, _8DD, _8D, _8, _16DD, _16D, _16, _32D,
    _32, _64D, _64, _128D, _128, _256D, _256, _512];

// Adapted from Behind Bars (E. Gould) page 155
var beamingPatterns: {[key: string]: Array <C.IDuration>} = {
    "2/16":     [_16,   _16                     ],
    "1/8":      [_8                             ],

    "3/16":     [_8D                            ],

    "4/16":     [_8,    _8                      ],
    "2/8":      [_8,    _8                      ],
    "1/4":      [_4                             ],

    "5/16":     [_8D,   _8                      ],
    "5/16_alt": [_8,    _8D                     ],

    "6/16":     [_8D,   _8D                     ],
    "3/8":      [_4D                            ],

    "4/8":      [_4,    _4                      ],
    "2/4":      [_2                             ],
    "2/4_clean": [_4,    _4                     ],
    "1/2":      [_2                             ],

    "9/16":     [_8D,   _8D,    _8D             ],

    "5/8":      [_4D,   _4                      ],
    "5/8_alt":  [_4,    _4D                     ],

    "12/16":    [_8D,   _8D,    _8D,    _8D     ],
    "6/8":      [_4D,           _4D             ],
    "3/4":      [_2D                            ],  // << XXX: Provided it doesn't give the illusion of 6/8.

    "7/8":      [_4,            _8D             ],
    "7/8_alt":  [_8D,           _4              ],

    "8/8":      [_4D,   _4D,    _4              ],
    "8/8_alt":  [_4D,   _4,     _4D             ],
    "8/8_alt2": [_4,    _4D,    _4D             ],
    "4/4":      [_2,            _2              ],
    "4/4_clean":[_4,    _4,     _4,     _4      ],
    "2/2":      [_2,            _2              ],
    "1/1":      [_1                             ],  // << If only they were all like this...

    "9/8":      [_4D,   _4D,    _4D             ],

    "10/8":     [_2,    _4D,    _4D             ],
    "10/8_alt": [_4D,   _2,     _4D             ],
    "10/8_alt2":[_4D,   _4D,    _2              ],
    "5/4":      [_2D,           _2              ],
    "5/4_alt":  [_2,            _2D             ],

    "12/8":     [_4D,   _4D,    _4D,    _4D     ],
    "6/4":      [_2D,           _2D             ],
    "3/2":      [_2,        _2,      _2         ],

    "7/4":      [_1,            _2D             ],
    "7/4_alt":  [_2D,           _1              ],

    "15/8":     [_4D,  _4D,  _4D,  _4D,  _4D    ],

    "8/4":      [_1,            _1              ],
        // "Or any other combination"...
        // There's a whole bunch, and I think composers using 8/4 are willing
        // to select the correct beaming manually
    "4/2":      [_1,            _1              ],
    "2/1":      [_1,            _1              ],

    "18/8":     [_4D, _4D, _4D, _4D, _4D, _4D   ],
    "9/4":      [_2D,      _2D,      _2D        ]
};

var wholeNotePatterns: {[key: string]: Array <C.IDuration>} = {
    "2/16":     [_8                             ],
    "1/8":      [_8                             ],

    "3/16":     [_8D                            ],

    "4/16":     [_4                             ],
    "2/8":      [_4                             ],
    "1/4":      [_4                             ],

    "5/16":     [_8D,   _8                      ],
    "5/16_alt": [_8,    _8D                     ],

    "6/16":     [_4D                            ],
    "3/8":      [_4D                            ],

    "4/8":      [_2                             ],
    "2/4":      [_2                             ],
    "1/2":      [_2                             ],

    "9/16":     [_4D,   _8D                     ],

    "5/8":      [_4D,   _4                      ],
    "5/8_alt":  [_4,    _4D                     ],

    "12/16":    [_2D                            ],
    "6/8":      [_2D                            ],
    "3/4":      [_2D                            ],

    "7/8":      [_2DD                           ],
    "7/8_alt":  [_2DD                           ],

    "8/8":      [_1            ],
    "8/8_alt":  [_1            ],
    "8/8_alt2": [_1            ],
    "4/4":      [_1            ],
    "2/2":      [_1            ],
    "1/1":      [_1                             ],  // << If only they were all like this...

    "9/8":      [_2D,   _4D                     ],

    "10/8":     [_2,    _2D                     ],
    "10/8_alt": [_4D,   _2,     _4D             ],
    "10/8_alt2":[_2D,   _2                      ],
    "5/4":      [_2D,           _2              ],
    "5/4_alt":  [_2,            _2D             ],

    "12/8":     [_1D                            ],
    "6/4":      [_1D                            ],
    "3/2":      [_1D                            ],

    "7/4":      [_1DD                           ],
    "7/4_alt":  [_1DD                           ],

    "15/8":     [_2D,  _2D,  _4D                ],

    "8/4":      [_05                            ],
        // "Or any other combination"...
        // There's a whole bunch, and I think composers using 8/4 are willing
        // to select the correct beaming manually
    "4/2":      [_1,            _1              ],
    "2/1":      [_1,            _1              ],

    "18/8":     [_1D,           _2D             ],
    "9/4":      [_1D,           _2D             ]
};


export enum Beaming {
    Default,
    Alt1,
    Alt2
};
