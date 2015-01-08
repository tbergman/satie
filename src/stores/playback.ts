/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

/**
 * Controls MIDI and audio playback.
 */
class PlaybackStore extends TSEE implements C.IPlaybackStore, C.IApi {
    constructor(dispatcher: C.IDispatcher, score?: C.IScoreStore) {
        super();
        this._dispatcher = dispatcher;
        dispatcher.register(this._handleAction);

        this._score = score;
        this._playing = false;

        if (score) {
            score.ensureSoundfontLoaded = this.ensureLoaded.bind(this);
            score.addListener(C.EventType.MidiOut, hit);
        }

        if (enabled) {
            _.defer(() => this._getPiano());
        }
    }

    destructor() {
        this._play(false);
        this._dispatcher.unregister(this._handleAction);
        if (this._score) {
            this._score.removeListener(C.EventType.MidiOut, hit);
        }
    }

    /*---- Subscriptions ------------------------------------------------------------------------*/

    addChangeListener(callback: Function) {
        this.on(EventType.Change, callback); }

    addLoadingListener(callback: Function) {
        this.on(EventType.Load, callback); }

    removeChangeListener(callback: Function) {
        this.removeListener(EventType.Change, callback); }

    removeLoadingListener(callback: Function) {
        this.removeListener(EventType.Load, callback); }

    /*---- Properties and Derived Data ----------------------------------------------------------*/

    get bpm(): number {
        return this._bpm; }

    get playing(): boolean {
        return this._playing; }

    get ready(): boolean {
        return !this._pendingInstruments; }

    /*---- Store Methods ------------------------------------------------------------------------*/

    "PUT /webapp/bpm"(action: C.IFluxAction<number>) {
        assert(!isNaN(action.postData));

        this._bpm = action.postData;
        if (this._playing) {
            this._play(false);
            this._play(true);
        }
        this.emit(EventType.Change);
    }

    "POST /webapp/midiOut"(action: C.IFluxAction<any>) { // IFluxAction<number | number[]>
        if (!this._pendingInstruments) {
            hit(action.postData);
        }
    }

    "PUT /webapp/song/show"(action: C.IFluxAction<void>) {
        // Stops the current playback stream when a new song will be shown.
        this._play(false);
    }
    "DELETE /webapp/song/show" = this["PUT /webapp/song/show"].bind(this);

    "PUT /webapp/visualCursor"(action: C.IFluxAction<C.IVisualCursor>) {
        if (!this._pendingInstruments && this._playing && action.postData) {
            this._timeoutId = global.setTimeout(this._continuePlay.bind(this), 0);
        }
    }

    "PUT /webapp/visualCursor/togglePlay"(action: C.IFluxAction<void>) {
        this._play(!this._playing);
        this.emit(EventType.Change);
    }

    static latestID: number = 0;

    private _continuePlay() {
        var Annotator: typeof AnnotatorType = require("./annotator");
        var divisions: number;
        var delays: Array<number> = [];
        _.each(this._remainingActions || [], m => {
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
            var body: Model[] = this._score.voices[h].body;
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

            var ctx = new Annotator.Context(this._score.voices, null, this._score, Annotator.AssertionPolicy.NoAssertions);

            if (enabled) {
                for (var i = 0; i < body.length; ++i) {
                    var obj: Model = body[i];
                    foundIdx = foundIdx || (visualCursor.division === obj.ctxData.division &&
                            visualCursor.bar === obj.ctxData.bar);

                    switch (obj.type) {
                        case C.Type.Attributes:
                            ctx.attributes = obj;
                            break;
                        case C.Type.TimeSignature:
                            ctx.attributes.time = <any> obj;
                            break;
                    }

                    if (foundIdx && obj.isNote) {
                        var timePerDivision = 60/bpm/ctx.attributes.divisions;
                        divisions = Metre.calcDivisions2(obj.note, ctx);
                        if (!obj.isRest) {
                            _.each(obj.note.chord.map(C.NoteUtil.pitchToMidiNumber), midiNote => {
                                var a = MIDI.noteOn(channel, midiNote, 127, startTime + delay);
                                assert(a);
                                MIDI.noteOff(channel, midiNote, startTime + delay + divisions*ctx.attributes.divisions*timePerDivision);
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
                        delay += divisions*ctx.attributes.divisions*timePerDivision;
                        delays.push(delay);
                    }

                    if (obj.isNote) {
                        divisions = Metre.calcDivisions2(obj.note, ctx);
                        seek += divisions*timePerDivision;
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
        if (!enabled) {
            return;
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

    private _handleAction = (action: C.IFluxAction<any>) => {
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
            this._timeoutId = global.setTimeout(this._continuePlay.bind(this), 0);
        } else {
            (this._remainingActions || []).forEach(m => {
                m();
            });
        }
    }

    private _bpm: number                                                    = 120;
    private _dispatcher: C.IDispatcher;
    private _lastChannel: number                                			= -1;
    private _loadedSoundfonts: { [sfName: string]: boolean }    			= {};
    private _pendingInstruments: number                         			= 0;
    private _playing: boolean;
    private _remainingActions: Array<any>                       			= [];
    private _score: C.IScoreStore;
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

export = PlaybackStore;
