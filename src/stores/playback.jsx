/**
 * Flux store for playback.
 */

var EventEmitter = require('events').EventEmitter; 
var _ = require("underscore");
var assert = require("assert");

var Dispatcher = require("./dispatcher.jsx"); 
var SessionStore = require("./session.jsx"); // must be registered before PlaybackStore!

var MIDI = require("midi/js/MIDI/Plugin.js");
MIDI = _(MIDI).extend({
    audioDetect: require("midi/js/MIDI/AudioDetect.js"),
    loadPlugin: require("midi/js/MIDI/LoadPlugin.js"),
    Player: require("midi/js/MIDI/Player.js")
});
window.MIDI = MIDI;

var CHANGE_EVENT = 'change'; 

class PlaybackStore extends EventEmitter {
    constructor() {
        Dispatcher.register(this.handleAction.bind(this));

        _pianoLoaded = false;
        _playing = false;

        MIDI.loadPlugin({
            soundfontUrl: "/res/soundfonts/",
            instrument: "acoustic_grand_piano",
            callback: () => {
                _pianoLoaded = true;
                MIDI.setVolume(0, 127);
                this.emit(CHANGE_EVENT);
            }
        });
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
                        console.log("ST");
                        _timeoutId = window.setTimeout(this.continuePlay.bind(this), 0);
                    } else {
                        window.clearTimeout(_timeoutId);
                    }

                    this.emit(CHANGE_EVENT);
                }
                break;
        }
        return true;
    }

    continuePlay() {
        var SongEditorStore = require("./songEditor.jsx");
        var body = SongEditorStore.staves()[3].body;
        var visualCursor = SongEditorStore.visualCursor();
        var delay = 0;
        var bpm = 120;
        var timePerBeat = 60/bpm;
        var foundIdx = false;

        // XXX: assuming 4/4 for now 

        for (var i = 0; i < body.length; ++i) {
            var obj = body[i];
            foundIdx = foundIdx || (visualCursor.annotatedObj === obj);
            if (foundIdx && obj.pitch || obj.chord) {
                var midiNote = obj.midiNote();
                var beats = obj.getBeats();
                delay = beats*timePerBeat;
                MIDI.noteOn(0, midiNote, 127, 0);
                MIDI.noteOff(0, midiNote, delay);
                break;
            }
        }

        if (delay) {
            window.setTimeout(() => _playing && "/local/visualCursor".POST({
                step: 1,
                skipThroughBars: true
            }), delay*1000 - 10);
            _timeoutId = window.setTimeout(this.continuePlay.bind(this), delay*1000);
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
        MIDI.noteOn(0, note, velocity || 127, 0);
        MIDI.noteOff(0, note, duration || 0.5);
    }
};

module.exports = new PlaybackStore();
