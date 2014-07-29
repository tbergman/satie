/**
 * @jsx React.DOM
 */

var Model = require("./model.jsx");

var React = require("react");
var _ = require("lodash");
var assert = require("assert");

var BarlineModel = require("./barline.jsx");
var ClefModel = require("./clef.jsx");
var EndMarkerModel = require("./endMarker.jsx");
var KeySignatureModel = require("./keySignature.jsx");
var NewlineModel = require("./newline.jsx");
var TimeSignatureModel = require("./timeSignature.jsx");

class DurationModel extends Model {
    annotateImpl(ctx) {
        this.line = getLine(this, ctx);
        
        if (!ctx.isBeam) {
            ctx.beats = (ctx.beats || 0) + this.getBeats();
        }

        if (!ctx.isBeam && this.inBeam) {
            this._handleTie(ctx);
            return true;
        } else if (!this.inBeam) {
            this._handleTie(ctx);
        }
        this.setX(ctx.x);
        this._fontSize = ctx.fontSize;
        this.accidentals = getAccidentals(this, ctx);
        _.map(this.chord || [this.pitch], (pitch) => {
            ctx.accidentals[pitch.pitch] = pitch.acc;
        });
        ctx.x += this.getWidth(ctx);
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black");
        this.flag = !this.inBeam && (this.getDisplayCount() in countToFlag) &&
            countToFlag[this.getDisplayCount()];
        return true;
    }
    _handleTie(ctx) {
        if (this.tie) {
            this.tieTo = ctx.next(obj => obj.pitch || obj.chord);
        } else {
            this.tieTo = null;
        }
    }
    visible() {
        return !this.inBeam;
    }
    /**
     * Returns the length of the beat, without dots or tuplet modifiers
     * that should be rendered. This can differ from the actual count
     * during a preview, for example.
     */
    getDisplayCount() {
        return this.displayCount || this.count;
    }
    getRestHead() {
        return countToRest[this.count];
    }

    getAccStrokes() {
        if (this.chord) {
            return _.map(this.chord, c => c.accTemporary ? "#A5A5A5" : "black");
        }
        return [this.accTemporary ? "#A5A5A5" : "black"];
    }

    getAccWidth(ctx) {
        var accWidth = 0;
        var acc = getAccidentals(this, ctx);
        if (acc) {
            var acc = (acc instanceof Array) ? acc : [acc];
            var max = _.reduce(acc, (memo, t) => Math.max(Math.abs(t||0), memo), 0);
            var accWidth = max*0.15;
        }
        return Math.max(0, accWidth - 0.3);
    }
    
    getDirection() {
        return isNaN(this.forceMiddleNoteDirection) ? undefined : this.forceMiddleNoteDirection;
    }

    getWidth(ctx) {
        return 0.67 + (this.annotatedExtraWidth || 0);
    }

    hasStem() {
        return countToHasStem[this.getDisplayCount()];
    }

    notehead() {
        return countToNotehead[this.getDisplayCount()];
    }

