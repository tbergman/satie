/**
 * Flux store for playback.
 */

var EventEmitter = require('events').EventEmitter; 
var _ = require("lodash");
var assert = require("assert");

var Dispatcher = require("./dispatcher.jsx"); 
var SessionStore = require("./session.jsx"); // must be registered before PlaybackStore!

var enabled = (typeof window !== "undefined");

var USING_LEGACY_AUDIO = !global.AudioContext && enabled;

var Audio5js;
var MIDI;
var _legacyAudioReady = false;
var audio5js;

if (enabled) {
    MIDI = require("midi/js/MIDI/Plugin.js");
    MIDI = _.extend(MIDI, {
        audioDetect: require("midi/js/MIDI/AudioDetect.js"),
        loadPlugin: require("midi/js/MIDI/LoadPlugin.js"),
        Player: require("midi/js/MIDI/Player.js")
    });
    global.MIDI = MIDI;
    if (USING_LEGACY_AUDIO) {
        Audio5js = require("audio5");
    }
}

var CHANGE_EVENT = 'change'; 

class PlaybackStore extends EventEmitter {
    constructor() {
        Dispatcher.register(this.handleAction.bind(this));

        _pianoLoaded = false;
        _playing = false;

        if (USING_LEGACY_AUDIO) {
            var store = this;
            _.defer(() => {
                global.audio5js = audio5js = new Audio5js({
                    swf_path: "/node_modules/audio5/swf/audio5js.swf",
                    throw_errors: true,
                    ready: function(player) {
                        this.on("canplay", function() {
                            _legacyAudioReady = true;
                            store.emit(CHANGE_EVENT);
                        });
                        if (this.pending) {
                            this.pending();
                        }
                    }
                });
            });
        }

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
            case "DELETE /local/song/show":
            case "PUT /local/song/show":
                this._play(false);
                break;
            case "POST /local/midiOut":
                if (_pianoLoaded) {
                    hit(action.postData);
                }
                break;
            case "POST /local/visualCursor":
                if (action.resource === "togglePlay") {
                    this._play(!_playing);

                    this.emit(CHANGE_EVENT);
                } else if (_playing && action.postData && !action.postData.step) {
                    _timeoutId = global.setTimeout(this.continuePlay.bind(this), 0);
                }
                break;
            case "POST /api/synth":
                _legacyAudioReady = false;
                this.emit(CHANGE_EVENT);
                break;
            case "POST /api/synth DONE":
                if (action.response.cb === "" + module.exports.latestID) {
                    var play = function() {
                        audio5js.load("/api/synth/mp3?tmpRef=" + action.response.tmpRef);
                    }
                    if (audio5js.ready) {
                        play();
                    } else {
                        audio5js.pending = play;
                    }
                }
                this.emit(CHANGE_EVENT);
                break;
        }
        return true;
    }

    _play(on) {
        _playing = on;
        if (_playing) {
            _timeoutId = global.setTimeout(this.continuePlay.bind(this), 0);
        } else {
            (this._remainingActions || []).forEach(m => {
                m();
            });
        }
    }

    continuePlay() {
        var SongEditorStore = require("./songEditor.jsx");
        var MAX_DELAY = 9999999999999999;
        var anyDelay = MAX_DELAY;
        var delays = [];
        _.each(this._remainingActions || [], m => {
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

        var seek = 0;
        var foundLegacyStart = false;
        var startTime = MIDI.Player.ctx.currentTime + 0.01;

        for (var h = 0; h < SongEditorStore.ctxCount(); ++h) {
            var body = SongEditorStore.staves()[h].body;
            if (!body) {
                continue;
            }
            var visualCursor = SongEditorStore.visualCursor();
            var delay = 0;
            var bpm = 120;
            var timePerBeat = 60/bpm;
            var foundIdx = false;

            // XXX: assuming 4/4 for now 

            if (enabled) { 
                for (var i = 0; i < body.length; ++i) {
                    var obj = body[i];
                    foundIdx = foundIdx || (visualCursor.beat === obj.ctxData.beat &&
                            visualCursor.bar === obj.ctxData.bar);
                    if (foundIdx && USING_LEGACY_AUDIO && !foundLegacyStart) {
                        audio5js.seek(seek);
                        audio5js.play();
                        foundLegacyStart = true;
                        this._remainingActions.push(() => {
                            audio5js.pause();
                        });
                    }
                    
                    if (foundIdx && (obj.pitch || obj.chord)) {
                        var beats = obj.getBeats();
                        if (!USING_LEGACY_AUDIO) {
                            _.each(obj.pitch ? [obj.midiNote()] : obj.midiNote(), midiNote => {
                                var a = MIDI.noteOn(0, midiNote, 127, startTime + delay);
                                MIDI.noteOff(0, midiNote, startTime + delay + beats*timePerBeat);
                                if (MIDI.noteOn === MIDI.Flash.noteOn) {
                                    this._remainingActions.push(() =>
                                        global.clearInterval(a));
                                } else {
                                    this._remainingActions.push(() => a.stop());
                                }
                            });
                        }
                        delay += beats*timePerBeat;
                        delays.push(delay);
                    }

                    if (obj.pitch || obj.chord) {
                        var beats = obj.getBeats();
                        seek += beats*timePerBeat;
                    }
                }
            }
        }

        var delayMap = {};
        var lastIdx;
        _.each(delays, (delay, idx) => {
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
                global.clearTimeout(to);
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
        return _pianoLoaded && (!USING_LEGACY_AUDIO || _legacyAudioReady);
    }
}

var _pianoLoaded;
var _playing;
var _timeoutId;

var hit = function(note, velocity, duration) {
    if (note instanceof Array) {
        _.map(note, n => hit(n, velocity, duration));
    } else {
        if (enabled) {
            MIDI.noteOn(0, note, velocity || 127, 0);
            MIDI.noteOff(0, note, duration || 0.5);
        }
    }
};

module.exports = new PlaybackStore();
module.exports.hit = hit;
module.exports.USING_LEGACY_AUDIO = USING_LEGACY_AUDIO;
module.exports.latestID = 0;

global.PlaybackStore = module.exports;
