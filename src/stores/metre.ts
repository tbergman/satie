/**
 * Utilities for:
 *  - rhythm arithmetic
 *  - spelling rhythms according to the time signature
 */

import assert = require("assert");
import _ = require("lodash");

import Context = require("./context");
import Contracts = require("./contracts");
import DurationModel = require("./duration"); // For symbols only. Do not call.
import Model = require("./model");

var _32  = Contracts.makeDuration({count: 32});
var _32D = Contracts.makeDuration({count: 32, dots: 1});
var _16  = Contracts.makeDuration({count: 16});
var _16D = Contracts.makeDuration({count: 16, dots: 1});
var _8   = Contracts.makeDuration({count: 8});
var _8D  = Contracts.makeDuration({count: 8, dots: 1});
var _4   = Contracts.makeDuration({count: 4});
var _4D  = Contracts.makeDuration({count: 4, dots: 1});
var _2   = Contracts.makeDuration({count: 2});
var _2D  = Contracts.makeDuration({count: 2, dots: 1});
var _1   = Contracts.makeDuration({count: 1});

var allNotes = [_1, _2D, _2, _4D, _4, _8D, _8, _16D, _16, _32D, _32];

// Adapted from Behind Bars (E. Gould) page 155
var beamingPatterns: {[key: string]: Array <Contracts.Duration>} = {
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
    "2/4":      [_4,    _4                      ],
    "1/2":      [_2                             ],

    "9/16":     [_8D,   _8D,    _8D             ],

    "5/8":      [_4D,   _4                      ],
    "5/8_alt":  [_4,    _4D                     ],

    "12/16":    [_8D,   _8D,    _8D,    _8D     ],
    "6/8":      [_4D,           _4D             ],
    "3/4":      [_4,       _4,       _4         ],

    "7/8":      [_4,            _8D             ],
    "7/8_alt":  [_8D,           _4              ],

    "8/8":      [_4D,   _4D,    _4              ],
    "8/8_alt":  [_4D,   _4,     _4D             ],
    "8/8_alt2": [_4,    _4D,    _4D             ],
    "4/4":      [_2,            _2              ],
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

export enum Beaming {
    Default,
    Alt1,
    Alt2
};

/**
 * Checks if a bar ("durations") is rhythmically spelled correctly according
 * to the time signature ("ts"), and optionally fixes errors (if "fix" is set).
 *
 * It returns true if all of the following conditions are met:
 *
 *  1. Beamable notes are beamed if beamable in the above chart
 *
 *  2. Beamable notes are not beamed if not beamable in the above chart
 *
 *  3. Rests and ties are not more verbose than needed according to
 *     the above chart.
 *
 *  4. Rests and untied, undotted notes either fill an integer number
 *     of segments, or less than 1
 *
 * These conditions are overly strict. They're a good guess at what the user
 * wanted to convey, but the user can override any of these rules. Thus the 
 * function also returns true if the 'force' property is set on all elements of
 * "durations" that fail any of the above properties.
 *
 * Otherwise, the function returns false. To correct the rhythmic spelling, run
 * correctMetre
 *
 * @prop durations: array of Durations representing a bar.
 *      All elements without a 'count' property are ignored.
 * @prop ts: TimeSignature to check against
 * @prop fix: If true, correct any errors
 * @prop {undefined | "alt" | "alt2"} mod: Select an alternative beaming of the
 *                                         given time signature
 */
export function rythmicSpellcheck(durations: Array<Contracts.PitchDuration>, ts: Contracts.TimeSignature, fix: boolean, mod: Beaming) {
    var tsName = getTSString(ts);

    var pattern = beamingPatterns[tsName];
    assert(pattern, "Time signature must be on page 155 of Behind Bars.");
    
    assert(false, "Not implemented");
    var count = 0;
    for (var i = 0; i < durations.length; ++i) {
        //if (durations[i].getBeats 
    }
};

/**
 * Returns a TS string for lookup in the beamingPatterns array.
 */
export function getTSString(ts: Contracts.TimeSignature) {
    return ts.beats + "/" + ts.beatType;
}

/**
 * Returns an array of Duration specs the is the result of adding "durr2" to "durr1".
 */
export function add(durr1: Contracts.PitchDuration, durr2: Contracts.PitchDuration, ts: Contracts.TimeSignature) {
    assert(false, "Not implemented");
}

/**
 * Returns an array of Duration specs the is the result of subtracting "beats" from "durr1".
 */
export function subtract(durr1: Contracts.PitchDuration, beats: number,
    ctx: Context, beatOffset?: number): Array<Contracts.Duration>;
export function subtract(durr1: number, beats: number,
    ctx: Context, beatOffset?: number): Array<Contracts.Duration>;

export function subtract(durr1: any, beats: number,
        ctx: Context, beatOffset?: number): Array<Contracts.Duration> {
    var tsName = getTSString(ctx.timeSignature);
    var replaceWith: Array<Contracts.Duration> = [];
    var durr1Beats: number = isNaN(<any>durr1) ? durr1.getBeats(ctx) : <number> durr1;
    var beatsToFill = durr1Beats - beats;
    var bp = beamingPatterns[tsName];
    var currBeat = ctx.beats + (beatOffset || 0);

    while (true) {
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
    assert(false, "Not reached");
}

export function rebeamable(idx: number, ctx: Context):
        Array<DurationModel> {
    //TODO: merge with 'subtract'
    var body = ctx.body;
    var tsName = getTSString(ctx.timeSignature);
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
        if (body[i].type === Contracts.ModelType.BEAM_GROUP) {
            if (idx !== i) {
                needsReplacement = true;
            }
        } else if (body[i].isNote) {
            prevCount = body[i].note.count || prevCount;

            if (body[i].note.isRest || !body[i].note.hasFlagOrBeam || body[i].note.temporary) {
                break;
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
        tuplet: Contracts.Tuplet, ts: Contracts.TimeSignature) {
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
