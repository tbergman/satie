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
                    callback: () => {
                        console.log("LOADED MIDI");
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
                        global.clearTimeout(_timeoutId);
                    }

                    this.emit(CHANGE_EVENT);
                }
                break;
        }
        return true;
    }

    continuePlay() {
        var SongEditorStore = require("./songEditor.jsx");
        var MAX_DELAY = 9999999999999999;
        var anyDelay = MAX_DELAY;
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
                        delay = beats*timePerBeat;
                        (obj.pitch ? [obj.midiNote()] : obj.midiNote()).map(midiNote => {
                            MIDI.noteOn(0, midiNote, 127, 0);
                            MIDI.noteOff(0, midiNote, delay);
                        });
                        break;
                    }
                }
            }
            anyDelay = Math.min(delay, anyDelay);
        }

        if (anyDelay !== MAX_DELAY && anyDelay) {
            global.setTimeout(() => _playing && "/local/visualCursor".POST({
                step: 1,
                skipThroughBars: true
            }), anyDelay*1000 - 10);
            _timeoutId = global.setTimeout(this.continuePlay.bind(this), anyDelay*1000);
        } else {
            _playing = false;
            this.emit(CHANGE_EVENT);
        }
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
