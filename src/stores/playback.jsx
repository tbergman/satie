/**
 * Flux store for playback.
 */

var EventEmitter = require('events').EventEmitter; 
var _ = require("underscore");
var assert = require("assert");

var Dispatcher = require("./dispatcher.jsx"); 
var SessionStore = require("./session.jsx"); // must be registered before PlaybackStore!

var enabled = (typeof window !== "undefined");

var MIDI;
if (enabled) {
    MIDI = require("midi/js/MIDI/Plugin.js");
    MIDI = _(MIDI).extend({
        audioDetect: require("midi/js/MIDI/AudioDetect.js"),
        loadPlugin: require("midi/js/MIDI/LoadPlugin.js"),
        Player: require("midi/js/MIDI/Player.js")
    });
    global.MIDI = MIDI;
}

var CHANGE_EVENT = 'change'; 

class PlaybackStore extends EventEmitter {
    constructor() {
        Dispatcher.register(this.handleAction.bind(this));

        _pianoLoaded = false;
        _playing = false;

        if (enabled) { 
            _.defer(() => {
                MIDI.loadPlugin({
                    soundfontUrl: "/res/soundfonts/",
                    instrument: "acoustic_grand_piano",
                    soundManagerUrl: "/res/soundmanager2.js",
                    soundManagerSwfUrl: '/res/soundManager2_swf/',
                    callback: () => {
                        console.log("LOADED MIDI", MIDI.api);
                        _pianoLoaded = true;
                        MIDI.setVolume(0, 127);
                        this.emit(CHANGE_EVENT);
                    }
                });
            });
        }
    }

    handleAction(action) {
        switch(action.description) {
            case "POST /local/midiOut":
                if (_pianoLoaded) {
                    hit(action.postData);
                }
                break;
            case "POST /local/visualCursor":
                if (action.resource === "togglePlay") {
                    _playing = !_playing;
                    if (_playing) {
                        _timeoutId = global.setTimeout(this.continuePlay.bind(this), 0);
                    } else {
                        (this._remainingActions || []).forEach(m => {
                            m();
                        });
                    }

                    this.emit(CHANGE_EVENT);
                } else if (_playing && action.postData && !action.postData.step) {
                    _timeoutId = global.setTimeout(this.continuePlay.bind(this), 0);
                }
                break;
        }
        return true;
    }

    continuePlay() {
        var SongEditorStore = require("./songEditor.jsx");
        var MAX_DELAY = 9999999999999999;
        var anyDelay = MAX_DELAY;
        var delays = [];
        (this._remainingActions || []).forEach(m => {
            m();
        });
        this._remainingActions = [];

        var aobj = SongEditorStore.visualCursor().annotatedObj;
        if (aobj && aobj.endMarker) {
            "/local/visualCursor".POST({
                step: 1,
                skipThroughBars: true,
                loopThroughEnd: true
            });
        }

        for (var h = 0; h < SongEditorStore.cursorCount(); ++h) {
            if (!SongEditorStore.staves()[h].body) {
                continue;
            }
            var body = SongEditorStore.staves()[h].body;
            var visualCursor = SongEditorStore.visualCursor();
            var delay = 0;
            var bpm = 120;
            var timePerBeat = 60/bpm;
            var foundIdx = false;

            // XXX: assuming 4/4 for now 

            if (enabled) { 
                for (var i = 0; i < body.length; ++i) {
                    var obj = body[i];
                    foundIdx = foundIdx || (visualCursor.beat === obj.cursorData.beat &&
                            visualCursor.bar === obj.cursorData.bar);
                    if (foundIdx && (obj.pitch || obj.chord)) {
                        var beats = obj.getBeats();
                        (obj.pitch ? [obj.midiNote()] : obj.midiNote()).map(midiNote => {
                            var a = MIDI.noteOn(0, midiNote, 127, delay);
                            MIDI.noteOff(0, midiNote, delay + beats*timePerBeat);
                            if (MIDI.noteOn === MIDI.Flash.noteOn) {
                                this._remainingActions.push(() =>
                                    global.clearInterval(a));
                            } else {
                                this._remainingActions.push(() => a.stop());
                            }
                        });
                        delay += beats*timePerBeat;
                        delays.push(delay);
                    }
                }
            }
        }

        var delayMap = [];
        var lastIdx;
        delays.forEach((delay, idx) => {
            if (delayMap[delay]) {
                return;
            }
            delayMap[delay] = true;
            lastIdx = idx;

            var to = global.setTimeout(() => {
                if (!_playing) {
                    return;
                }
                if (idx === lastIdx) {
                    global.setTimeout(() => {
                        _playing = false;
                        this.emit(CHANGE_EVENT);
                    });
                }
                "/local/visualCursor".POST({
                    step: 1,
                    skipThroughBars: true
                });
            }, delay*1000 - 10);

            this._remainingActions.push(() => {
                window.clearTimeout(to);
            });
        });
    }

    /** 
     * @param {function} callback 
     */ 
    addChangeListener(callback) { 
        this.on(CHANGE_EVENT, callback); 
    }

    /** 
     * @param {function} callback 
     */ 
    removeChangeListener(callback) { 
        this.removeListener(CHANGE_EVENT, callback); 
    } 

    get playing() {
        return _playing;
    }

    get ready() {
        return _pianoLoaded;
    }
}

var _pianoLoaded;
var _playing;
var _timeoutId;

var hit = function(note, velocity, duration) {
    if (note instanceof Array) {
        note.map(n => hit(n, velocity, duration));
    } else {
        if (enabled) {
            MIDI.noteOn(0, note, velocity || 127, 0);
            MIDI.noteOff(0, note, duration || 0.5);
        }
    }
};

module.exports = new PlaybackStore();
module.exports.hit = hit;

window.PlaybackStore = module.exports;
