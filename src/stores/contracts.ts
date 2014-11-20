/**
 * @file Holds interfaces, enumerations, and utilities used throughout Ripieno.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, September 2014
 */

/// <reference path="../../references/diff.d.ts" />
/// <reference path="../../references/es6-promise.d.ts" />
/// <reference path="../../references/lodash.d.ts" />
/// <reference path="../../references/node.d.ts" />

import assert = require("assert");

import Model = require("./model");
import Annotator = require("./annotator");
import renderUtil = require("../util/renderUtil");

/**
 * Represents the client's policy for communicating changes with each other and saving them
 * to the server.
 */
export enum ApiRole {
    /**
     * All changes are cached until the client can reconnect to the relay.
     */
    Offline = 0,

    /**
     * In charged of accepting or rejecting changes from peers, PUTs official version to
     * the server.
     */
    Primary = 1,

    /**
     * Sends all requests to PRIMARY peer via the relay. Does not save.
     */
    Secondary = 2
}

/**
 * Used to hold current accidentals in a bar.
 * 
 * e.g., {"a": -2, "b": 1} means that "a" has a double flat and
 * b has sharp.
 */
export interface IAccidentals {
    [key: string]: number
}

/**
 * Used to generate Model.intersects.
 */
export interface IActiveIntersection {
    /**
     * A model that is in the time frame being considered.
     */
    obj: Model;

    /**
     * The beat when the Model should be removed.
     */
    expires: number;
}

export interface IAnnotationResult {
    cursor: IVisualCursor;
    operations: number;
    resetY: boolean;
    skip: boolean;
    success: boolean;
    patch: Array<string>;
}

/**
 * Options to pass to Context.annotate and related annotation functions.
 * 
 * @deprecated
 */
export interface IAnnotationOpts {
    cursor?: IVisualCursor;
    cursorBar?: number;
    cursorBeat?: number;
    cursorStave?: number;
    pointerData?: IPointerData;
    toolFn?: (obj: Model, ctx: Annotator.Context) => IterationStatus;
};

export enum Barline {
    Standard,
    Double
}

/**
 * The stupid enumeration is the way it because I didn't know how to make a type
 * that is either a number or variable.
 */
export enum BeamCount {
    Variable = -1,
    One = 1,
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9
}

export interface IBody extends Array<Model> {
}

/**
 * Standard clefs or sets of clefs.
 */
export enum Clef {
    Treble,
    Bass,
    Alto,
    Tenor,
    Piano,
    Choral,
    TrebleDrums,
}

/**
 * See Facebook's documentation on Flux Dispatchers.
 */
export interface IDispatcher {
    /**
     * Register a Store's callback so that it may be invoked by an action.
     * @param {function} callback The callback to be registered.
     * @return {number} The index of the callback within the _callbacks array.
     */
    register: (callback: (payload: any) => boolean) => void;
    unregister: (callback: (payload: any) => boolean) => void;

    /**
     * Dispatch a Flux-style event.
     * 
     * @param cb The callback should not be used for any logic that could potentially
     * take place in the stores. If a callback is specified, the request must
     * be a network request. The callback will be called regardless of whether
     * the event succeeded or not.
     */
    GET: (url: string, p?: any, cb?: () => void, nested?: boolean) => Promise<void>;
    DELETE: (url: string, p?: any, cb?: () => void, nested?: boolean) => Promise<void>;
    PATCH: (url: string, p?: any, cb?: () => void, nested?: boolean) => Promise<void>;
    PUT: (url: string, p?: any, cb?: () => void, nested?: boolean) => Promise<void>;
    POST: (url: string, p?: any, cb?: () => void, nested?: boolean) => Promise<void>;

    _events: string;
}

/**
 * An exception thrown during a dispatch event that states a different dispatch event
 * should be executed.
 */
export class DispatcherRedirect {
    constructor(verb: string, newUrl: string) {
        this.newUrl = newUrl;
        this.verb = verb;
    }

    newUrl: string;
    verb: string;
    postData: any;
}

/**
 * Any data structure that holds a duration, such as a chord or a rest.
 * A simple realization of IDuration can be constructed from C.makeDuration().
 * 
 * See also IPitch and IPitchDuration.
 */
