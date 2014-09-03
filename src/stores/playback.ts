/**
 * @file Flux store for playback.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import assert = require("assert");
import _ = require("lodash");
import TSEE = require("./tsee");

import Dispatcher = require("./dispatcher");
import C = require("./contracts");
import Instruments = require("./instruments");
import Model = require("./model");
require("./session"); // Must be registered before PlaybackStore!

var enabled = (typeof document !== "undefined");

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
export var LOAD_EVENT = "load";

export class PlaybackStore extends TSEE {
    constructor() {
        super();
        Dispatcher.Instance.register(this.handleAction.bind(this));

        _playing = false;

        if (USING_LEGACY_AUDIO) {
            var store = this;
            _.defer(() => {
                global.audio5js = audio5js = new Audio5js({
                    swf_path: "/node_modules/audio5/swf/audio5js.swf",
                    throw_errors: true,
                    ready: function (player: any) {
                        this.on("canplay", function () {
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
            _.defer(() => this._getPiano());
        }
    }

    handleAction(action: C.IFluxAction) {
        switch(action.description) {
            case "DELETE /local/song/show":
            case "PUT /local/song/show":
                this._play(false);
                break;
            case "POST /local/midiOut":
                if (!this._pendingInstruments) {
                    hit(action.postData);
                }
                break;
            case "POST /local/visualCursor":
                if (!this._pendingInstruments) {
                    if (action.resource === "togglePlay") {
                        this._play(!_playing);

                        this.emit(CHANGE_EVENT);
                    } else if (_playing && action.postData && !action.postData.step) {
                        _timeoutId = global.setTimeout(this.continuePlay.bind(this), 0);
                    }
                }
                break;
            case "POST /api/synth":
                _legacyAudioReady = false;
                this.emit(CHANGE_EVENT);
                break;
            case "POST /api/synth DONE":
                var url = "/api/synth/RipienoExport.mp3?tmpRef=" + action.response.tmpRef;
                if (action.response.forExport) {
                    window.location = <any> url;
                } else if (action.response.cb === "" + latestID) {
                    var play = function () {
                        audio5js.load(url);
                    };
                    if (audio5js.ready) {
                        play();
                    } else {
                        audio5js.pending = play;
                    }
                }
                this.emit(CHANGE_EVENT);
                break;

            case "PUT /local/bpm":
                this._bpm = parseInt(action.postData, 10);
                if (_playing) {
                    this._play(false);
                    this._play(true);
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

        var aobj = SongEditorStore.Instance.visualCursor.annotatedObj;
        if (aobj && aobj.endMarker) {
            Dispatcher.POST("/local/visualCursor", {
                step: 1,
                skipThroughBars: true,
                loopThroughEnd: true
            });
        }

        var seek = 0;
        var foundLegacyStart = false;
        var startTime = USING_LEGACY_AUDIO ? null : MIDI.Player.ctx.currentTime + 0.01;

        for (var h = 0; h < SongEditorStore.Instance.ctxCount; ++h) {
            var body: C.IBody = SongEditorStore.Instance.staves[h].body;
            if (!body) {
                continue;
            }
            var visualCursor = SongEditorStore.Instance.visualCursor;
            var delay = 0;
            var bpm = this.bpm;
            var timePerBeat = 60/bpm;
            var foundIdx = false;

            var soundfont = body.instrument.soundfont;
            var channel = this._soundfontToChannel[soundfont];
            assert(channel !== undefined);

            var ctx = new Context({
                stave: SongEditorStore.Instance.staves[h],
                staveIdx: h,
                staves: SongEditorStore.Instance.staves
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
                                var a = MIDI.noteOn(channel, midiNote, 127, startTime + delay);
                                assert(a);
                                MIDI.noteOff(channel, midiNote, startTime + delay + beats*timePerBeat);
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

    addLoadingListener(callback: Function) {
        this.on(LOAD_EVENT, callback);
    }

    /**
     * @param {function} callback
     */
    removeChangeListener(callback: Function) {
        this.removeListener(CHANGE_EVENT, callback);
    }

    removeLoadingListener(callback: Function) {
        this.removeListener(LOAD_EVENT, callback);
    }

    get playing() {
        return _playing;
    }

    get ready() {
        return !this._pendingInstruments && (!USING_LEGACY_AUDIO || _legacyAudioReady);
    }

    get bpm() {
        return this._bpm;
    }

    set bpm(n: number) {
        assert(false, "Use the dispatcher for this type of request");
    }

    ensureLoaded(soundfont: string, avoidEvent?: boolean): boolean {
        var isLoaded = this._loadedSoundfonts[soundfont];
        if (!isLoaded) {
            this._getInstrument(soundfont, avoidEvent);
        }
        return isLoaded;
    }

    private _getPiano() {
        this._getInstrument("acoustic_grand_piano", true);
    }

    private _getInstrument(soundfont: string, avoidEvent: boolean) {
        if (!enabled || USING_LEGACY_AUDIO && soundfont !== "acoustic_grand_piano") {
            return; // Sorry IE, you only get a piano.
        }

        if (this._loadedSoundfonts[soundfont] && typeof console !== "undefined") {
            console.warn("Already loaded", soundfont);
            return;
        }

        if (!avoidEvent) {
            this.emit(LOAD_EVENT);
        }

        if (_playing) {
            this._play(false);
        }

        ++this._pendingInstruments;
        this._loadedSoundfonts[soundfont] = true;
        MIDI.loadPlugin({
            soundfontUrl: "/res/soundfonts/",
            instrument: soundfont,
            soundManagerUrl: "/res/soundmanager2.js",
            soundManagerSwfUrl: "/res/soundManager2_swf/",
            callback: () => {
                this._soundfontToChannel[soundfont] = ++this._lastChannel;
                MIDI.programChange(this._lastChannel, Instruments.soundfontToProgram[soundfont]);
                if (!--this._pendingInstruments) {
                    MIDI.setVolume(0, 127);
                    this.emit(CHANGE_EVENT);
                }
            }
        });
        this.emit(CHANGE_EVENT);
    }

    private _remainingActions: Array<any> = [];
    private _loadedSoundfonts: { [sfName: string]: boolean } = {};
    private _soundfontToChannel: { [soundfontToChannel: string]: number } = {};
    private _pendingInstruments: number = 0;

    private _bpm: number = 120;
    private _lastChannel: number = -1;
}

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
