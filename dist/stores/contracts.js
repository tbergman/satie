exports.MusicXML = require("musicxml-interfaces");
var _ = require("lodash");
var assign = require("react/lib/Object.assign");
exports.SMuFL = require("../util/SMuFL");
exports.renderUtil = require("../util/renderUtil");
exports.strHash = require("../util/hash");
;
(function (BeamCount) {
    BeamCount[BeamCount["Variable"] = -1] = "Variable";
    BeamCount[BeamCount["One"] = 1] = "One";
    BeamCount[BeamCount["Two"] = 2] = "Two";
    BeamCount[BeamCount["Three"] = 3] = "Three";
    BeamCount[BeamCount["Four"] = 4] = "Four";
    BeamCount[BeamCount["Five"] = 5] = "Five";
    BeamCount[BeamCount["Six"] = 6] = "Six";
    BeamCount[BeamCount["Seven"] = 7] = "Seven";
    BeamCount[BeamCount["Eight"] = 8] = "Eight";
    BeamCount[BeamCount["Nine"] = 9] = "Nine";
})(exports.BeamCount || (exports.BeamCount = {}));
var BeamCount = exports.BeamCount;
(function (Clef) {
    Clef[Clef["Treble"] = 0] = "Treble";
    Clef[Clef["Bass"] = 1] = "Bass";
    Clef[Clef["Alto"] = 2] = "Alto";
    Clef[Clef["Tenor"] = 3] = "Tenor";
    Clef[Clef["Piano"] = 4] = "Piano";
    Clef[Clef["Choral"] = 5] = "Choral";
    Clef[Clef["TrebleDrums"] = 6] = "TrebleDrums";
})(exports.Clef || (exports.Clef = {}));
var Clef = exports.Clef;
var DispatcherRedirect = (function () {
    function DispatcherRedirect(verb, newUrl) {
        this.newUrl = newUrl;
        this.verb = verb;
    }
    return DispatcherRedirect;
})();
exports.DispatcherRedirect = DispatcherRedirect;
;
var InvalidMXMLException = (function () {
    function InvalidMXMLException(reason, bar, beat, part) {
        this.reason = reason;
        this.bar = bar;
        this.beat = beat;
        this.part = part;
    }
    InvalidMXMLException.prototype.toString = function () {
        return "Import failed in part " + this.part + " on bar " + this.bar + ", beat " + this.beat + ".\n\n" + this.reason + "If you believe this error is a bug, please report it at https://github.com/ripieno/satie";
    };
    return InvalidMXMLException;
})();
exports.InvalidMXMLException = InvalidMXMLException;
var ScoreHeader = (function () {
    function ScoreHeader(spec) {
        this.credits = [];
        this.identification = {
            creators: [],
            encoding: null,
            miscellaneous: [],
            relations: [],
            rights: [],
            source: null
        };
        this.defaults = {
            appearance: {
                distances: {
                    hyphen: {
                        tenths: 120,
                        type: "hyphen"
                    },
                    beam: {
                        tenths: 10 * exports.SMuFL.distances.beam,
                        type: "beam"
                    }
                },
                lineWidths: {
                    staff: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.staffLineThickness,
                        "type": "staff"
                    },
                    wedge: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.hairpinThickness,
                        "type": "wedge"
                    },
                    ending: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.repeatEndingLineThickness,
                        "type": "ending"
                    },
                    heavyBarline: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.thickBarlineThickness,
                        "type": "heavy barline"
                    },
                    leger: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.legerLineThickness,
                        "type": "leger"
                    },
                    stem: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.stemThickness,
                        "type": "stem"
                    },
                    tupletBracket: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.tupletBracketThickness,
                        "type": "tuplet bracket"
                    },
                    beam: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.beamThickness,
                        "type": "beam"
                    },
                    lightBarline: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.thinBarlineThickness,
                        "type": "light barline"
                    },
                    enclosure: {
                        "tenths": 10 * exports.SMuFL.bravuraMetadata.engravingDefaults.textEnclosureThickness,
                        "type": "enclosure"
                    }
                },
                noteSizes: {
                    1: {
                        "type": 1,
                        "size": 60
                    },
                    0: {
                        "type": 0,
                        "size": 60
                    }
                },
                otherAppearances: []
            },
            lyricFonts: [],
            lyricLanguages: [],
            musicFont: {
                fontSize: "20.5",
                fontFamily: "Bravura, Maestro, engraved",
                fontStyle: 0 /* Normal */,
                fontWeight: 0 /* Normal */
            },
            pageLayout: {
                pageHeight: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.pageSizes[0].height),
                pageWidth: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.pageSizes[0].width),
                pageMargins: [
                    {
                        bottomMargin: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.defaultMargins.bottom),
                        leftMargin: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.defaultMargins.left),
                        rightMargin: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.defaultMargins.right),
                        topMargin: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.defaultMargins.top),
                        type: 2 /* Both */
                    }
                ]
            },
            scaling: {
                millimeters: exports.renderUtil.defaultStaveHeight,
                tenths: 40
            },
            staffLayouts: [],
            systemLayout: {
                systemDistance: 131,
                systemDividers: null,
                systemMargins: {
                    leftMargin: 0,
                    rightMargin: 0
                },
                topSystemDistance: 0
            },
            wordFont: {
                fontSize: "12",
                fontFamily: "Alegreya, Times New Roman, serif",
                fontStyle: 0 /* Normal */,
                fontWeight: 0 /* Normal */
            }
        };
        this.work = {
            opus: {},
            workNumber: "",
            workTitle: ""
        };
        this.movementTitle = "";
        this.movementNumber = "";
        this.partList = {
            scoreParts: [],
            partGroups: []
        };
        for (var key in spec) {
            if (spec.hasOwnProperty(key) && typeof key === "string" && !!spec[key]) {
                this[key] = spec[key];
            }
        }
    }
    Object.defineProperty(ScoreHeader.prototype, "composer", {
        get: function () {
            if (!this.identification || !(this.identification.creators || []).length) {
                return "";
            }
            var idComposer = this.identification.creators.filter(function (c) { return c.type === "composer"; }).map(function (c) { return c.creator; }).join(", ");
            if (idComposer) {
                return idComposer;
            }
            return this.credits.filter(function (c) { return !!~c.creditTypes.indexOf("composer"); }).map(function (m) { return m.creditWords.map(function (w) { return w.words; }).join(" "); }).join(", ");
        },
        set: function (composer) {
            this.identification = this.identification || {
                miscellaneous: [],
                creators: [],
                encoding: [],
                relations: [],
                rights: [],
                source: null
            };
            this.identification.creators = this.identification.creators || [];
            if (!_.any(this.identification.creators, function (c) {
                var isComposer = c.type === "composer";
                c.creator = isComposer ? composer : c.creator;
                return isComposer;
            })) {
                this.identification.creators.push({
                    creator: composer,
                    type: "composer"
                });
            }
            this.credits = this.credits || [];
            if (!_.any(this.credits, function (c) {
                if (!c.creditWords.length) {
                    return false;
                }
                var isComposer = !!~c.creditTypes.indexOf("composer");
                c.creditWords[0].words = isComposer ? composer : c.creditWords[0].words;
                return isComposer;
            })) {
                this.credits.push({
                    creditImage: null,
                    creditTypes: ["composer"],
                    creditWords: [{
                        words: composer,
                        defaultX: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.defaultPageSize().width - exports.renderUtil.defaultMargins.right),
                        justify: 1 /* Right */,
                        defaultY: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, 2),
                        fontSize: "18px"
                    }],
                    page: 1
                });
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreHeader.prototype, "title", {
        get: function () {
            return this.movementTitle;
        },
        set: function (title) {
            this.movementTitle = title;
            this.credits = this.credits || [];
            if (!_.any(this.credits, function (c) {
                if (!c.creditWords.length) {
                    return false;
                }
                var isComposer = !!~c.creditTypes.indexOf("title");
                c.creditWords[0].words = isComposer ? title : c.creditWords[0].words;
                return isComposer;
            })) {
                this.credits.push({
                    creditImage: null,
                    creditTypes: ["title"],
                    creditWords: [{
                        words: title,
                        defaultX: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.defaultPageSize().width / 2),
                        justify: 2 /* Center */,
                        defaultY: exports.renderUtil.mmToTenths(exports.renderUtil.defaultStaveHeight, exports.renderUtil.defaultMargins.top / 2),
                        fontSize: "24px"
                    }],
                    page: 1
                });
            }
        },
        enumerable: true,
        configurable: true
    });
    return ScoreHeader;
})();
exports.ScoreHeader = ScoreHeader;
function generateUUID() {
    "use strict";
    return (Math.random().toString(16) + "000000000").substr(2, 8);
}
exports.generateUUID = generateUUID;
var Print = (function () {
    function Print(print) {
        assign(this, print);
    }
    Print.prototype.pageMarginsFor = function (page) {
        for (var i = 0; i < this.pageLayout.pageMargins.length; ++i) {
            var margins = this.pageLayout.pageMargins[i];
            if (margins.type === 2 /* Both */ || (margins.type === 0 /* Odd */) === !!(page % 2)) {
                return margins;
            }
        }
        console.warn("No valid page margins for current page...");
        return null;
    };
    return Print;
})();
exports.Print = Print;
function getPrint(header) {
    "use strict";
    return new Print({
        blankPage: "",
        measureLayout: null,
        measureNumbering: {
            relativeX: 0,
            relativeY: 0,
            fontSize: "small",
            color: "#000000",
            data: "system",
            defaultX: null,
            defaultY: null,
            fontFamily: "Alegreya, serif",
            fontStyle: 0 /* Normal */,
            fontWeight: 0 /* Normal */
        },
        newPage: false,
        newSystem: false,
        partAbbreviationDisplay: null,
        pageLayout: header.defaults.pageLayout,
        pageNumber: "",
        partNameDisplay: null,
        staffLayouts: header.defaults.staffLayouts,
        staffSpacing: null,
        systemLayout: header.defaults.systemLayout
    });
}
exports.getPrint = getPrint;
var InvalidDurationError = (function () {
    function InvalidDurationError() {
    }
    return InvalidDurationError;
})();
exports.InvalidDurationError = InvalidDurationError;
(function (IterationStatus) {
    IterationStatus[IterationStatus["ExitEarly"] = 5] = "ExitEarly";
    IterationStatus[IterationStatus["Success"] = 10] = "Success";
    IterationStatus[IterationStatus["RetryCurrent"] = 20] = "RetryCurrent";
    IterationStatus[IterationStatus["RetryCurrentNoOptimizations"] = 30] = "RetryCurrentNoOptimizations";
    IterationStatus[IterationStatus["RetryBeam"] = 40] = "RetryBeam";
    IterationStatus[IterationStatus["LineRemoved"] = 50] = "LineRemoved";
    IterationStatus[IterationStatus["RetryLine"] = 60] = "RetryLine";
    IterationStatus[IterationStatus["LineCreated"] = 70] = "LineCreated";
    IterationStatus[IterationStatus["RetryPreviousLine"] = 80] = "RetryPreviousLine";
    IterationStatus[IterationStatus["RetryFromEntry"] = 90] = "RetryFromEntry";
})(exports.IterationStatus || (exports.IterationStatus = {}));
var IterationStatus = exports.IterationStatus;
;
var Location = (function () {
    function Location(opts) {
        this.bar = opts.bar;
        this.division = opts.division;
        this.endMarker = opts.endMarker;
    }
    Location.prototype.eq = function (b) {
        return this.bar === b.bar && this.division === b.division;
    };
    Location.prototype.lt = function (b) {
        return this.bar < b.bar || this.bar === b.bar && this.division < b.division;
    };
    Location.prototype.le = function (b) {
        return this.bar < b.bar || this.bar === b.bar && this.division <= b.division;
    };
    Location.prototype.ge = function (b) {
        return this.bar > b.bar || this.bar === b.bar && this.division >= b.division;
    };
    Location.prototype.gt = function (b) {
        return this.bar > b.bar || this.bar === b.bar && this.division > b.division;
    };
    return Location;
})();
exports.Location = Location;
exports.log2 = Math.log(2);
exports.MAX_NUM = 1000000000;
;
exports.noteNames = ["C", "C\u266F", "D\u266D", "D", "D\u266F", "E\u266D", "E", "F", "F\u266F", "G\u266D", "G", "G\u266F", "A\u266D", "A", "A\u266F", "B\u266D", "B"];
var MetreContext = (function () {
    function MetreContext(other) {
        this.endMarker = false;
        this.ts = { beats: 4, beatType: 4, commonRepresentation: false };
        this.bar = 1;
        this.division = 0;
        if (other) {
            this.ts = {
                beats: other.ts.beats,
                beatType: other.ts.beatType,
                commonRepresentation: other.ts.commonRepresentation
            };
            this.bar = other.bar;
            this.division = other.division;
            this.endMarker = other.endMarker || false;
        }
    }
    return MetreContext;
})();
exports.MetreContext = MetreContext;
(function (MidiEventType) {
    MidiEventType[MidiEventType["NoteOn"] = 0] = "NoteOn";
    MidiEventType[MidiEventType["NoteOff"] = 1] = "NoteOff";
})(exports.MidiEventType || (exports.MidiEventType = {}));
var MidiEventType = exports.MidiEventType;
;
;
;
;
;
(function (PreviewMode) {
    PreviewMode[PreviewMode["ExcludePreviews"] = 0] = "ExcludePreviews";
    PreviewMode[PreviewMode["IncludePreviews"] = 1] = "IncludePreviews";
})(exports.PreviewMode || (exports.PreviewMode = {}));
var PreviewMode = exports.PreviewMode;
;
(function (RectifyXPolicy) {
    RectifyXPolicy[RectifyXPolicy["Invalid"] = 0] = "Invalid";
    RectifyXPolicy[RectifyXPolicy["Max"] = 1] = "Max";
    RectifyXPolicy[RectifyXPolicy["Min"] = 2] = "Min";
})(exports.RectifyXPolicy || (exports.RectifyXPolicy = {}));
var RectifyXPolicy = exports.RectifyXPolicy;
;
(function (EventType) {
    EventType[EventType["Change"] = 0] = "Change";
    EventType[EventType["Annotate"] = 1] = "Annotate";
    EventType[EventType["History"] = 2] = "History";
    EventType[EventType["ClearHistory"] = 3] = "ClearHistory";
    EventType[EventType["MidiOut"] = 4] = "MidiOut";
    EventType[EventType["MidiIn"] = 5] = "MidiIn";
})(exports.EventType || (exports.EventType = {}));
var EventType = exports.EventType;
(function (Type) {
    Type[Type["Print"] = 50] = "Print";
    Type[Type["START_OF_ATTRIBUTES"] = 100] = "START_OF_ATTRIBUTES";
    Type[Type["EndMarker"] = 110] = "EndMarker";
    Type[Type["NewPage"] = 120] = "NewPage";
    Type[Type["NewLine"] = 130] = "NewLine";
    Type[Type["Begin"] = 140] = "Begin";
    Type[Type["Attributes"] = 145] = "Attributes";
    Type[Type["Clef"] = 150] = "Clef";
    Type[Type["KeySignature"] = 160] = "KeySignature";
    Type[Type["TimeSignature"] = 170] = "TimeSignature";
    Type[Type["END_OF_ATTRIBUTES"] = 199] = "END_OF_ATTRIBUTES";
    Type[Type["Barline"] = 300] = "Barline";
    Type[Type["START_OF_MODIFIERS"] = 400] = "START_OF_MODIFIERS";
    Type[Type["Direction"] = 410] = "Direction";
    Type[Type["Slur"] = 425] = "Slur";
    Type[Type["BeamGroup"] = 450] = "BeamGroup";
    Type[Type["Wedge"] = 475] = "Wedge";
    Type[Type["END_OF_MODIFIERS"] = 499] = "END_OF_MODIFIERS";
    Type[Type["Duration"] = 600] = "Duration";
    Type[Type["Placeholder"] = 999] = "Placeholder";
    Type[Type["Unknown"] = 1111] = "Unknown";
})(exports.Type || (exports.Type = {}));
var Type = exports.Type;
;
;
;
;
var NoteUtil;
(function (NoteUtil) {
    "use strict";
    function makeDuration(spec) {
        "use strict";
        return {
            count: spec.count,
            dots: spec.dots || 0,
            tuplet: spec.tuplet || null,
            displayTuplet: null
        };
    }
    NoteUtil.makeDuration = makeDuration;
    function pitchToMidiNumber(p) {
        "use strict";
        var base = require("./duration").chromaticScale[p.step] + 48;
        return base + (p.octave || 0) * 12 + (p.alter || 0);
    }
    NoteUtil.pitchToMidiNumber = pitchToMidiNumber;
    NoteUtil.noteToVal = {
        c: 0,
        d: 2,
        e: 4,
        f: 5,
        g: 7,
        a: 9,
        b: 11
    };
    NoteUtil.valToNote = _.invert(NoteUtil.noteToVal);
    function midiNumberToPitch(n, ctx) {
        "use strict";
        var key = ctx.attributes.keySignature;
        var tendency = key.fifths >= 0 ? 0 : 1;
        var idealStepsPerInterval = {
            0: 0,
            1: 0 + tendency,
            2: 1,
            3: 2,
            4: 2,
            5: 3,
            6: 3 + tendency,
            7: 4,
            8: 5,
            9: 5,
            10: 6,
            11: 6
        };
        var pitchS = NoteUtil.keyCircle[NoteUtil.circleOffsetByMode[key.mode] + key.fifths];
        var pitch = {
            alter: pitchS[1] === "#" ? 1 : (pitchS[1] === "b" ? -1 : 0),
            octave: 0,
            step: pitchS[0]
        };
        var halfStepsFromScaleRoot = (((n - pitchToMidiNumber(pitch)) % 12) + 12) % 12;
        var idealSteps = idealStepsPerInterval[halfStepsFromScaleRoot];
        var notesInv = {
            "C": 0,
            "D": 1,
            "E": 2,
            "F": 3,
            "G": 4,
            "A": 5,
            "B": 6
        };
        var notes = _.invert(notesInv);
        var base = notes[(notesInv[pitch.step] + idealSteps) % 7];
        var acc = -positiveMod(pitchToMidiNumber({ octave: 0, alter: 0, step: base }) - n, 12) || null;
        if (acc < -6) {
            acc += 12;
        }
        return {
            octave: Math.floor(n / 12 - 4),
            alter: acc,
            step: base
        };
    }
    NoteUtil.midiNumberToPitch = midiNumberToPitch;
    function positiveMod(base, mod) {
        return ((base % mod) + mod) % mod;
    }
    NoteUtil.positiveMod = positiveMod;
    function getAccidentals(key) {
        var ret = {};
        if (key.fifths < 0) {
            _.times(Math.min(7, -key.fifths), function (idx) {
                ret[NoteUtil.flatCircle[idx]] = (7 + idx < -key.fifths) ? -2 : -1;
            });
            return ret;
        }
        else {
            _.times(Math.min(7, key.fifths), function (idx) {
                ret[NoteUtil.flatCircle[idx]] = (7 + idx < key.fifths) ? 2 : 1;
            });
            return ret;
        }
    }
    NoteUtil.getAccidentals = getAccidentals;
    ;
    NoteUtil.flatCircle = "BEADGCF";
    NoteUtil.sharpCircle = "FCGDAEB";
    NoteUtil.keyCircle = [
        "Fb",
        "Cb",
        "Gb",
        "Db",
        "Ab",
        "Eb",
        "Bb",
        "F ",
        "C ",
        "G ",
        "D ",
        "A ",
        "E ",
        "B ",
        "F#",
        "C#",
        "G#",
        "D#",
        "A#",
        "E#"
    ];
    NoteUtil.circleOffsetByMode = {
        major: 8,
        minor: 11
    };
    function isPitch(k, name, acc) {
        return k.step === name && (k.alter || 0) === (acc || 0);
    }
    NoteUtil.isPitch = isPitch;
})(NoteUtil = exports.NoteUtil || (exports.NoteUtil = {}));
exports.InvalidAccidental = 9001;
var JSONx;
(function (JSONx) {
    "use strict";
    function clone(obj) {
        "use strict";
        return JSON.parse(JSON.stringify(obj));
    }
    JSONx.clone = clone;
    function hash(obj) {
        "use strict";
        return exports.strHash(JSON.stringify(obj));
    }
    JSONx.hash = hash;
})(JSONx = exports.JSONx || (exports.JSONx = {}));
function deepAssign(a, b) {
    "use strict";
    if (a instanceof Array || b instanceof Array) {
        var retArr = [];
        var aArr = a;
        var bArr = b;
        for (var i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return retArr;
    }
    else if (a instanceof Object || b instanceof Object) {
        var ret = a ? JSONx.clone(a) : {};
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                ret[key] = deepAssign(ret[key], b[key]);
            }
        }
        return ret;
    }
    else {
        return (a === undefined) ? b : a;
    }
}
exports.deepAssign = deepAssign;
function tsToSimpleTS(ts) {
    var commonBeatType = _.reduce(ts.beatTypes, function (maxBT, beatType) { return Math.max(maxBT, beatType); }, 0);
    var totalBeats = _.reduce(ts.beats, function (memo, time, i) { return memo + _.reduce(time.split("+"), function (memo, time) { return memo + parseInt(time, 10) * commonBeatType / ts.beatTypes[i]; }, 0); }, 0);
    return {
        beats: totalBeats,
        beatType: commonBeatType,
        commonRepresentation: isNaN(ts.symbol) || ts.symbol !== 5 /* Normal */
    };
}
exports.tsToSimpleTS = tsToSimpleTS;
exports.defaultClefLines = {
    G: 2,
    F: 4,
    C: 3,
    PERCUSSION: 3,
    TAB: 5,
    NONE: 3
};
global.C = module.exports;