export interface IDuration {
    /**
     * The base of the note, as encoded by Lilypond.
     * 
     * A quarter note is '4', a half note is '8', ...
     */
    count: number;

    /**
     * The number of displayed dots, or null.
     */
    dots: number;

    /**
     * The number of dots to be displayed, if different from dots.
     */
    displayDots?: number;

    /**
     * The tuplet to be displayed, if different from tuplet.
     */
    displayTuplet?: ITuplet;

    /**
     * Returns the number of beats in the duration, between 0 and the
     * number of beats in the timeSignature.
     * 
     * @param ctx with a valid timeSignature, for computing beats.
     * @param inheritedCount the count to use if duration's count is null.
     */
    getBeats?: (ctx: MetreContext, inheritedCount?: number) => number;

    hasFlagOrBeam?: boolean;

    temporary?: boolean;

    /**
     * The displayed tuplet, or null.
     */
    tuplet: ITuplet;
}

/**
 * Information needed to create a duration using C.makeDuration().
 * 
 * See IDuration and C.makeDuration().
 */
export interface IDurationSpec {
    /**
     * The base of the note, as encoded by Lilypond.
     * 
     * A quarter note is '4', a half note is '8', ...
     */
    count: number;

    /**
     * The number of displayed dots, or null.
     */
    dots?: number;

    /**
     * The displayed tuplet, or null.
     */
    tuplet?: ITuplet
}

/**
 * An error to report to the user. Handled in Router.
 */
export interface IError {
    /**
     * A human-readable explanation of what went wrong.
     */
    type: string;

    /**
     * An absolute URL (without the hostname) that explains the error.
     */
    redirectTo: string;
};

/**
 * A request to the Ripieno server and/or internal store.
 */
export interface IFluxAction {
    /**
     * The path and verb of the resource, such as "PUT /local/selection"
     */
    description: string;

    /**
     * The parsed JSON response from the server, if this is a server request.
     */
    response: any;

    /**
     * For requests like "PUT /foo/bar/_qui", "qui".
     */
    resource?: string;

    /**
     * For requests like "GET /api/v0/song?userId=blah&another=query",
     * "userId=blah&another=query"
     */
    query: string;

    /**
     * For PUT and POST requests, the non-stringified JSON postData.
     */
    postData: any;

    nested?: boolean;
};

/**
 * A header is a child of parts, and includes the title and other basic
 * information.
 */
export interface IHeader {
    composer: string;
    title: string;

    /**
     * True if the title should be rendered as a link, usually because
     * it is being hovered.
     */
    titleHovered?: boolean;

    /**
     * True if the composer should be rendered as a link, usually because
     * it is being hovered.
     */
    composerHovered?: boolean;

    /**
     * The height of the stave, in "em".
     */
    staveHeight?: number;

    /**
     * The physical (printout) size of the page.
     */
    pageSize?: IPageSize;

    /**
     * Margin settings and such.
     * 
     * See also pageSize.
     */
    paper?: Paper;
}

/**
 * An instrument that a piece can be in. See also instruments.ts.
 */
export interface IInstrument {
    /**
     * A human readable string representing the instrument.
     */
    name: string;

    /**
     * A name that fits within the buttons on the "Parts" tab
     */
    shortName: string;

    /**
     * A slug representing uniquely representing the soundfont used for the instrument.
     * The soundfont is available at /res/soundfonts/{instrument.res}-<mp3|ogg>.js.
     * 
     * Some instruments have the SAME soundfont.
     */
    soundfont: string;

    /**
     * The standard clef or clef set for an instrument.
     */
    clef: Clef;

    /**
     * The 0-indexed MIDI program for the instrument.
     */
    program: number;

    /**
     * In Lilypond, instruments are set like
     *      \set Staff.midiInstrument = #"glockenspiel"
     * Names are obtained from http://lilypond.org/doc/v2.17/Documentation/notation/midi-instruments
     */
    lilypond: string;
}

export class InvalidDurationError {
}

/**
 * Sorted in order from least change to most change.
 */
