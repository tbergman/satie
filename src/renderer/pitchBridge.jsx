/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var React = require("react");
var _ = require("underscore");
var assert = require("assert");

var BarlineBridge = require("./barlineBridge.jsx");
var ClefBridge = require("./clefBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var NewlineBridge = require("./newlineBridge.jsx");
var Note = require("../primitives/note.jsx");
var NoteMarking = require("../primitives/noteMarking.jsx");
var Rest = require("../primitives/rest.jsx");
var TimeSignatureBridge = require("./timeSignatureBridge.jsx");
var unittest = require("../unittest.jsx");

class PitchBridge extends Bridge {
    constructor(isBeam) {
        super();
        this.isBeam = isBeam;
    }

    prereqs() {
        return [
            [
                (obj, cursor) => cursor.clef,
                ClefBridge.createClef,
                "A clef must exist on each line."
            ],

            [
                (obj, cursor) => cursor.keySignature,
                KeySignatureBridge.createKeySignature,
                "A key signature must exist on each line."
            ],

            [
                (obj, cursor) => cursor.timeSignature,
                TimeSignatureBridge.createTS,
                "A time signature must exist on the first line of every page."
            ],

            [
                (obj, cursor) => obj.count,
                (obj, cursor) => {
                    assert(cursor.count, "Never null -- starts at 4");
                    obj.count = cursor.count;
                    return true;
                },
                "A note's duration, when unspecified, is set by the previous note"
            ],

            [
                (obj, cursor) => getCount(obj) === cursor.count,
                (obj, cursor) => {
                    cursor.count = getCount(obj);
                    return true;
                },
                "Updated the cursor to reflect the current note's duration"
            ],

            [
                (obj, cursor) => cursor.smallest <= getBeats(getCount(obj), 0),
                (obj, cursor) => {
                    cursor.smallest = getBeats(getCount(obj), 0);
                    return "line";
                },
                "All notes, chords, and rests throughout a line must have the same spacing"
            ],

            [
                (obj, cursor) => (!this.isBeam && obj.inBeam /* don't check twice */) ||
                    (cursor.beats + getBeats(getCount(obj), getDots(obj), getTuplet(obj)) <=
                        getBeats(cursor.timeSignature.beatType) * cursor.timeSignature.beats),
                BarlineBridge.createBarline,
                "The number of beats in a bar must not exceed that specified by the time signature"
            ],

            [
                () => false, // re-calculate it every time
                (obj, cursor, stave, idx) => {
                    obj._annotatedExtraWidth = (Math.log(getBeats(
                                    getCount(obj), getDots(obj), getTuplet(obj))) -
                            Math.log(cursor.smallest))/log2/3;
                    return true;
                },
                "Each note's width has a linear component proportional to the log of its duration"
            ],

            [
                (obj, cursor) => (!this.isBeam && obj.inBeam /* don't check twice*/) ||
                    (cursor.x + this.getWidth(obj, cursor) <= cursor.maxX),
                NewlineBridge.createNewline,
                "The width of a line must not exceed that specified by the page layout"
            ],

            [
                cannotBeBeamed,
                (obj, cursor, stave, idx) => {
                    var b = beamable(obj, cursor, stave, idx);
                    var BeamGroupBridge = require("./beamGroupBridge.jsx");

                    b.forEach(function(b) {
                        b.inBeam = true;
                    });
                    return BeamGroupBridge.createBeam(obj, cursor, stave, idx, b);
                },
                "Beams should be automatically created when applicable"
            ]
        ];
    }

    annotateImpl(obj, cursor, stave, idx) {
        obj._line = getLine(obj, cursor);

        if (!this.isBeam && obj.inBeam) {
            this._handleTie(obj, cursor, stave, idx);
            return true;
        } else if (!obj.inBeam) {
            this._handleTie(obj, cursor, stave, idx);
        }
        this.setX(obj, cursor.x);
        obj._fontSize = cursor.fontSize;
        cursor.x += this.getWidth(obj, cursor);
        cursor.beats = (cursor.beats || 0) + getBeats(getCount(obj), getDots(obj), getTuplet(obj));
        obj._acc = getAccidentals(obj, cursor);
        return true;
    }
    _handleTie(obj, cursor, stave, idx) {
        if (obj.tie) {
            obj._tieTo = this.nextNote(stave, idx);
        } else {
            obj._tieTo = null;
        }
    }
    visible(obj) {
        return this.isBeam || !obj.inBeam;
    }
    render(obj) {
        var markings = (obj.accents || []).map((m, idx) =>
            <NoteMarking marking={m} key={idx} />
        );

        if (obj.pitch === "r") {
            return <Rest
                    dotted={obj.dots}
                    line={3}
                    key={this.key(obj)}
                    notehead={countToRest[obj.count]}
                    stroke={obj.temporary ? "#A5A5A5" : "black"}
                    x={this.x(obj)}
                    y={this.y(obj)}>
                {markings}
            </Rest>;
        }

        return <Note
                accStrokes={getAccStrokes(obj)}
                accidentals={obj._acc}
                dotted={obj.dots}
                flag={!this.isBeam && (obj.count in countToFlag) && countToFlag[obj.count]}
                hasStem={countToHasStem[obj.count]}
                key={this.key(obj)}
                line={obj._line}
                notehead={countToNotehead[obj.count]}
                scaleFactor={obj._fontSize*37.8 + "px"}
                strokes={getStrokes(obj)}
                tieTo={obj._tieTo && this.x(obj._tieTo)}
                x={this.x(obj)}
                y={this.y(obj)}>
            {markings}
        </Note>;
    }

    getWidth(obj, cursor) {
        return 0.56 + (obj._annotatedExtraWidth || 0);
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

    toLylite(obj, lylite) {
        var str;
        if (obj.pitch) {
            str = this._lyPitch(obj);
        } else if (obj.chord) {
            str = "< " + obj.chord.map(a => this._lyPitch(a)).join(" ") + " >";
        }
        str += obj.count;
        if (obj.dots) {
            _(obj.dots).times(d => str += ".");
        }
        if (obj.tie) {
            str += "~";
        }
        lylite.push(str);
    }
}

var log2 = Math.log(2);

var getLine = (pitch, cursor) => {
    if (!cursor) {
        assert(pitch["$PitchBridge_line"] !== undefined, "Must be first annotated in pitchBridge.jsx");
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
        return pitch.chord.map(c => c.temporary ? "#A5A5A5" : "black");
    }
    return [pitch.temporary ? "#A5A5A5" : "black"];
};

var clefOffsets = {
    treble: -3.5,
    bass: 2.5,
    alto: -0.5,
    tenor: 0.5
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
    1: "noteheadDoubleWhole",
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

var cannotBeBeamed = (obj, cursor, stave, idx) => obj.inBeam || !beamable(obj, cursor, stave, idx);

var beamable = (obj, cursor, stave, idx) => {
    // TODO: give a better algorithm
    // This has lots of corner cases that don't work (it's for a demo!)
    var beamable = [];
    var count = getCount(stave.body[idx]);
    var rcount = 1/parseInt(cursor.count);
    var c = 0;
    var hasTimeValue = (obj) => obj.pitch || obj.chord;
    var isRest = (obj) => obj.pitch === "r";
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


unittest(() => {
    // "Notes of equal duration require equal spacing for an entire system"
});

unittest(() => {
    // "In certain cases, spacing should be adjusted to create an illusion of
    // evenness. Adjacent stems 'back to back' can otherwise look too close
    // together. Notes with stems away from each other can look too far apart."
});

unittest(() => {
    // "Barlines on adjacent systems should not align. If barlines do coincide,
    // systems containing like material look too similar and the eye is liable to
    // skip a system"
});

unittest(() => {
    // "The distances between characters should not be less than 1/2 stave-space"
});

unittest(() => {
    // "Seperate the clef, key signature, time signature by 1 - 1.5 stave-spaces"
});

unittest(() => {
    // With clef only and with clef and key signature:
    //  - "2 1/2 spaces between a clef and a note with no accidentals"
    //  - "1 1/2 spaces between a clef and a note with 1 accidental"
    //  - "1 space between a clef and a note with more accidentals"
});

unittest(() => {
    // With time signature:
    //  - "2 spaces between TS and a note with no accidentals"
    //  - "1 space beteen TS and a note with 1+ accidentals"
});

unittest(() => {
    // "Where possible, note-spacing should remain unaffected
    // by the addition of accidentals"
    //
    // Exception 1: Less than 1/2 space between notes
    // Exception 2: Multiple accidentals
});

module.exports = PitchBridge;
module.exports.countToHasStem = countToHasStem;
module.exports.countToNotehead = countToNotehead;
module.exports.countToFlag = countToFlag;
module.exports.countToRest = countToRest;
module.exports.getCount = getCount;
module.exports.getLine = getLine;
module.exports.getPitch = getPitch;
