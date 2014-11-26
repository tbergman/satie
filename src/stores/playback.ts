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

import AnnotatorType = require("./annotator"); // Cyclic dependency. For types only.
import C = require("./contracts");
import Instruments = require("./instruments");
import Model = require("./model");

var enabled = (typeof document !== "undefined");
var USING_LEGACY_AUDIO = !global.AudioContext && enabled;

if (!global.AudioContext && global.webkitAudioContext) {
    global.AudioContext = global.webkitAudioContext;
}

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

var CHANGE_EVENT = "change";
var LOAD_EVENT = "load";

class PlaybackStore extends TSEE implements C.IPlaybackStore {
    constructor(dispatcher: C.IDispatcher, songEditor?: C.ISongEditor) {
        super();
        this._dispatcher = dispatcher;
        dispatcher.register(this._handleAction);

        this._songEditor = songEditor;
        this._playing = false;

        if (songEditor) {
            songEditor.ensureSoundfontLoaded = this.ensureLoaded.bind(this);
            songEditor.addMidiOutHintListener(hit);
        }

        if (PlaybackStore.USING_LEGACY_AUDIO) {
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

    destructor() {
        this._play(false);
        this._dispatcher.unregister(this._handleAction);
        if (this._songEditor) {
            this._songEditor.removeMidiOutHintListener(hit);
        }
    }

    ///////////////////
    // SUBSCRIPTIONS // 
    ///////////////////

    addChangeListener(callback: Function) {
        this.on(CHANGE_EVENT, callback); }

    addLoadingListener(callback: Function) {
        this.on(LOAD_EVENT, callback); }

    removeChangeListener(callback: Function) {
        this.removeListener(CHANGE_EVENT, callback); }

    removeLoadingListener(callback: Function) {
        this.removeListener(LOAD_EVENT, callback); }

    /////////////////////////////////
    // PROPERTIES AND DERIVED DATA // 
    /////////////////////////////////

    get bpm(): number {
        return this._bpm; }

    get playing(): boolean {
        return this._playing; }

    get ready(): boolean {
        return !this._pendingInstruments && (!PlaybackStore.USING_LEGACY_AUDIO || _legacyAudioReady); }

    //////////////////
    // FLUX METHODS // 
    //////////////////

    "POST /api/v0/synth"(action: C.IFluxAction) {
        _legacyAudioReady = false;
        this.emit(CHANGE_EVENT);
    }
    "POST /api/v0/synth DONE"(action: C.IFluxAction) {
        var url = "/api/v0/synth/RipienoExport.mp3?tmpRef=" + action.response.tmpRef;
        if (action.response.forExport) {
            window.location = <any> url;
        } else if (action.response.cb === "" + PlaybackStore.latestID) {
            _legacyAudioReady = false;
            var play = function () {
                audio5js.load(url);
            };
            if (audio5js.ready) {
                play();
            } else {
                audio5js.pending = play;
            }
            this._songEditor.legacyAudioID = PlaybackStore.latestID;
        }
        this.emit(CHANGE_EVENT);
    }

    "PUT /local/bpm"(action: C.IFluxAction) {
        this._bpm = parseInt(action.postData, 10);
        if (this._playing) {
            this._play(false);
            this._play(true);
        }
        this.emit(CHANGE_EVENT);
    }

    "POST /local/midiOut"(action: C.IFluxAction) {
        if (!this._pendingInstruments) {
            hit(action.postData);
        }
    }

    "PUT /local/song/show"(action: C.IFluxAction) {
        this._play(false);
    }
    "DELETE /local/song/show" = this["PUT /local/song/show"].bind(this);
    "PUT /local/visualCursor"(action: C.IFluxAction) {
        if (!this._pendingInstruments) {
            if (action.resource === "togglePlay") {
                this._play(!this._playing);

                this.emit(CHANGE_EVENT);
            } else if (this._playing && action.postData && !action.postData.step) {
                this._timeoutId = global.setTimeout(this._continuePlay.bind(this), 0);
            }
        }
    }

    static latestID: number = 0;
    static USING_LEGACY_AUDIO = USING_LEGACY_AUDIO;

    private _continuePlay() {
        var Annotator: typeof AnnotatorType = require("./annotator");
        var beats: number;
        var delays: Array<number> = [];
        _.each(this._remainingActions || [], m => {
            m();
        });
        this._remainingActions = [];

        var aobj = this._songEditor.visualCursor.annotatedObj;
        if (aobj && aobj.endMarker) {
            this._dispatcher.PUT("/local/visualCursor", {
                step: 1,
                skipDurationlessContent: true,
                loopThroughEnd: true
            });
        }

        var seek = 0;
        var foundLegacyStart = false;
        var startTime = PlaybackStore.USING_LEGACY_AUDIO ? null : MIDI.Player.ctx.currentTime + 0.01;

        for (var h = 0; h < this._songEditor.parts.length; ++h) {
            var body: C.IBody = this._songEditor.parts[h].body;
            if (!body) {
                continue;
            }
            var visualCursor = this._songEditor.visualCursor;
            var delay = 0;
            var bpm = this.bpm;
            var timePerBeat = 60/bpm;
            var foundIdx = false;

            var soundfont = this._songEditor.parts[h].instrument.soundfont;
            var channel = this._soundfontToChannel[soundfont];
            assert(channel !== undefined);

            var ctx = new Annotator.Context(this._songEditor.parts, null, this._songEditor, Annotator.AssertionPolicy.NoAssertions);

            if (enabled) {
                for (var i = 0; i < body.length; ++i) {
                    var obj: Model = body[i];
                    foundIdx = foundIdx || (visualCursor.beat === obj.ctxData.beat &&
                            visualCursor.bar === obj.ctxData.bar);
                    if (foundIdx && PlaybackStore.USING_LEGACY_AUDIO && !foundLegacyStart) {
                        audio5js.seek(seek);
                        audio5js.play();
                        foundLegacyStart = true;
                        this._remainingActions.push(() => {
                            audio5js.pause();
                        });
                    }

                    if (obj.type === C.Type.TimeSignature) {
                        ctx.timeSignature = obj.timeSignature;
                    }

                    if (foundIdx && obj.isNote) {
                        beats = obj.note.getBeats(ctx);
                        if (!PlaybackStore.USING_LEGACY_AUDIO && !obj.isRest) {
                            _.each(obj.note.chord.map(C.NoteUtil.pitchToMidiNumber), midiNote => {
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
                if (!this._playing) {
                    return;
                }
                if (idx === lastIdx) {
                    global.setTimeout(() => {
                        this._playing = false;
                        this.emit(CHANGE_EVENT);
                    });
                }
                _.defer(() => {
                    this._dispatcher.PUT("/local/visualCursor", {
                        step: 1,
                        skipDurationlessContent: true,
                        loopThroughEnd: true
                    });
                });
            }, delay*1000 - 10);

            this._remainingActions.push(() => {
                global.clearTimeout(to);
            });
        });
    }

    ensureLoaded(soundfont: string, avoidEvent?: boolean): boolean {
        var isLoaded = this._loadedSoundfonts[soundfont];
        if (!isLoaded) {
            this._getInstrument(soundfont, avoidEvent);
        }
        return isLoaded;
    }

    private _getInstrument(soundfont: string, avoidEvent: boolean) {
        if (!enabled || PlaybackStore.USING_LEGACY_AUDIO && soundfont !== "acoustic_grand_piano") {
            return; // Sorry IE, you only get a piano.
        }

        if (this._loadedSoundfonts[soundfont] && typeof console !== "undefined") {
            console.warn("Already loaded", soundfont);
            return;
        }

        if (!avoidEvent) {
            this.emit(LOAD_EVENT);
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
            callback: () => {
                this._soundfontToChannel[soundfont] = ++this._lastChannel;
                MIDI.programChange(this._lastChannel, Instruments.soundfontToProgram[soundfont]);
                if (!--this._pendingInstruments) {
                    MIDI.setVolume(0, 127);
                    this.emit(CHANGE_EVENT);
                }
            }
        });
        if (!avoidEvent) {
            this.emit(CHANGE_EVENT);
        }
    }

    private _getPiano() {
        this._getInstrument("acoustic_grand_piano", true);
    }

    private _handleAction = (action: C.IFluxAction) => {
        assert(action.description.indexOf(" ") !== -1, "Malformed description " + action.description);
        var fn: Function = (<any>this)[action.description];
        if (fn) {
            fn.call(this, action);
        }
        return true; // (Success)
    };

    private _play(on: boolean) {
        this._playing = on;
        if (this._playing) {
            if (!this.upToDate) {
                if (isNaN(this._songEditor.legacyAudioID)) {
                    return;
                }
                this._songEditor.legacyAudioID = NaN;
                _.defer(() => {
                    this._playing = false;
                    this._dispatcher.POST("/api/v0/synth",
                        {
                            data: this._songEditor.dragonAudio,
                            cb: "" + ++PlaybackStore.latestID,
                            forExport: false
                        });
                });
            } else {
                this._timeoutId = global.setTimeout(this._continuePlay.bind(this), 0);
            }
        } else {
            (this._remainingActions || []).forEach(m => {
                m();
            });
        }
    }

    /**
     * For legacy audio.
     */
    get upToDate() {
        return !USING_LEGACY_AUDIO || this._songEditor.legacyAudioID === PlaybackStore.latestID;
    }

    private _bpm: number = 120;
    private _dispatcher: C.IDispatcher;
    private _lastChannel: number = -1;
    private _loadedSoundfonts: { [sfName: string]: boolean } = {};
    private _pendingInstruments: number = 0;
    private _playing: boolean;
    private _remainingActions: Array<any> = [];
    private _songEditor: C.ISongEditor;
    private _soundfontToChannel: { [soundfontToChannel: string]: number } = {};
    private _timeoutId: number;
}

function hit(note: any, velocity?: number, duration?: any) {
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

export = PlaybackStore;