export enum IterationStatus {
    /**
     * No further annotation is necessary. The document is correct
     * and renderable.
     */
    ExitEarly,

    /**
     * All of the pre-conditions of the Model were met, and
     * the annotator should continue to the next item.
     */
    Success,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and an item has been inserted in place of the current
     * item.
     */
    RetryCurrent,

    /**
     * Like RETRY_CURRENT, but explicitly state that the entire
     * remainder of the document must be re-annotated.
     */
    RetryCurrentNoOptimizations,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and the entire beam must be re-annotated.
     * 
     * The Model must be in a beam for this return type to be used.
     */
    RetryBeam,

    /**
     * The precondition is now met, but a line was removed. The index has already
     * been set to the correct previous line.
     */
    LineRemoved,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and the entire line must be re-annotated.
     */
    RetryLine,

    /**
     * The precondition is now met, but a line was added somewhere between
     * where the previous line was an idx. The annotator should re-annotate
     * the previous two lines.
     */
    LineCreated,

    /**
     * The precondition is now met, but the previous line was modified. For example,
     * the visual cursor has been moved to the previous line.
     */
    RetryPreviousLine,

    /**
     * At least one of the preconditions of the Model were not
     * met and the entire document must be re-annotated.
     */
    RetryFromEntry
};

/**
 * A key signature, such as a KeySignatureModel.
 */
export interface IKeySignature {
    mode: string;
    pitch: IPitch;
}

export interface ILocation {
    /**
     * MSD of cursor position, counting from 1.
     */
    bar: number;

    /**
     * LSD of cursor position. Represents the beat directly before the
     * cursor, so if it's at the beginning of bar, it is beat 0.
     */
    beat: number;

    /**
     * True if the cursor is at the end of a bar. This information is added as
     * part of the annotation process, and is not guaranteed to exist until after
     * the annotation process.
     */
    endMarker?: boolean;
}

export class Location implements ILocation {
    eq(b: ILocation) {
        return this.bar === b.bar && this.beat === b.beat;
    }

    lt(b: ILocation) {
        return this.bar < b.bar || this.bar === b.bar && this.beat < b.beat;
    }

    le(b: ILocation) {
        return this.bar < b.bar || this.bar === b.bar && this.beat <= b.beat;
    }

    ge(b: ILocation) {
        return this.bar > b.bar || this.bar === b.bar && this.beat >= b.beat;
    }

    gt(b: ILocation) {
        return this.bar > b.bar || this.bar === b.bar && this.beat > b.beat;
    }

    constructor(opts: ILocation) {
        this.bar = opts.bar;
        this.beat = opts.beat;
        this.endMarker = opts.endMarker;
    }

    bar: number;
    beat: number;
    endMarker: boolean;
}

/**
 * The Lilypond name for a major key.
 */
export var MAJOR = "\\major";

/**
 * The Lilypond name for a minor key.
 */
export var MINOR = "\\minor";

export var MAX_NUM = 1000000000;

export interface INotation {
    glyph: string;
    noDirection: boolean;
    x: number;
    y: number;
    scale: number;
    style: any;
};

/**
 * Used for the metre annotation pass.
 */
export class MetreContext {
    endMarker: boolean = false;
    timeSignature: ITimeSignature = { beats: 4, beatType: 4 };
    bar: number = 1;
    beat: number = 0;
    defaultCount: number = 4;
    constructor(other?: MetreContext) {
        if (other) {
            this.timeSignature = {
                beats: other.timeSignature.beats,
                beatType: other.timeSignature.beatType
            };
            this.bar = other.bar;
            this.beat = other.beat;
            this.endMarker = other.endMarker || false;
            this.defaultCount = other.defaultCount || 4;
        }
    }
}

/**
 * Information about the current mouse position, such as from Renderer.
 */
export interface IMouse {
    /**
     * The location of the mouse relative to the left, in 'em's
     */
    x: number;

    /**
     * The location of the mouse relative to the top, in 'em's.
     */
    y: number;

    /**
     * A string identifying the currently selected object, if applicable.
     * This currently only works with the Molasses engine.
     * 
     * TODO: Let selectionInfo also work with the Victoria engine.
     */
    selectionInfo?: string;
    page: number;
};

