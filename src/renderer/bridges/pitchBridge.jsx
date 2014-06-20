/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var React = require("react");
var _ = require("underscore");
var assert = require("assert");

var BarlineBridge = require("./barlineBridge.jsx");
var ClefBridge = require("./clefBridge.jsx");
var EndMarkerBridge = require("./endMarkerBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var NewlineBridge = require("./newlineBridge.jsx");
var Note = require("../primitives/note.jsx");
var NoteMarking = require("../primitives/noteMarking.jsx");
var Rest = require("../primitives/rest.jsx");
var TimeSignatureBridge = require("./timeSignatureBridge.jsx");

class PitchBridge extends Bridge {
    constructor(isBeam, spec) {
        super(spec);
        this.isBeam = isBeam;
    }

    annotateImpl(cursor, stave, idx) {
        this._line = getLine(this, cursor);
        
        if (!cursor.isBeam) {
            cursor.beats = (cursor.beats || 0) +
                getBeats(getCount(this), getDots(this), getTuplet(this));
        }

        if (!cursor.isBeam && this.inBeam) {
            this._handleTie(cursor, stave, idx);
            return true;
        } else if (!this.inBeam) {
            this._handleTie(cursor, stave, idx);
        }
        this.setX(cursor.x);
        this._fontSize = cursor.fontSize;
        cursor.x += this.getWidth(cursor);
        this._acc = getAccidentals(this, cursor);
        return true;
    }
    _handleTie(cursor, stave, idx) {
        if (this.tie) {
            this._tieTo = this.nextNote(stave, idx);
        } else {
            this._tieTo = null;
        }
    }
    visible() {
        return !this.inBeam;
    }
    render(isBeam) {
        var Renderer = require("../renderer.jsx");

        var markings = (this.accents || []).map((m, idx) =>
            <NoteMarking marking={m} key={idx} />
        );

        if (this.pitch === "r") {
            return <Rest
                    dotted={this.dots}
                    line={3}
                    key={this.key()}
                    notehead={countToRest[this.count]}
                    stroke={this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black")}
                    x={this.x()}
                    y={this.y()}>
                {markings}
            </Rest>;
        }

        return <Note
                accStrokes={getAccStrokes(this)}
                accidentals={this._acc}
                dotted={this.dots}
                flag={!isBeam && (this.count in countToFlag) && countToFlag[this.count]}
                hasStem={countToHasStem[this.count]}
                key={this.key()}
                line={this._line}
                notehead={countToNotehead[this.count]}
                scaleFactor={this._fontSize*Renderer.FONT_SIZE_FACTOR + "px"}
                secondaryStroke={this.selected ? "#75A1D0" : "black"}
                strokes={getStrokes(this)}
                tieTo={this._tieTo && this._tieTo.x()}
                x={this.x()}
                y={this.y()}>
            {markings}
        </Note>;
    }

    getWidth(cursor) {
        return 0.56 + (this.annotatedExtraWidth || 0);
    }

    _lyPitch(pitch) {
        var str = pitch.pitch;
        if (pitch.acc === 1) {
            str += "is";
        } else if (pitch.acc === -1) {
            str += "es";
        }
        if (pitch.octave > 0) {
            _(pitch.octave).times(() => str += "'");
        } else if (pitch.octave < 0) {
            _(-pitch.octave).times(() => str += ",");
        }

        return str;
    }

    toLylite(lylite) {
        var str;
        if (this.pitch) {
            str = this._lyPitch(obj);
        } else if (this.chord) {
            str = "< " + this.chord.map(a => this._lyPitch(a)).join(" ") + " >";
        }
        str += this.count;
        if (this.dots) {
            _(this.dots).times(d => str += ".");
        }
        if (this.tie) {
            str += "~";
        }
        lylite.push(str);
    }
}

var log2 = Math.log(2);

var getLine = (pitch, cursor) => {
    if (!cursor) {
        assert(pitch["$PitchBridge_line"] !== undefined,
                "Must be first annotated in pitchBridge.jsx");
        return pitch["$PitchBridge_line"];
    }
    assert(cursor.clef, "A clef must be inserted before the first note");
    if (pitch.chord) {
        return pitch.chord.map(p => getLine(p, cursor));
    }
    if (pitch.pitch === "r") {
        return 3;
    }
    return clefOffsets[cursor.clef] + (pitch.octave || 0)*3.5 + pitchOffsets[pitch.pitch];
};

var getPitch = (line, cursor) => {
    assert(cursor.clef, "A clef must be inserted before the first note");
    var pitch = offsetToPitch[((line - clefOffsets[cursor.clef]) % 3.5 + 3.5) % 3.5];
    var acc = cursor.accidentals[pitch];

    return {
        pitch: offsetToPitch[((line - clefOffsets[cursor.clef]) % 3.5 + 3.5) % 3.5],
        octave: Math.floor((line - clefOffsets[cursor.clef])/3.5),
        acc: acc
    };
};

var getAccStrokes = (pitch) => {
    if (pitch.chord) {
        return pitch.chord.map(c => c.accTemporary ? "#A5A5A5" : "black");
    }
    return [pitch.accTemporary ? "#A5A5A5" : "black"];
};

var getStrokes = (pitch) => {
    if (pitch.chord) {
        return pitch.chord.map(c => c.temporary ?
                "#A5A5A5" :
                (pitch.selected ? "#75A1D0" : "black"));
    }
    return [pitch.temporary ? "#A5A5A5" : (pitch.selected ? "#75A1D0" : "black" )];
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

var getAccidentals = (pitch, cursor) => {
    if (pitch.chord) {
        return pitch.chord.map(p => getAccidentals(p, cursor));
    }

    var actual = pitch.acc;
    var target = cursor.accidentals[pitch.pitch];
    if (actual === target) {
        return undefined; // no accidental
    }

    if (!actual) {
        delete cursor.accidentals[pitch.pitch];
        return 0; // natural
    }

    cursor.accidentals[pitch.pitch] = actual;
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

var cannotBeBeamed = function(cursor, stave, idx) {
    return this.inBeam || !beamable(cursor, stave, idx);
}

var beamable = (cursor, stave, idx) => {
    // TODO: give a better algorithm
    // This has lots of corner cases that don't work (it's for a demo!)
    var beamable = [];
    var count = getCount(stave.body[idx]);
    var rcount = 1/parseInt(cursor.count);
    var c = 0;
    var hasTimeValue = (other) => other.pitch || other.chord;
    var isRest = (other) => other.pitch === "r";
    var prev;

    var beats = cursor.beats;

    for (var i = idx; i < stave.body.length; ++i) {
        if (hasTimeValue(stave.body[i])) {
            if (stave.body[i].inBeam) {
                break;
            }
            if (cursor.timeSignature.beatType === 4 &&
                    cursor.timeSignature.beats === 4 && rcount <= 2 &&
                    rcount + 1/parseInt(getCount(stave.body[i])) >= 2) {
                break;
            }
            if (isRest(stave.body[i])) {
                break;
            }

            beats += getBeats(getCount(stave.body[i]), getDots(stave.body[i]), 
                        getTuplet(stave.body[i]));

            if (beats > getBeats(cursor.timeSignature.beatType) * cursor.timeSignature.beats) {
                break;

            }

            if (prev && prev.tuplet) {
                if (!stave.body[i].tuplet) {
                    break;
                }
                if (stave.body[i].tuplet.num !== prev.tuplet.num) {
                    break;
                }
                if (stave.body[i].tuplet.den !== prev.tuplet.den) {
                    break;
                }
            }
            if (countToIsBeamable[getCount(stave.body[i]) || count]) {
                beamable = beamable.concat(stave.body[i]);
            } else {
                break;
            }
            if (++c >= 4) {
                break;
            }

            prev = stave.body[i];
            rcount += 1/parseInt(getCount(stave.body[i]));
        }
    }
    if (beamable.length > 1) {
        return beamable;
    }
    return false;
};

var getBeats = (count, dots, tuplet) => {
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

var getCount = obj => obj.actualCount || obj.count;

var getTuplet = obj => (obj.actualTuplet !== undefined) ? obj.actualTuplet : obj.tuplet;

PitchBridge.prototype.prereqs = [
    [
        function(cursor) {
            return cursor.clef },
        ClefBridge.createClef,
        "A clef must exist on each line."
    ],

    [
        function(cursor) {
            return cursor.keySignature },
        KeySignatureBridge.createKeySignature,
        "A key signature must exist on each line."
    ],

    [
        function (cursor) {
            return cursor.timeSignature },
        TimeSignatureBridge.createTS,
        "A time signature must exist on the first line of every page."
    ],

    [
        function (cursor) {
            return this.count },
        function (cursor) {
            assert(cursor.count, "Never null -- starts at 4");
            this.count = cursor.count;
            return true;
        },
        "A note's duration, when unspecified, is set by the previous note"
    ],

    [
        function (cursor) {
            return getCount(this) === cursor.count },
        function (cursor) {
            cursor.count = getCount(this);
            return true;
        },
        "Updated the cursor to reflect the current note's duration"
    ],

    [
        function(cursor) {
            return cursor.smallest <= getBeats(getCount(this), 0) },
        function (cursor) {
            cursor.smallest = getBeats(getCount(this), 0);
            return "line";
        },
        "All notes, chords, and rests throughout a line must have the same spacing"
    ],

    [
        function(cursor) {
            return (!cursor.isBeam && this.inBeam /* don't check twice */) ||
            (cursor.beats + getBeats(getCount(this), getDots(this), getTuplet(this)) <=
                getBeats(cursor.timeSignature.beatType) * cursor.timeSignature.beats) },
        BarlineBridge.createBarline,
        "The number of beats in a bar must not exceed that specified by the time signature"
    ],

    [
        function() {
            return false; }, // re-calculate it every time
        function(cursor, stave, idx) {
            this.annotatedExtraWidth = (Math.log(getBeats(
                            getCount(this), getDots(this), getTuplet(this))) -
                    Math.log(cursor.smallest))/log2/3;
            return true;
        },
        "Each note's width has a linear component proportional to the log of its duration"
    ],

    [
        function (cursor) {
            return (!cursor.isBeam && this.inBeam /* don't check twice*/) ||
                (cursor.x + this.getWidth(cursor) <= cursor.maxX) },
        NewlineBridge.createNewline,
        "The width of a line must not exceed that specified by the page layout"
    ],

    [
        cannotBeBeamed,
        function (cursor, stave, idx) {
            var b = beamable(cursor, stave, idx);
            var BeamGroupBridge = require("./beamGroupBridge.jsx");

            b.forEach(function(b) {
                b.inBeam = true;
            });
            return BeamGroupBridge.createBeam(cursor, stave, idx, b);
        },
        "Beams should be automatically created when applicable"
    ],

    [
        function (cursor, stave, idx) {
            return stave.body[idx + 1] },
        function (cursor, stave, idx) {
            stave.body.splice(idx + 1, 0,
                new EndMarkerBridge({endMarker: true}));
            return true;
        },
        "The document must end with a marker."
    ]
];

module.exports = PitchBridge;
module.exports.countToHasStem = countToHasStem;
module.exports.countToNotehead = countToNotehead;
module.exports.countToFlag = countToFlag;
module.exports.countToRest = countToRest;
module.exports.getCount = getCount;
module.exports.getLine = getLine;
module.exports.getPitch = getPitch;
