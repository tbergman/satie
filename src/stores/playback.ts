/**
 * @file Flux store for playback.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import assert                   = require("assert");
import _                		= require("lodash");
import TSEE             		= require("./tsee");

import AnnotatorType    		= require("./annotator");       // Cyclic
import C                		= require("./contracts");
import Instruments      		= require("./instruments");
import Metre            		= require("./metre");
import Model 		   	        = require("./model");

var enabled                     = typeof document !== "undefined";
var usingLegacyAudio    		= !global.AudioContext && enabled;

var Audio5js:   any     		= enabled && usingLegacyAudio && require("audio5");
var MIDI:       any     		= enabled && _.extend(require("midi/js/MIDI/Plugin.js"), {
                        		    audioDetect: require("midi/js/MIDI/AudioDetect.js"),
                        		    loadPlugin: require("midi/js/MIDI/LoadPlugin.js"),
                        		    Player: require("midi/js/MIDI/Player.js")
                        		});

global.AudioContext             = global.AudioContext || global.webkitAudioContext;
global.MIDI                     = MIDI;

enum EventType {
    Change,
    Load
}

class PlaybackStore extends TSEE implements C.IPlaybackStore, C.IApi {
    constructor(dispatcher: C.IDispatcher, songEditor?: C.ISongEditor) {
        super();
        this._dispatcher = dispatcher;
        dispatcher.register(this._handleAction);

        this._songEditor = songEditor;
        this._playing = false;

        if (songEditor) {
            songEditor.ensureSoundfontLoaded = this.ensureLoaded.bind(this);
            songEditor.addListener(C.EventType.MidiOut, hit);
        }

        if (PlaybackStore.usingLegacyAudio) {
            var store = this;
            _.defer(() => {
                global.audio5js = audio5js = new Audio5js({
                    swf_path: "/node_modules/audio5/swf/audio5js.swf",
                    throw_errors: true,
                    ready: function (player: any) {
                        this.on("canplay", function () {
                            _legacyAudioReady = true;
                            store.emit(EventType.Change);
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
            this._songEditor.removeListener(C.EventType.MidiOut, hit);
        }
    }

    ///////////////////
    // SUBSCRIPTIONS // 
    ///////////////////

    addChangeListener(callback: Function) {
        this.on(EventType.Change, callback); }

    addLoadingListener(callback: Function) {
        this.on(EventType.Load, callback); }

    removeChangeListener(callback: Function) {
        this.removeListener(EventType.Change, callback); }

    removeLoadingListener(callback: Function) {
        this.removeListener(EventType.Load, callback); }

    /////////////////////////////////
    // PROPERTIES AND DERIVED DATA // 
    /////////////////////////////////

    get bpm(): number {
        return this._bpm; }

    get playing(): boolean {
        return this._playing; }

    get ready(): boolean {
        return !this._pendingInstruments && (!PlaybackStore.usingLegacyAudio || _legacyAudioReady); }

    //////////////////
    // FLUX METHODS // 
    //////////////////

    "POST /api/v0/synth"(action: C.IServerAction<void, void>) {
        _legacyAudioReady = false;
        this.emit(EventType.Change);
    }
    "POST /api/v0/synth DONE"(action: C.IServerAction<void, C.ISynthCallback>) {
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
        this.emit(EventType.Change);
    }

    "PUT /webapp/bpm"(action: C.IServerAction<number, void>) {
        assert(!isNaN(action.postData));

        this._bpm = action.postData;
        if (this._playing) {
            this._play(false);
            this._play(true);
        }
        this.emit(EventType.Change);
    }

    "POST /webapp/midiOut"(action: C.IServerAction<any, void>) { // IServerAction<number | number[]>
        if (!this._pendingInstruments) {
            hit(action.postData);
        }
    }

    "PUT /webapp/song/show"(action: C.IServerAction<void, void>) {
        // Stops the current playback stream when a new song will be shown.
        this._play(false);
    }
    "DELETE /webapp/song/show" = this["PUT /webapp/song/show"].bind(this);

    "PUT /webapp/visualCursor"(action: C.IServerAction<C.IVisualCursor, void>) {
        if (!this._pendingInstruments && this._playing && action.postData) {
            this._timeoutId = global.setTimeout(this._continuePlay.bind(this), 0);
        }
    }

    "PUT /webapp/visualCursor/togglePlay"(action: C.IServerAction<void, void>) {
        this._play(!this._playing);
        this.emit(EventType.Change);
    }

    static latestID: number = 0;
    static usingLegacyAudio = usingLegacyAudio;

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
            this._dispatcher.PUT("/webapp/visualCursor/step", {
                step: 1,
                skipDurationlessContent: true,
                loopThroughEnd: true
            });
        }

        var seek = 0;
        var foundLegacyStart = false;
        var startTime = PlaybackStore.usingLegacyAudio ? null : MIDI.Player.ctx.currentTime + 0.01;

        for (var h = 0; h < this._songEditor.parts.length; ++h) {
            var body: Model[] = this._songEditor.parts[h].body;
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
                    if (foundIdx && PlaybackStore.usingLegacyAudio && !foundLegacyStart) {
                        audio5js.seek(seek);
                        audio5js.play();
                        foundLegacyStart = true;
                        this._remainingActions.push(() => {
                            audio5js.pause();
                        });
                    }

                    switch (obj.type) {
                        case C.Type.Attributes:
                            ctx.attributes = obj;
                            break;
                        case C.Type.TimeSignature:
                            ctx.attributes.time = <any> obj;
                            break;
                    }

                    if (foundIdx && obj.isNote) {
                        beats = Metre.calcBeats2(obj.note, ctx);
                        if (!PlaybackStore.usingLegacyAudio && !obj.isRest) {
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
                        beats = Metre.calcBeats2(obj.note, ctx);
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
                        this.emit(EventType.Change);
                    });
                }
                _.defer(() => {
                    this._dispatcher.PUT("/webapp/visualCursor/step", {
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
        if (!enabled || PlaybackStore.usingLegacyAudio && soundfont !== "acoustic_grand_piano") {
            return; // Sorry IE, you only get a piano.
        }

        if (this._loadedSoundfonts[soundfont] && typeof console !== "undefined") {
            console.warn("Already loaded", soundfont);
            return;
        }

        if (!avoidEvent) {
            this.emit(EventType.Load);
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
                    this.emit(EventType.Change);
                }
            }
        });
        if (!avoidEvent) {
            this.emit(EventType.Change);
        }
    }

    private _getPiano() {
        this._getInstrument("acoustic_grand_piano", true);
    }

    private _handleAction = (action: C.IServerAction<any, any>) => {
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
        return !usingLegacyAudio || this._songEditor.legacyAudioID === PlaybackStore.latestID;
    }

    private _bpm: number                                                    = 120;
    private _dispatcher: C.IDispatcher;
    private _lastChannel: number                                			= -1;
    private _loadedSoundfonts: { [sfName: string]: boolean }    			= {};
    private _pendingInstruments: number                         			= 0;
    private _playing: boolean;
    private _remainingActions: Array<any>                       			= [];
    private _songEditor: C.ISongEditor;
    private _soundfontToChannel: { [soundfontToChannel: string]: number }   = {};
    private _timeoutId: number;
}

function hit(note: number[], velocity?: number, duration?: any): void;
function hit(note: number,   velocity?: number, duration?: any): void;

function hit(note: any, velocity?: number, duration?: any) {
    "use strict";

    if (note instanceof Array) {
        _.map(note, (n: number) => hit(n, velocity, duration));
    } else {
        if (enabled) {
            MIDI.noteOn(0, note, velocity || 127, 0);
            MIDI.noteOff(0, note, duration || 0.5);
        }
    }
};

var _legacyAudioReady   = false;
var audio5js: any       = null;

export = PlaybackStore;