/**
 * Represents the physical (printout) size of a page
 */
export interface IPageSize {
    /**
     * Height in `this.unit`
     */
    height: number;

    /**
     * Not all page sizes are valid Lilypond names. If this
     * is "null", the page size will be the default when opened with
     * Lilypond.
     * 
     * TODO: Fix this compatibility issue.
     */
    lilypondName: string;

    /**
     * The valid units are "in" and "mm".
     */
    unit: string;

    /**
     * With in `this.unit`
     */
    width: number;
};

/**
 * Properties that make up a part
 */
export interface IPart {
    //////////////////////////////////////////////
    // The following can be set if body is true //
    //////////////////////////////////////////////

    /**
     * The Models that compose the part.
     */
    body?: IBody;

    /**
     * For playback
     */
    instrument?: IInstrument;

    /**
     * Whether the next part is in the same system
     */
    pianoSystemContinues?: boolean;

    staveSeperation?: number;
};

/**
 * Margin settings and such. See also Paper.
 */
export class Paper {
    constructor(spec: {
        "left-margin": number;
        "right-margin": number;
        indent: number;
    }) {
        this["left-margin"] = spec["left-margin"];
        this["right-margin"] = spec["right-margin"];
        this.indent = spec.indent;

        // Comes from untyped jison.
        assert(!isNaN(this.indent));
        assert(!isNaN(this.leftMargin));
        assert(!isNaN(this.rightMargin));
    }

    /**
     * Left margin in mm (Lilypond's name)
     */
    "left-margin": number;

    /**
     * Left margin in mm.
     */
    get leftMargin() {
        return this["left-margin"];
    }
    set leftMargin(m: number) {
        this["left-margin"] = m;
    }

    /**
     * Left margin in mm (Lilypond's name)
     */
    "right-margin": number;

    /**
     * Right margin in mm.
     */
    get rightMargin() {
        return this["right-margin"];
    }
    set rightMargin(m: number) {
        this["right-margin"] = m;
    }

    indent: number;
}

/**
 * Represents zero or more concurrent pitches, such as a note, rest, or chord.
 * 
 * See also IDuration and IPitchDuration.
 */
export interface IPitch {
    acc: number;
    displayAcc?: number;
    isRest?: boolean; // read only
    /**
     * Note: In the case of a chord, the average line.
     */
    line?: number;
    octave: number;
    pitch: string;
    temporary?: boolean;
};

/**
 * Represents zero or more concurrent pitches with a duration.
 * 
 * DurationModels implement PitchDurations.
 */
export interface IPitchDuration extends IDuration {
    chord?: Array<IPitch>;
    isRest?: boolean;
    tie?: boolean;
    accToDelete?: number;
    isWholebar?: boolean;
};

export interface IPlaybackStore {
    addChangeListener: (callback: Function) => void;
    addLoadingListener: (callback: Function) => void;
    removeChangeListener: (callback: Function) => void;
    removeLoadingListener: (callback: Function) => void;

    ensureLoaded: (soundfont: string, avoidEvent?: boolean) => boolean;
    destructor: () => void;

    bpm: number;
    playing: boolean;
    ready: boolean;
    upToDate: boolean;
}

export enum PreviewMode {
    ExcludePreviews = 0,
    IncludePreviews = 1
}

export interface IPointerData {
    partIdx: number;
    visualIdx: number;
    obj: Model;
    musicLine: number;
    idx: number;
    line?: number;
    ctxData?: IVisualCursor;
};

export enum RectifyXPolicy {
    Invalid = 0,
    Max,
    Min
}

export var RectifyXPolicyFor: { [key: number]: RectifyXPolicy } = {};
RectifyXPolicyFor[Type.EndMarker] = RectifyXPolicy.Max;
RectifyXPolicyFor[Type.NewPage] = RectifyXPolicy.Max;
RectifyXPolicyFor[Type.NewLine] = RectifyXPolicy.Max;

