/**
 * Flux store for playback.
 */

import assert = require("assert");
import _ = require("lodash");
import TSEE = require("./tsee");

import Dispatcher = require("./dispatcher");
import C = require("./contracts");
import Model = require("./model");
require("./session"); // Must be registered before PlaybackStore!

var enabled = (typeof window !== "undefined");

if (!global.AudioContext && global.webkitAudioContext) {
    global.AudioContext = global.webkitAudioContext;
}

export var USING_LEGACY_AUDIO = !global.AudioContext && enabled;

var Audio5js: any;
var MIDI: any;
var _legacyAudioReady = false;
var audio5js: any;

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

export var CHANGE_EVENT = "change";

export class PlaybackStore extends TSEE {
    constructor() {
        super();
        Dispatcher.Instance.register(this.handleAction.bind(this));

        _pianoLoaded = false;
        _playing = false;

        if (USING_LEGACY_AUDIO) {
            var store = this;
            _.defer(() => {
                global.audio5js = audio5js = new Audio5js({
                    swf_path: "/node_modules/audio5/swf/audio5js.swf",
                    throw_errors: true,
                    ready: function(player: any) {
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
                    soundManagerSwfUrl: "/res/soundManager2_swf/",
                    callback: () => {
                        // console.log("LOADED MIDI", MIDI.api);
                        _pianoLoaded = true;
                        MIDI.setVolume(0, 127);
                        this.emit(CHANGE_EVENT);
                    }
                });
            });
        }
    }

    handleAction(action: C.IFluxAction) {
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
                if (action.response.cb === "" + latestID) {
                    var play = function () {
                        audio5js.load("/api/synth/mp3?tmpRef=" + action.response.tmpRef);
                    };
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

    _play(on: boolean) {
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
        var SongEditorStore = require("./songEditor");
        var Context = require("./context"); // Recursive.
        var beats: number;
        var delays: Array<number> = [];
        _.each(this._remainingActions || [], m => {
            m();
        });
        this._remainingActions = [];

        var aobj = SongEditorStore.Instance.visualCursor().annotatedObj;
        if (aobj && aobj.endMarker) {
            Dispatcher.POST("/local/visualCursor", {
                step: 1,
                skipThroughBars: true,
                loopThroughEnd: true
            });
        }

        var seek = 0;
        var foundLegacyStart = false;
        var startTime = MIDI.Player.ctx.currentTime + 0.01;

        for (var h = 0; h < SongEditorStore.Instance.ctxCount(); ++h) {
            var body = SongEditorStore.Instance.staves()[h].body;
            if (!body) {
                continue;
            }
            var visualCursor = SongEditorStore.Instance.visualCursor();
            var delay = 0;
            var bpm = 120;
            var timePerBeat = 60/bpm;
            var foundIdx = false;

            // XXX: assuming 4/4 for now

            var ctx = new Context({
                stave: SongEditorStore.Instance.staves()[h],
                staveIdx: h,
                staves: SongEditorStore.Instance.staves()
            });

            if (enabled) {
                for (var i = 0; i < body.length; ++i) {
                    var obj: Model = body[i];
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

                    if (obj.type === C.Type.TIME_SIGNATURE) {
                        ctx.timeSignature = obj.timeSignature;
                    }

                    if (foundIdx && obj.isNote) {
                        beats = obj.note.getBeats(ctx);
                        if (!USING_LEGACY_AUDIO && !obj.isRest) {
                            _.each(obj.note.pitch ? [C.midiNote(obj.note)] :
                                    C.midiNote(obj.note), midiNote => {
                                var a = MIDI.noteOn(0, midiNote, 127, startTime + delay);
                                assert(a);
                                MIDI.noteOff(0, midiNote, startTime + delay + beats*timePerBeat);
                                if (MIDI.noteOn === MIDI.Flash.noteOn) {
                                    this._remainingActions.push(() =>
                                        global.clearInterval(a));
                                } else {
                                    this._remainingActions.push(function () {
                                        a.stop();
                                    });
                                }
                            });
                        }
                        delay += beats*timePerBeat;
                        delays.push(delay);
                    }

                    if (obj.isNote) {
                        beats = obj.note.getBeats(ctx);
                        seek += beats*timePerBeat;
                    }
                }
            }
        }

        var delayMap: { [key: number]: boolean } = {};
        var lastIdx: number;
        _.each(delays, (delay: number, idx: number) => {
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
                Dispatcher.POST("/local/visualCursor", {
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
    addChangeListener(callback: Function) {
        this.on(CHANGE_EVENT, callback);
    }

    /**
     * @param {function} callback
     */
    removeChangeListener(callback: Function) {
        this.removeListener(CHANGE_EVENT, callback);
    }

    playing() {
        return _playing;
    }

    ready() {
        return _pianoLoaded && (!USING_LEGACY_AUDIO || _legacyAudioReady);
    }

    _remainingActions: Array<any> = [];
}

var _pianoLoaded: boolean;
var _playing: boolean;
var _timeoutId: number;

export function hit(note: any, velocity?: number, duration?: any) {
    "use strict";

    if (note instanceof Array) {
        _.map(note, n => hit(n, velocity, duration));
    } else {
        if (enabled) {
            MIDI.noteOn(0, note, velocity || 127, 0);
            MIDI.noteOff(0, note, duration || 0.5);
        }
    }
};

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require TSEE since we extend it. This line forces the require()
// line to not be optimized out.
TSEE.length;
/* tslint:enable */

export var Instance = new PlaybackStore();
export var latestID = 0;
global.PlaybackStore = Instance;
