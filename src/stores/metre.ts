/**
 * @file Utilities for rhythm arithmetic and spelling rhythms according to the
 * time signature.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

"use strict";

import assert = require("assert");
import _ = require("lodash");

import C = require("./contracts");
import Context = require("./context");
import DurationModel = require("./duration"); // For symbols only. Do not call.

/**
 * Checks if a durations is rhythmically spelled correctly within its context
 * according to the time signature ("ts"), and optionally fixes errors (if "fix"
 * is set).
 *
 * It returns C.IterationStatus.SUCCESS if all of the following conditions are met:
 *
 *  1. Rests and ties are not more verbose than needed according to
 *     the above chart.
 *
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
 * @prop fix: If true, correct any errors
 */
export function rythmicSpellcheck(ctx: Context, fix: boolean) {
    "use strict";

    var tsName = getTSString(ctx.timeSignature);

    var pattern = beamingPatterns[tsName];
    assert(pattern, "Time signature must be one of the ones on page 155 of Behind Bars.");

    var _e = 0.00000001;

    var beat = 0;
    var pidx = 0;
    var currElt: C.IDuration = pattern[0];
    while (currElt && beat + currElt.getBeats(ctx) <= ctx.beats) {
        ++pidx;
        beat += currElt.getBeats(ctx);
        currElt = pattern[pidx];
    }
    if (!currElt) {
        // The note exceeds the length of a bar.
        // XXX: Validate the note.
        return C.IterationStatus.SUCCESS;
    }
    var be = currElt.getBeats(ctx);

    var curr = ctx.body[ctx.idx];
    var next = ctx.body[ctx.idx + 1];

    var n1 = curr.note;
    var n1b = n1.getBeats(ctx);
    var b1 = ctx.beats;
    var b2 = b1 + n1b;

    // Separate durations that cross a boundary and only partially fill that boundary.
    // This isn't a problem if it completely fills another part.
    // XXX: Make a way to disable this when needed.
    var bExcess: number;
    if (Math.abs(b1 % 1) < _e) {
        bExcess = b2 - (beat + currElt.getBeats(ctx));
        for (var p = pidx + 1; p < pattern.length && bExcess > 0; ++p) {
            if (bExcess - pattern[p].getBeats(ctx) >= 0) {
                bExcess -= pattern[p].getBeats(ctx);
            }
        }
    } else if ((b1 % n1b > _e) && (b2 % n1b > _e)) {
        bExcess = b2 - (b1 + (b2 % n1b));
    }

    if (bExcess > 0) {
        var replaceWith = subtract(n1, bExcess, ctx).concat(
            subtract(n1, n1.getBeats(ctx) - bExcess, ctx));
        replaceWith.forEach((m: any) => {
            // Ideally there would be a PitchDuration constructor that would do this for us.
            m.pitch = n1.pitch;
            m.chord = n1.chord;
        });

        var DurationModel = require("./duration"); // Recursive.
        Array.prototype.splice.apply(ctx.body, [ctx.idx, 1].concat(
            replaceWith.map(m => new DurationModel(m))));
        var after = ctx.idx + replaceWith.length;
        if (!n1.isRest) {
            for (var i = ctx.idx; i < after - 1; ++i) {
                ctx.body[i].note.tie = true;
            }
        }

        return C.IterationStatus.RETRY_CURRENT;
    }

    // Combine rests that can be combined.

    if (curr.isRest && next.isRest && ctx.curr.source !== C.Source.USER) {
        var n2 = next.note;
        var n2b = n2.getBeats(ctx);
        var b3 = b2 + n2b;
        var alike = n1b === n2b;

        // Combine like rests that are not offset.
        if (alike && (b3 % (n1b*2)) < _e && (
                // It doesn't pass the next beam barrier...
                (b3 - (beat + be) < _e) ||
                // or it completely fills the next barrier...
                (pattern[pidx + 1] && Math.abs(b3 - (beat + be + pattern[pidx + 1]
                    .getBeats(ctx))) < _e))) {
            n1.count /= 2; // Double the length.
            ctx.eraseFuture(ctx.idx + 1);
            return C.IterationStatus.RETRY_LINE;
        }

        // Combine any number of rests that:
        //    - start on a beat and end on a barrier OR
        //    - can be combined to form a whole bar rest
        if (Math.abs(b1 % 1) < _e) {
            var ok = false;
            var pb: number;
            var toErase = 1;
            var jdx = ctx.idx + 1;
            while (!ok) {
                pb = beat;
                for (var h = pidx; h < pattern.length; ++h) {
                    if (pb + pattern[h].getBeats(ctx) === b3) {
                        ok = true;
                        break;
                    }
                    if (wholeNotePatterns[tsName].length === 1 &&
                            wholeNotePatterns[tsName][0].getBeats(ctx) === b3) {
                        ok = true;
                        break;
                    }

                    pb += pattern[h].getBeats(ctx);
                }
                if (!ok) {
                    ++jdx;
                    ++toErase;
                    while (ctx.body[jdx].type === C.Type.BEAM_GROUP ||
                            ctx.body[jdx].type === C.Type.SLUR) {
                        ++jdx;
                    }
                    if (ctx.body[jdx] && ctx.body[jdx].isNote) {
                        var newBeats = ctx.body[jdx].note.getBeats(ctx);
                        b3 += newBeats;
                        n2b += newBeats;
                    } else {
                        break;
                    }
                }
            }
            if (ok) {
                // We can combine them.
                var ncb = n1b + n2b;
                for (var po2 = 128; po2 >= 1 / 32; po2 /= 2) {
                    // The largest acceptable dotted note is the
                    // biggest one smaller than the beat. In addition,
                    // for readability, we don't go beyond 3 dots.
                    var maxDot = (ncb === ctx.timeSignature.beats || po2 >= ctx.timeSignature.beatType) ? 3 : 0;
                    for (var dots = 0; dots <= maxDot; ++dots) {
                        var dotFactor = Math.pow(1.5, dots);
                        if (Math.abs(ncb - ctx.timeSignature.beatType/po2*dotFactor) < _e) {
                            _.times(toErase, function () {
                                ctx.eraseFuture(ctx.idx + 1);
                            });
                            n1.actualDots = n1.dots = dots;
                            n1.actualTuplet = n1.tuplet = null;
                            n1.count = po2;
                            return C.IterationStatus.RETRY_LINE;
                        }
                    }
                }
            }
        }
    }

    return C.IterationStatus.SUCCESS;
};