RectifyXPolicyFor[Type.Begin] = RectifyXPolicy.Min;
RectifyXPolicyFor[Type.Clef] = RectifyXPolicy.Max;
RectifyXPolicyFor[Type.KeySignature] = RectifyXPolicy.Max;
RectifyXPolicyFor[Type.TimeSignature] = RectifyXPolicy.Max;

RectifyXPolicyFor[Type.Barline] = RectifyXPolicy.Max;

RectifyXPolicyFor[Type.Slur] = RectifyXPolicy.Max;
RectifyXPolicyFor[Type.BeamGroup] = RectifyXPolicy.Min;
RectifyXPolicyFor[Type.Wedge] = RectifyXPolicy.Min;

RectifyXPolicyFor[Type.Duration] = RectifyXPolicy.Min;

RectifyXPolicyFor[Type.Placeholder] = RectifyXPolicy.Invalid;

RectifyXPolicyFor[Type.Unknown] = RectifyXPolicy.Invalid;

/**
 * A session, directly from the server.
 * 
 * See also "session.d".
 */
export interface ISession {
    user: IUser;
    remoteSongsSynced: boolean;
    isLoading: boolean;
    /**
     * Either LoggedIn or LoggedOut
     */
    state: string;
    csrf: string;
};

export interface ISessionStore {
    addChangeListener: (callback: () => void) => void;
    removeChangeListener: (callback: () => void) => void;

    activeSong: ISong;
    apiRole: ApiRole;
    errors: Array<IError>;
    info: ISession;
    songs: Array<ISong>;
}

/**
 * A song, directly from the server.
 * 
 * See also "song.d".
 */
export interface ISong {
    /**
     * MongoDB ID for the song.
     */
    _id: string;

    /**
     * MongoDB ID for the IUser who created the song.
     */
    _owner: string;

    /**
     * Lylite source for the song.
     */
    src: string;

    /**
     * The title. This should always match the title at the top of the page.
     */
    title: string;

    /**
     * The composer. Should match the composer in the header.
     */
    composer: string;

    subtitle?: string;
    arranger?: string;
    lyricist?: string;
    copyright?: string;
    secret?: boolean;
    path?: string;
    clefs?: string;
};

export interface ISongEditor {
    addChangeListener: (callback: any) => void;
    addAnnotationListener: (callback: any) => void;
    addHistoryListener: (callback: any) => void;
    addMidiHintListener: (callback: (out: Array<number>) => void) => void;
    addClearHistoryListener: (callback: any) => void;
    removeChangeListener: (callback: any) => void;
    removeAnnotationListener: (callback: any) => void;
    removeHistoryListener: (callback: any) => void;
    removeMidiHintListener: (callback: (out: Array<number>) => void) => void;
    removeClearHistoryListener: (callback: any) => void;

    destructor: () => void;

    notationsSidebarVisible: boolean;

    autosaveModalVisible: boolean;
    changesPending: boolean;
    copyModalVisible: boolean;
    dirty: boolean;
    dragonAudio: Array<string>;
    exportModalVisible: boolean;
    finalCtx: Annotator.Context;
    getLineDirty: (idx: number, h: number) => void;
    ly: string;
    metadataModalVisible: boolean;
    midiOutHint: (out: Array<number>) => void;
    pageSize: IPageSize;
    paper: Paper;
    partModalStave: IPart;
    selection: Array<Model>;
    socialModalVisible: boolean;
    staveHeight: number;
    header: IHeader;
    parts: Array<IPart>;
    src: string;
    testly: string;
    tool: any;
    visualCursor: IVisualCursor;
    legacyAudioID: number;

    dangerouslyHidePreview: (action: IFluxAction) => void;
    dangerouslyMarkRenderDone: () => void;
    dangerouslyMarkRendererDirty: () => void;
    dangerouslyMarkRendererLineClean: (action: IFluxAction) => void;
    dangerouslyMarkRendererLineDirty: (line: number) => void;
    dangerouslySetVisualCursor: (visualCursor: IVisualCursor) => void;
    dangerouslyShowPreview: (action: IFluxAction) => void;
    dangerouslyTakeSnapshot: (ctx: Annotator.Context) => void;
    ensureSoundfontLoaded: (soundfont: string, avoidEvent?: boolean) => void;
};

