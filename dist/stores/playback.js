var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var assert = require("assert");
var _ = require("lodash");
var TSEE = require("./tsee");
var C = require("./contracts");
var Instruments = require("./instruments");
var Metre = require("./metre");
var enabled = typeof document !== "undefined";
var MIDI = enabled && _.extend(require("midi/js/MIDI/Plugin.js"), {
    audioDetect: require("midi/js/MIDI/AudioDetect.js"),
    loadPlugin: require("midi/js/MIDI/LoadPlugin.js"),
    Player: require("midi/js/MIDI/Player.js")
});
global.AudioContext = global.AudioContext || global.webkitAudioContext;
global.MIDI = MIDI;
var EventType;
(function (EventType) {
    EventType[EventType["Change"] = 0] = "Change";
    EventType[EventType["Load"] = 1] = "Load";
})(EventType || (EventType = {}));
var PlaybackStore = (function (_super) {
    __extends(PlaybackStore, _super);
    function PlaybackStore(dispatcher, score) {
        var _this = this;
        _super.call(this);
        this["DELETE /webapp/song/show"] = this["PUT /webapp/song/show"].bind(this);
        this._bpm = 120;
        this._lastChannel = -1;
        this._loadedSoundfonts = {};
        this._pendingInstruments = 0;
        this._remainingActions = [];
        this._soundfontToChannel = {};
        this._dispatcher = dispatcher;
        dispatcher.register(this._handleAction);
        this._score = score;
        this._playing = false;
        if (score) {
            score.ensureSoundfontLoaded = this.ensureLoaded.bind(this);
            score.addListener(4 /* MidiOut */, hit);
        }
        if (enabled) {
            _.defer(function () { return _this._getPiano(); });
        }
    }
    PlaybackStore.prototype.destructor = function () {
        this._play(false);
        this._dispatcher.unregister(this._handleAction);
        if (this._score) {
            this._score.removeListener(4 /* MidiOut */, hit);
        }
    };
    PlaybackStore.prototype.addChangeListener = function (callback) {
        this.on(0 /* Change */, callback);
    };
    PlaybackStore.prototype.addLoadingListener = function (callback) {
        this.on(1 /* Load */, callback);
    };
    PlaybackStore.prototype.removeChangeListener = function (callback) {
        this.removeListener(0 /* Change */, callback);
    };
    PlaybackStore.prototype.removeLoadingListener = function (callback) {
        this.removeListener(1 /* Load */, callback);
    };
    Object.defineProperty(PlaybackStore.prototype, "bpm", {
        get: function () {
            return this._bpm;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlaybackStore.prototype, "playing", {
        get: function () {
            return this._playing;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PlaybackStore.prototype, "ready", {
        get: function () {
            return !this._pendingInstruments;
        },
        enumerable: true,
        configurable: true
    });
    PlaybackStore.prototype["PUT /webapp/bpm"] = function (action) {
        assert(!isNaN(action.postData));
        this._bpm = action.postData;
        if (this._playing) {
            this._play(false);
            this._play(true);
        }
        this.emit(0 /* Change */);
    };
    PlaybackStore.prototype["POST /webapp/midiOut"] = function (action) {
        if (!this._pendingInstruments) {
            hit(action.postData);
        }
    };
    PlaybackStore.prototype["PUT /webapp/song/show"] = function (action) {
        this._play(false);
    };
    PlaybackStore.prototype["PUT /webapp/visualCursor"] = function (action) {
        if (!this._pendingInstruments && this._playing && action.postData) {
            this._timeoutId = global.setTimeout(this._continuePlay.bind(this), 0);
        }
    };
    PlaybackStore.prototype["PUT /webapp/visualCursor/togglePlay"] = function (action) {
        this._play(!this._playing);
        this.emit(0 /* Change */);
    };
    PlaybackStore.prototype._continuePlay = function () {
        var _this = this;
        var Annotator = require("./annotator");
        var divisions;
        var delays = [];
        _.each(this._remainingActions || [], function (m) {
            m();
        });
        this._remainingActions = [];
        var aobj = this._score.visualCursor.annotatedObj;
        if (aobj && aobj.endMarker) {
            this._dispatcher.PUT("/webapp/visualCursor/step", {
                step: 1,
                skipDurationlessContent: true,
                loopThroughEnd: true
            });
        }
        var seek = 0;
        var startTime = MIDI.Player.ctx.currentTime + 0.01;
        for (var h = 0; h < this._score.voices.length; ++h) {
            var body = this._score.voices[h].body;
            if (!body) {
                continue;
            }
            var visualCursor = this._score.visualCursor;
            var delay = 0;
            var bpm = this.bpm;
            var foundIdx = false;
            var soundfont = this._score.voices[h].instrument.soundfont;
            var channel = this._soundfontToChannel[soundfont];
            assert(channel !== undefined);
            var ctx = new Annotator.Context(this._score.voices, null, this._score, 1 /* NoAssertions */);
            if (enabled) {
                for (var i = 0; i < body.length; ++i) {
                    var obj = body[i];
                    foundIdx = foundIdx || (visualCursor.division === obj.ctxData.division && visualCursor.bar === obj.ctxData.bar);
                    switch (obj.type) {
                        case 145 /* Attributes */:
                            ctx.attributes = obj;
                            break;
                        case 170 /* TimeSignature */:
                            ctx.attributes.time = obj;
                            break;
                    }
                    if (foundIdx && obj.isNote) {
                        var timePerDivision = 60 / bpm / ctx.attributes.divisions;
                        divisions = Metre.calcDivisions2(obj.note, ctx);
                        if (!obj.isRest) {
                            _.each(obj.note.chord.map(C.NoteUtil.pitchToMidiNumber), function (midiNote) {
                                var a = MIDI.noteOn(channel, midiNote, 127, startTime + delay);
                                assert(a);
                                MIDI.noteOff(channel, midiNote, startTime + delay + divisions * ctx.attributes.divisions * timePerDivision);
                                if (MIDI.noteOn === MIDI.Flash.noteOn) {
                                    _this._remainingActions.push(function () { return global.clearInterval(a); });
                                }
                                else {
                                    _this._remainingActions.push(function () {
                                        a.stop();
                                    });
                                }
                            });
                        }
                        delay += divisions * ctx.attributes.divisions * timePerDivision;
                        delays.push(delay);
                    }
                    if (obj.isNote) {
                        divisions = Metre.calcDivisions2(obj.note, ctx);
                        seek += divisions * timePerDivision;
                    }
                }
            }
        }
        var delayMap = {};
        var lastIdx;
        _.each(delays, function (delay, idx) {
            if (delayMap[delay]) {
                return;
            }
            delayMap[delay] = true;
            lastIdx = idx;
            var to = global.setTimeout(function () {
                if (!_this._playing) {
                    return;
                }
                if (idx === lastIdx) {
                    global.setTimeout(function () {
                        _this._playing = false;
                        _this.emit(0 /* Change */);
                    });
                }
                _.defer(function () {
                    _this._dispatcher.PUT("/webapp/visualCursor/step", {
                        step: 1,
                        skipDurationlessContent: true,
                        loopThroughEnd: true
                    });
                });
            }, delay * 1000 - 10);
            _this._remainingActions.push(function () {
                global.clearTimeout(to);
            });
        });
    };
    PlaybackStore.prototype.ensureLoaded = function (soundfont, avoidEvent) {
        var isLoaded = this._loadedSoundfonts[soundfont];
        if (!isLoaded) {
            this._getInstrument(soundfont, avoidEvent);
        }
        return isLoaded;
    };
    PlaybackStore.prototype._getInstrument = function (soundfont, avoidEvent) {
        var _this = this;
        if (!enabled) {
            return;
        }
        if (this._loadedSoundfonts[soundfont] && typeof console !== "undefined") {
            console.warn("Already loaded", soundfont);
            return;
        }
        if (!avoidEvent) {
            this.emit(1 /* Load */);
        }
        if (this._playing) {
            this._play(false);
        }
        ++this._pendingInstruments;
        this._loadedSoundfonts[soundfont] = true;
        MIDI.loadPlugin({
            soundfontUrl: "/res/soundfonts/",
            instrument: soundfont,
            soundManagerUrl: "/res/soundmanager2.js",
            soundManagerSwfUrl: "/res/soundManager2_swf/",
            callback: function () {
                _this._soundfontToChannel[soundfont] = ++_this._lastChannel;
                MIDI.programChange(_this._lastChannel, Instruments.soundfontToProgram[soundfont]);
                if (!--_this._pendingInstruments) {
                    MIDI.setVolume(0, 127);
                    _this.emit(0 /* Change */);
                }
            }
        });
        if (!avoidEvent) {
            this.emit(0 /* Change */);
        }
    };
    PlaybackStore.prototype._getPiano = function () {
        this._getInstrument("acoustic_grand_piano", true);
    };
    PlaybackStore.prototype._handleAction = function (action) {
        assert(action.description.indexOf(" ") !== -1, "Malformed description " + action.description);
        var fn = this[action.description];
        if (fn) {
            fn.call(this, action);
        }
        return true;
    };
    PlaybackStore.prototype._play = function (on) {
        this._playing = on;
        if (this._playing) {
            this._timeoutId = global.setTimeout(this._continuePlay.bind(this), 0);
        }
        else {
            (this._remainingActions || []).forEach(function (m) {
                m();
            });
        }
    };
    PlaybackStore.latestID = 0;
    return PlaybackStore;
})(TSEE);
function hit(note, velocity, duration) {
    "use strict";
    if (note instanceof Array) {
        _.map(note, function (n) { return hit(n, velocity, duration); });
    }
    else {
        if (enabled) {
            MIDI.noteOn(0, note, velocity || 127, 0);
            MIDI.noteOff(0, note, duration || 0.5);
        }
    }
}
;
module.exports = PlaybackStore;