/**
 * Returns a TS string for lookup in the beamingPatterns array.
 */
export function getTSString(ts: C.ITimeSignature) {
    "use strict";

    return ts.beats + "/" + ts.beatType;
}

/**
 * Returns an array of Duration specs the is the result of adding "durr2" to "durr1".
 */
export function add(durr1: C.IPitchDuration, durr2: C.IPitchDuration, ts: C.ITimeSignature) {
    "use strict";

    assert(false, "Not implemented");
}

export function subtract(durr1: C.IPitchDuration, beats: number,
    ctx: Context, beatOffset?: number): Array<C.IDuration>;
export function subtract(durr1: number, beats: number,
    ctx: Context, beatOffset?: number): Array<C.IDuration>;

/**
 * Returns an array of Duration specs the is the result of subtracting "beats" from "durr1".
 * 
 * @param beatOffset number of beats after the current beat that durr1 is located.
 */
export function subtract(durr1: any, beats: number,
        ctx: Context, beatOffset?: number): Array<C.IDuration> {
    "use strict";

    var tsName = getTSString(ctx.timeSignature);
    var replaceWith: Array<C.IDuration> = [];
    var durr1Beats: number = isNaN(<any>durr1) ? durr1.getBeats(ctx) : <number> durr1;
    var beatsToFill = durr1Beats - beats;
    var bp = beamingPatterns[tsName];
    var currBeat = ctx.beats + (beatOffset || 0);

    for (var tries = 0; tries < 20; ++tries) {
        var bpIdx = 0;
        var bpCount = 0;
        while (bp[bpIdx] &&
            bpCount + getBeats(bp[bpIdx].count, bp[bpIdx].dots, null,
                ctx.timeSignature) <= currBeat) {
            ++bpIdx;
            if (!bp[bpIdx]) {
                return replaceWith;
            }
            bpCount += getBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.timeSignature);
        }

        if (beatsToFill <= 0) {
            /* Exit! */
            return replaceWith;
        }
        _.any(allNotes, function(note) { // stop at first 'true'
            var noteBeats = getBeats(note.count, note.dots, null, ctx.timeSignature);

            if (noteBeats <= beatsToFill) {
                // The subtraction is allowed to completely fill multiple beaming sections
                // but cannot partially fill more than 1.
                var completelyFills = false;
                var tmpBeats = currBeat + noteBeats;
                for (var i = 0; bp[bpIdx + i]; ++i) {
                    if (tmpBeats < 0) {
                        break;
                    }
                    var bpBeats = getBeats(bp[bpIdx + i].count, bp[bpIdx + i].dots, null,
                        ctx.timeSignature);
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
 * of notes that make up that beam, else
 *  return null.
 * 
 * @param idx the index where the beam would start
 * @param alt a string representing an alternative beaming. See beamingPatterns.
 */
export function rebeamable(idx: number, ctx: Context, alt?: string): Array<DurationModel> {
    "use strict";

    var body = ctx.body;
    var tsName = getTSString(ctx.timeSignature) + (alt ? "_" + alt : "");
    var replaceWith: Array<DurationModel> = [];
    var bp = beamingPatterns[tsName];
    var currBeat = ctx.beats;

    var bpIdx = 0;
    var bpCount = 0;
    while (bp[bpIdx] &&
        bpCount + getBeats(bp[bpIdx].count, bp[bpIdx].dots, null,
            ctx.timeSignature) <= currBeat) {
        ++bpIdx;
        if (!bp[bpIdx]) {
            return replaceWith;
        }
        bpCount += getBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.timeSignature);
    }

    var needsReplacement = false;
    var prevCount: number;

    var prevInBeam = true;

    for (var i = idx; !body[i].endMarker; ++i) {
        if (body[i].type === C.Type.BEAM_GROUP) {
            if (idx !== i) {
                needsReplacement = true;
            }
        } else if (body[i].isNote) {
            prevCount = body[i].note.count || prevCount;

            if (body[i].note.isRest || !body[i].note.hasFlagOrBeam || body[i].note.temporary) {
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

            var bBeats = body[i].note.getBeats(ctx, prevCount);

            var bpBeats = getBeats(bp[bpIdx].count, bp[bpIdx].dots, null, ctx.timeSignature);

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
            replaceWith.push(<DurationModel> body[i]);

            if (currBeat === bpCount + bpBeats) {
                break;
            }
        }
    }

    if (needsReplacement && replaceWith.length > 1) {
        return replaceWith;
    }
    return null;
}

export function getBeats(count: number, dots: number,
        tuplet: C.ITuplet, ts: C.ITimeSignature) {
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
 * Returns a spec array for a whole note. Note that in some time signatures,
 * a whole note is composed of several notes, so the length of the array is not
 * always 1.
 */
export function wholeNote(ctx: Context): Array<C.IDuration> {
    "use strict";
    var tsName = getTSString(ctx.timeSignature);
    return wholeNotePatterns[tsName];
}

var _1024  = C.makeDuration({count: 1024});
var _1024D = C.makeDuration({count: 1024, dots: 1});
var _512   = C.makeDuration({count: 512});
var _512D  = C.makeDuration({count: 512, dots: 1});
var _256   = C.makeDuration({count: 256});
var _256D  = C.makeDuration({count: 256, dots: 1});
var _128   = C.makeDuration({count: 128});
var _128D  = C.makeDuration({count: 128, dots: 1});
var _64    = C.makeDuration({count: 64});
var _64D   = C.makeDuration({count: 64, dots: 1});
var _32    = C.makeDuration({count: 32});
var _32D   = C.makeDuration({count: 32, dots: 1});
var _16    = C.makeDuration({count: 16});
var _16D   = C.makeDuration({count: 16, dots: 1});
var _8     = C.makeDuration({count: 8});
var _8D    = C.makeDuration({count: 8, dots: 1});
var _4     = C.makeDuration({count: 4});
var _4D    = C.makeDuration({count: 4, dots: 1});
var _2     = C.makeDuration({count: 2});
var _2D    = C.makeDuration({count: 2, dots: 1});
var _2DD   = C.makeDuration({count: 2, dots: 2});
var _1     = C.makeDuration({count: 1});
var _1D    = C.makeDuration({count: 1, dots: 1});
var _1DD   = C.makeDuration({count: 1, dots: 2});
var _05    = C.makeDuration({ count: 1 / 2 });

var allNotes = [_1, _2D, _2, _4D, _4, _8D, _8, _16D, _16, _32D, _32,
    _64D, _64, _128D, _128, _256D, _256, _512D, _512, _1024D, _1024];

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
    "4/4_clean":  [_4,    _4,     _4,    _4     ],
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
    "3/2":      [_2D,       _2,      _2         ],

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