    _lyPitch(pitch) {
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

    toLylite(lylite) {
        var str;
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

    getBeats(inheritedCount) {
        return getBeats(this.count || inheritedCount, getDots(this), getTuplet(this));
    }

    get midiNote() {
        if (this.pitch) {
            var base = chromaticScale[this.pitch] + 48;
            return base + (this.octave || 0)*12 + (this.acc || 0);
        }
        return _.map(this.chord, m => this.midiNote.call(m));
    }

    containsAccidental(ctx) {
        var nonAccidentals = KeySignatureModel.getAccidentals(ctx.keySignature);
        var pitches = this.chord || [this];
        for (var i = 0; i < pitches.length; ++i) {
            if ((nonAccidentals[pitches[i].pitch]||0) !== (pitches[i].acc||0)) {
                return true;
            }
        }
    }

    getStrokes() {
        if (this.chord) {
            return _.map(this.chord, c => c.temporary ?
                    "#A5A5A5" :
                    (this.selected ? "#75A1D0" : "black"));
        }
        return [this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black" )];
    }
}

var log2 = Math.log(2);

var getLine = (pitch, ctx, options) => {
    options = options || {};

    if (!ctx) {
        assert(pitch.line !== undefined,
                "Must be first annotated in duration.jsx");
        return pitch.line;
    }
    assert(ctx.clef, "A clef must be inserted before the first note");
    if (pitch.chord) {
        return _(pitch.chord)
            .filter(p => !options.filterTemporary || !p.temporary)
            .map(p => getLine(p, ctx))
            .value();
    }
    if (pitch.pitch === "r") {
        return 3;
    }
    return clefOffsets[ctx.clef] + (pitch.octave || 0)*3.5 + pitchOffsets[pitch.pitch];
};

var getAverageLine = (pitch, ctx) => {
    var line = getLine(pitch, ctx, {filterTemporary: true});
    if (!isNaN(line)) {
        return line;
    }
    return _.reduce(line, (memo, l) => memo + l, 0)/line.length;
};

var getPitch = (line, ctx) => {
    assert(ctx.clef, "A clef must be inserted before the first note");
    var pitch = offsetToPitch[((line - clefOffsets[ctx.clef]) % 3.5 + 3.5) % 3.5];
    var acc = ctx.accidentals[pitch];

    return {
        pitch: offsetToPitch[((line - clefOffsets[ctx.clef]) % 3.5 + 3.5) % 3.5],
        octave: Math.floor((line - clefOffsets[ctx.clef])/3.5),
        acc: acc
    };
};

var clefOffsets = {
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
    "fClefTurned": 2.5, 

};
var pitchOffsets = {
    c: 0,
    d: 0.5,
    e: 1,
    f: 1.5,
    g: 2,
    a: 2.5,
    b: 3
};
var offsetToPitch = {
    0: "c",
    0.5: "d",
    1: "e",
    1.5: "f",
    2: "g",
    2.5: "a",
    3: "b"
};

var getAccidentals = (pitch, ctx) => {
    if (pitch.chord) {
        return _.map(pitch.chord, p => getAccidentals(p, ctx));
    }

    var actual = pitch.acc;
    var target = ctx.accidentals[pitch.pitch];
    if (actual === target) {
        return undefined; // no accidental
    }

    if (!actual) {
        delete ctx.accidentals[pitch.pitch];
        return 0; // natural
    }

    return actual;
};

var countToNotehead = {
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

var countToRest = {
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

var countToFlag = {
    8: "flag8th",
    16: "flag16th",
    32: "flag32nd",
    64: "flag64th",
    128: "flag128th",
    256: "flag256th",
    512: "flag512th",
    1024: "flag1024th"
};

var countToHasStem = {
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

var countToIsBeamable = {
    8: true,
    16: true,
    32: true,
    64: true,
    128: true,
    256: true,
    512: true,
    1024: true
};

var cannotBeBeamed = function(ctx) {
    return this.inBeam || !beamable(ctx);
};

var chromaticScale = {c:0, d:2, e:4, f:5, g:7, a:9, b:11}; //c:12

var noteNames = ["C", "C\u266F", "D\u266D", "D", "D\u266F", "E\u266D", "E", "F", "F\u266F",
    "G\u266D", "G", "G\u266F", "A\u266D", "A", "A\u266F", "B\u266D", "B"];

var beamable = (ctx) => {
    // TODO: give a better algorithm
    // This has lots of corner cases that don't work (it's for a demo!)
    var beamable = [];
    var count = ctx.curr().count;
    var rcount = 1/parseInt(ctx.count);
    var c = 0;
    var hasTimeValue = (other) => other.pitch || other.chord;
    var isRest = (other) => other.pitch === "r";
    var prev;

    var beats = ctx.beats;

    for (var i = ctx.idx; i < ctx.body.length; ++i) {
        if (hasTimeValue(ctx.body[i])) {
            if (ctx.body[i].inBeam) {
                break;
            }
            if (ctx.timeSignature.beatType === 4 &&
                    ctx.timeSignature.beats === 4 && rcount <= 2 &&
                    rcount + 1/parseInt(ctx.body[i].count) >= 2) {
                break;
            }
            if (isRest(ctx.body[i])) {
                break;
            }

            beats += getBeats(ctx.body[i].count, getDots(ctx.body[i]), 
                        getTuplet(ctx.body[i]));

            if (beats > getBeats(ctx.timeSignature.beatType) * ctx.timeSignature.beats) {
                break;

            }

            if (prev && prev.tuplet) {
                if (!ctx.body[i].tuplet) {
                    break;
                }
                if (ctx.body[i].tuplet.num !== prev.tuplet.num) {
                    break;
                }
                if (ctx.body[i].tuplet.den !== prev.tuplet.den) {
                    break;
                }
            }
            if (countToIsBeamable[ctx.body[i].count || count]) {
                beamable = beamable.concat(ctx.body[i]);
            } else {
                break;
            }
            if (++c >= 4) {
                break;
            }

            prev = ctx.body[i];
            rcount += 1/parseInt(ctx.body[i].count);
        }
    }
    if (beamable.length > 1) {
        return beamable;
    }
    return false;
};

var getBeats = (count, dots, tuplet) => {
    // XXX: Make sure this works for things other than 4/4
    var base = 4/count;
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

var getDots = obj => isNaN(obj.actualDots) ? obj.dots : obj.actualDots;

var getTuplet = obj => (obj.actualTuplet !== undefined) ? obj.actualTuplet : obj.tuplet;

DurationModel.prototype.prereqs = [
    [
        function(ctx) {
            return ctx.clef; },
        ClefModel.createClef,
        "A clef must exist on each line."
    ],

    [
        function(ctx) {
            return ctx.keySignature; },
        KeySignatureModel.createKeySignature,
        "A key signature must exist on each line."
    ],

    [
        function (ctx) {
            return ctx.timeSignature; },
        TimeSignatureModel.createTS,
        "A time signature must exist on the first line of every page."
    ],

    [
        function (ctx) {
            return this.count; },
        function (ctx) {
            assert(ctx.count, "Never null -- starts at 4");
            this.count = ctx.count;
            return true;
        },
        "A note's duration, when unspecified, is set by the previous note"
    ],

    [
        function (ctx) {
            return this.count === ctx.count; },
        function (ctx) {
            ctx.count = this.count;
            return true;
        },
        "Updated the ctx to reflect the current note's duration"
    ],

    [
        function(ctx) {
            return ctx.smallest <= getBeats(this.count, 0); },
        function (ctx) {
            ctx.smallest = getBeats(this.count, 0);
            return "line";
        },
        "All notes, chords, and rests throughout a line must have the same spacing"
    ],

    [
        function(ctx) {
            return (ctx.beats + getBeats(this.count, getDots(this), getTuplet(this)) <=
                getBeats(ctx.timeSignature.beatType) * ctx.timeSignature.beats); },
        BarlineModel.createBarline,
        "The number of beats in a bar must not exceed that specified by the time signature"
    ],

    [
        function() {
            return false; }, // re-calculate it every time
        function(ctx) {
            this.annotatedExtraWidth = (Math.log(getBeats(
                            this.count, getDots(this), getTuplet(this))) -
                    Math.log(ctx.smallest))/log2/3;
            return true;
        },
        "Each note's width has a linear component proportional to the log of its duration"
    ],

    [
        function (ctx) {
            return (!ctx.isBeam && this.inBeam /* don't check twice*/) ||
                (ctx.x + this.getWidth(ctx) <= ctx.maxX); },
        NewlineModel.createNewline,
        "The width of a line must not exceed that specified by the page layout"
    ],

    [
        function(ctx) {
            // XXX: Extend beam logic to work in other time signatures.
            return ctx.curr().isBeam || !ctx.beamFollows();
        },
        function(ctx) {
            return ctx.removeFollowingBeam();
        },
        "Recalculate future beams."
    ],

    [
        cannotBeBeamed,
        function (ctx) {
            var b = beamable(ctx);
            var BeamGroupModel = require("./beamGroup.jsx");

            _.each(b, function(b) {
                b.inBeam = true;
            });
            return BeamGroupModel.createBeam(ctx, b);
        },
        "Beams should be automatically created when applicable"
    ],

    [
        function (ctx) {
            return ctx.next(); },
        function (ctx) {
            return ctx.insertFuture(
                new EndMarkerModel({endMarker: true}));
        },
        "The document must end with a marker."
    ],

    [
        function (ctx) {
            this.forceMiddleNoteDirection = false;
            return getAverageLine(this, ctx) !== 3;
        },
        decideMiddleLineStemDirection,
        "Middle note directions are set by surrounding notes"
    ]
        
];

function decideMiddleLineStemDirection(ctx) {
    var prevLine = (ctx.prev() && (ctx.prev().pitch ||
            ctx.prev().chord)) ? getAverageLine(ctx.prev(), ctx) : null;
    var nextLine = (ctx.next() && (ctx.next().pitch ||
            ctx.next().chord)) ? getAverageLine(ctx.next(), ctx) : null;

    if ((nextLine !== null) && ctx.beats + this.getBeats() + ctx.next()
            .getBeats(this.count) > ctx.timeSignature.beats) {
        // Barlines aren't inserted yet.
        nextLine = null;
    }

    if (ctx.prev() && ctx.prev().forceMiddleNoteDirection) {
        prevLine -= ctx.prev().forceMiddleNoteDirection;
    }

    var check;
    if (prevLine === null && nextLine === null) {
        this.forceMiddleNoteDirection = -1;
    } else if (prevLine === null) {
        check = nextLine;
    } else if (nextLine === null) {
        check = prevLine;
    } else {
        var startsAt = ctx.beats; 
        var endsAt = ctx.beats + this.getBeats();

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

    return true;
}

module.exports = DurationModel;
module.exports.countToHasStem = countToHasStem;
module.exports.countToNotehead = countToNotehead;
module.exports.countToFlag = countToFlag;
module.exports.countToRest = countToRest;
module.exports.getLine = getLine;
module.exports.getPitch = getPitch;
module.exports.chromaticScale = chromaticScale;
module.exports.noteNames = noteNames;