/**
 * The original creator of an element. This is used as a HINT to Ripieno to decide whether
 * or not it is okay to modify the element.
 */
export enum Source {
    /**
     * The element was created directly from an action performed by the user. This does not
     * include annotations from such an action.
     */
    User = 0,

    /**
     * The element was created to satisfy the annotation engine.
     */
    Annotator,

    /**
     * The element was created from an action performed by the user, but may be split or joined
     * initially to satisfy a rhythmic spell-check. Becomes User after successful annotation.
     */
    UserProposed
}

/**
 * The subclass of a Model. Also doubles as a priority.
 */
export enum Type {
    EndMarker,
    NewPage,
    NewLine,

    Begin,
    Clef,
    KeySignature,
    TimeSignature,

    Barline,

    START_OF_MODIFIERS,
    Slur,
    BeamGroup,
    Wedge,
    END_OF_MODIFIERS,

    Duration,

    Placeholder,

    Unknown
};

/**
 * A time signature, such as a TimeSignatureModel.
 */
export interface ITimeSignature {
    /**
     * The numerator of a time signature.
     */
    beats: number;

    /**
     * The denominator of a time signature.
     */
    beatType: number;

    /**
     * True if the time signature should be rendered as "common"
     * e.g., as a "C" instead of "4/4".
     */
    commonRepresentation?: boolean;
};

/**
 * A user, directly from the server.
 */
export interface IUser {
    /**
     * Google ID
     */
    userId: string;

    /**
     * MongoDB id
     */
    _id: string;

    identity: {
        id: string;
        displayName: string;
    };

    whitelisted: boolean;
};

/**
 * Tuplet information, found in IDuration.
 * 
 * A triplet would have the following ITuplet:
 * {
 *     "num": 3,
 * 	   "den": 2
 * }
 */
export interface ITuplet {
    num: number;
    den: number;
}

export interface IViewComponent {
    (opts: { key: number; spec: Model; fontSize: number }): any;
}

/**
 * The solid blue line on the page is the VisualCursor.
 */
export interface IVisualCursor extends ILocation {
    /**
     * Object directly after the cursor. This information is added as part
     * of the annotation process, and is not guaranteed to exist until after
     * the annotation process.
     */
    annotatedObj?: Model;

    /**
     * The line, counting from 1, where annotatedObj is.
     */
    annotatedLine?: number;

    /**
     * The page, counting from 1, where annotatedObj is.
     */
    annotatedPage?: number;

    /**
     * The part, counting from 0, not counting parts without a body, where
     * annotatedObj is.
     */
    annotatedStave?: number;
};

/**
 * Creates a simple realization of an IDuration
 * 
 * @param spec
 */
export function makeDuration(spec: IDurationSpec): IDuration {
    "use strict";

    return {
        count: spec.count,
        dots: spec.dots || 0,
        tuplet: spec.tuplet || null,
        displayTuplet: null,
        getBeats(ctx: MetreContext, inheritedCount?: number): number {
            return require("./metre").getBeats(
                this.count || inheritedCount,
                this.dots, this.tuplet, ctx.timeSignature);
        }
    };
}

/**
 * Given a pitch, computes the midi note(s) (number of semitones where 60 is middle C).
 */
export function midiNote(p: IPitch) {
    "use strict";

    var base = require("./duration").chromaticScale[p.pitch] + 48;
    return base + (p.octave || 0)*12 + (p.acc || 0);
}

/**
 * Adds default stave height, page size, and paper size.
 * 
 * Used for document creation, importing, ...
 */
export function addDefaults(header: IHeader) {
    "use strict";
    if (!header.staveHeight) {
        header.staveHeight = renderUtil.defaultStaveHeight();
    }
    if (!header.pageSize) {
        header.pageSize = renderUtil.defaultPageSize();
    }
    if (!header.paper) {
        header.paper = new Paper({
            "left-margin": renderUtil.defaultMargins.left,
            "right-margin": renderUtil.defaultMargins.right,
            indent: renderUtil.defaultIndent
        });
    }
}

export var InvalidAccidental = 9001;

global.C = module.exports; // For debugging