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

import        assert     = require("assert");
var           assign     = require("react/lib/Object.assign");
import        _          = require("lodash");

import        Annotator  = require("./annotator");
import        Model      = require("./model");

export import MusicXML   = require("./musicxml");
export import SMuFL      = require("../util/SMuFL");
export import renderUtil = require("../util/renderUtil");
export import strHash    = require("../util/hash");

/** 
 * Represents the client's policy for communicating changes with each other and saving them
 * to the server.
 */
export enum ApiRole {
    /** 
     * All changes are cached until the client can reconnect to the relay.
     */
    Offline             = 0,

    /** 
     * In charged of accepting or rejecting changes from peers, PUTs official version to
     * the server.
     */
    Primary             = 1,

    /** 
     * Sends all requests to PRIMARY peer via the relay. Does not save.
     */
    Secondary           = 2
}

/** 
 * Used to hold current accidentals in a bar.
 * 
 * e.g., {"a": -2, "b": 1} means that "a" has a double flat and
 * b has sharp.
 */
export interface IAccidentals {
    [key: string]:      number
}

export interface IAnnotationResult {
    cursor:             IVisualCursor;
    operations:         number;
    resetY:             boolean;
    skip:               boolean;
    success:            boolean;
    patch:              string[];
}

/** 
 * Options to pass to Context.annotate and related annotation functions.
 * 
 * @deprecated
 */
export interface IAnnotationOpts {
    cursor?:            IVisualCursor;
    cursorBar?:         number;
    cursorBeat?:        number;
    cursorStave?:       number;
    pointerData?:       IPointerData;
    toolFn?:            (obj: Model, ctx: Annotator.Context) => IterationStatus;
};

/** 
 * The stupid enumeration is the way it because I didn't know how to make a type
 * that is either a number or variable.
 */
export enum BeamCount {
    Variable            = -1,
    One                 = 1,
    Two                 = 2,
    Three               = 3,
    Four                = 4,
    Five                = 5,
    Six                 = 6,
    Seven               = 7,
    Eight               = 8,
    Nine                = 9
}

/** 
 * Standard clefs or sets of clefs.
 *
 * TODO(jnetterf): Deprecate this in favour of MusicXML.
 */
export enum Clef {
    Treble              = 0,
    Bass                = 1,
    Alto                = 2,
    Tenor               = 3,
    Piano               = 4,
    Choral              = 5,
    TrebleDrums         = 6,
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
    register:           (callback: (payload: any) => boolean) => void;
    unregister:         (callback: (payload: any) => boolean) => void;

    /** 
     * Dispatch a Flux-style event.
     * 
     * @param cb The callback should not be used for any logic that could potentially
     * take place in the stores. If a callback is specified, the request must
     * be a network request. The callback will be called regardless of whether
     * the event succeeded or not.
     */
    GET:                (url: string, p?: any, cb?: (response: any) => void, nested?: boolean) => Promise<void>;
    DELETE:             (url: string, p?: any, cb?: (response: any) => void, nested?: boolean) => Promise<void>;
    PATCH:              (url: string, p?: any, cb?: (response: any) => void, nested?: boolean) => Promise<void>;
    PUT:                (url: string, p?: any, cb?: (response: any) => void, nested?: boolean) => Promise<void>;
    POST:               (url: string, p?: any, cb?: (response: any) => void, nested?: boolean) => Promise<void>;

    _events:            string;
}

/** 
 * An exception thrown during a dispatch event that states a different dispatch event
 * should be executed.
 */
export class DispatcherRedirect {
    constructor(verb: string, newUrl: string) {
        this.newUrl     = newUrl;
        this.verb       = verb;
    }

    newUrl:             string;
    verb:               string;
    postData:           any;
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
    count:              number;

    /** 
     * The number of displayed dots, or null.
     */
    dots:               number;

    /** 
     * The number of dots to be displayed, if different from dots.
     */
    displayDots?:       number;

    /** 
     * The tuplet to be displayed, if different from tuplet.
     */
    displayTuplet?:     ITuplet;

    hasFlagOrBeam?:     boolean;

    temporary?:         boolean;

    /** 
     * The displayed tuplet, or null.
     */
    tuplet:             ITuplet;
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
    count:              number;

    /** 
     * The number of displayed dots, or null.
     */
    dots?:              number;

    /** 
     * The displayed tuplet, or null.
     */
    tuplet?:            ITuplet
}

/** 
 * An error to report to the user. Handled in Router.
 */
export interface IError {
    /** 
     * A human-readable explanation of what went wrong.
     */
    type:               string;

    /** 
     * An absolute URL (without the hostname) that explains the error.
     */
    redirectTo:         string;
};

/** 
 * A request to the Ripieno server and/or internal store.
 */
export interface IFluxAction<PostData, Response> {
    /** 
     * The path and verb of the resource, such as "PUT /webapp/selection"
     */
    description:        string;

    /** 
     * The parsed JSON response from the server, if this is a server request.
     */
    response:           Response;

    /** 
     * For URIs containing '/_[a-zA-Z0-9-_]*', the part between the first
     * underscore and either the next slash or the final character.
     * 
     * For example, in "PUT /foo/bar/_qui", the resource is "qui".
     */
    resource?:          string;

    /** 
     * For requests like "GET /api/v0/song?userId=blah&another=query",
     * "userId=blah&another=query"
     */
    query:              string;

    /** 
     * For PUT and POST requests, the non-stringified JSON postData.
     */
    postData:           PostData;

    nested?:            boolean;
};

/** 
 * A header is a child of parts, and includes the title and other basic
 * information.
 */
export class ScoreHeader implements MusicXML.ScoreHeader {
    // MusicXML.ScoreHeader
    credits:            MusicXML.Credit[]           = [];

    identification:     MusicXML.Identification = {
        creators:                                   [],
        encodings:                                  [],
        miscellaneous:                              [],
        relations:                                  [],
        rights:                                     [],
        sources:                                    []
    }

    defaults:           MusicXML.Defaults = {
        appearance: {
            distances: {
                hyphen: {
                    tenths:                         120,
                    type:                           "hyphen"
                },
                beam: {
                    tenths:                         10 * SMuFL.distances.beam,
                    type:                           "beam"
                }
            },
            lineWidths: {
                staff: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.staffLineThickness,
                    "type":                         "staff"
                },
                wedge: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.hairpinThickness,
                    "type":                         "wedge"
                },
                ending: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.repeatEndingLineThickness,
                    "type":                         "ending"
                },
                heavyBarline: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.thickBarlineThickness,
                    "type":                         "heavy barline"
                },
                leger: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.legerLineThickness,
                    "type":                         "leger"
                },
                stem: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.stemThickness,
                    "type":                         "stem"
                },
                tupletBracket: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.tupletBracketThickness,
                    "type":                         "tuplet bracket"
                },
                beam: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.beamThickness,
                    "type":                         "beam"
                },
                lightBarline: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.thinBarlineThickness,
                    "type":                         "light barline"
                },
                enclosure: {
                    "tenths":                       10 * SMuFL.bravuraMetadata.engravingDefaults.textEnclosureThickness,
                    "type":                         "enclosure"
                }
            },
            noteSizes: {
                1: { // Grace
                    "type":                         1,
                    "size":                         60 // Not sure what 60 refers to. Our grace notes are 1.9 spaces
                },
                0: { // Cue
                    "type":                         0,
                    "size":                         60 // Not sure what 60 refers to. Our cue notes are 1.9 spaces.
                }
            },
            otherAppearances:                       []
        },
        lyricFonts:                                 [],
        lyricLanguages:                             [],
        musicFont: {
            fontSize:                               "20.5", // This value is completely ignored. See "scaling"
            fontFamily:                             "Bravura, Maestro, engraved",
            fontStyle:                              MusicXML.NormalItalic.Normal,
            fontWeight:                             MusicXML.NormalBold.Normal
        },
        pageLayout: {
            pageHeight:                             renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.pageSizes[0].height),
            pageWidth:                              renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.pageSizes[0].width),
            pageMargins: [
                {
                    bottomMargin:                   renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.defaultMargins.bottom),
                    leftMargin:                     renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.defaultMargins.left),
                    rightMargin:                    renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.defaultMargins.right),
                    topMargin:                      renderUtil.mmToTenths(
                                                        renderUtil.defaultStaveHeight, renderUtil.defaultMargins.top),
                    type:                           MusicXML.OddEvenBoth.Both
                }
            ]
        },
        scaling: {
            millimeters:                            renderUtil.defaultStaveHeight,
            tenths:                                 40
        },
        staffLayouts:                               [],
        systemLayout: {
            systemDistance:                         131,
            systemDividers:                         null,
            systemMargins: {
                leftMargin:                         0,
                rightMargin:                        0
            },
            topSystemDistance:                      70
        },
        wordFont: {
            fontSize:                               "12",
            fontFamily:                             "Alegreya, Times New Roman, serif",
            fontStyle:                              MusicXML.NormalItalic.Normal,
            fontWeight:                             MusicXML.NormalBold.Normal
        }
    }

    work:               MusicXML.Work = {
        opus:                                       {},
        workNumber:                                 "",
        workTitle:                                  ""
    }

    movementTitle:      string =                    "Untitled";
    movementNumber:     string =                    "";

    partList:           MusicXML.PartList = {
        scoreParts:                                 [],
        partGroups:                                 []
    };

    /* Convienience */
    constructor(spec: ScoreHeader) {
        for(var key in spec) {
            if (spec.hasOwnProperty(key) && typeof key === "string" && !!(<any>spec)[key]) {
                (<any>this)[key] = (<any>spec)[key];
            }
        }
    }
    get composer() {
        var idComposer = this.identification.creators
            .filter(c => c.type === "composer")
            .map(c => c.creator)
            .join(", ");
        if (idComposer) {
            return idComposer;
        }

        return this.credits.filter(c => !!~c.creditTypes.indexOf("composer"))
            .map(m => m.creditWords.map(w => w.words).join(" "))
            .join(", ");
    }
    set composer(composer: string) {
        // This is not as powerful as manually setting creators... It only supports a single composer.
        if (!_.any(this.identification.creators, c => {
                    var isComposer = c.type === "composer";
                    c.creator = isComposer ? composer : c.creator;
                    return isComposer;
                })) {
            this.identification.creators.push({
                creator: composer,
                type: "composer"
            });
        }

        if (!_.any(this.credits, c => {
                    if (!c.creditWords.length) {
                        return false;
                    }
                    var isComposer = !!~c.creditTypes.indexOf("composer");
                    c.creditWords[0].words = isComposer ? composer : c.creditWords[0].words;
                    return isComposer;
                })) {
            this.credits.push({
                creditImage: null,
                creditTypes: ["composer"],
                creditWords: [{
                    words: composer,
                    defaultX: renderUtil.mmToTenths(renderUtil.defaultStaveHeight,
                        renderUtil.defaultPageSize().width - renderUtil.defaultMargins.right),
                    justify: MusicXML.LeftCenterRight.Right,
                    defaultY: renderUtil.mmToTenths(renderUtil.defaultStaveHeight, 2)
                }],
                page: 1
            });
        }
    }

    get title() {
        return "";
    }
    set title(title: string) {
        assert(false, "Not implemented");
    }
}

export class Print implements MusicXML.Print {
    /* MusicXML.Print */
    measureNumbering:           MusicXML.MeasureNumbering;
    partNameDisplay:            MusicXML.PartNameDisplay;
    newSystem:                  boolean;
    newPage:                    boolean;
    blankPage:                  string;
    measureLayout:              MusicXML.MeasureLayout;
    partAbbreviationDisplay:    MusicXML.PartAbbreviationDisplay;
    pageLayout:                 MusicXML.PageLayout;
    systemLayout:               MusicXML.SystemLayout;
    /**
     * DEPRECATED. Use staffLayouts
     */
    staffSpacing:               number;
    staffLayouts:                MusicXML.StaffLayout[];
    pageNumber:                 string;

    /* Convienience */
    constructor(print: MusicXML.Print) {
        assign(this, print);
    }
    pageMarginsFor(page: number): MusicXML.PageMargins {
        for (var i = 0; i < this.pageLayout.pageMargins.length; ++i) {
            var margins = this.pageLayout.pageMargins[i];
            if (margins.type === MusicXML.OddEvenBoth.Both ||
                    (margins.type === MusicXML.OddEvenBoth.Odd) === !!(page % 2)) {
                return margins;
            }
        }
        console.warn("No valid page margins for current page...");
        return null;
    }
}

export function getPrint(header: ScoreHeader): Print {
    "use strict";

    return new Print({
        blankPage:                  "",
        measureLayout:              null,
        measureNumbering: {
            relativeX:              0,
            relativeY:              0,
            fontSize:               "small",
            color:                  "#000000",
            data:                   "system",
            defaultX:               null,
            defaultY:               null,
            fontFamily:             "Alegreya, serif",
            fontStyle:              MusicXML.NormalItalic.Normal,
            fontWeight:             MusicXML.NormalBold.Normal
        },
        newPage:                    false,
        newSystem:                  false,
        partAbbreviationDisplay:    null,
        pageLayout:                 header.defaults.pageLayout,
        pageNumber:                 "",
        partNameDisplay:            null,
        staffLayouts:               header.defaults.staffLayouts,
        staffSpacing:               null, // DEPRECATED
        systemLayout:               header.defaults.systemLayout
    });
}

/** 
 * An instrument that a piece can be in. See also instruments.ts.
 */
export interface IInstrument {
    /** 
     * A human readable string representing the instrument.
     */
    name:       string;

    /** 
     * A name that fits within the buttons on the "Parts" tab
     */
    shortName:  string;

    /** 
     * A slug representing uniquely representing the soundfont used for the instrument.
     * The soundfont is available at /res/soundfonts/{instrument.res}-<mp3|ogg>.js.
     * 
     * Some instruments have the SAME soundfont.
     */
    soundfont:  string;

    /** 
     * The standard clef or clef set for an instrument.
     */
    clef:       Clef;

    /** 
     * The 0-indexed MIDI program for the instrument.
     */
    program:    number;

    /** 
     * In Lilypond, instruments are set like
     *      \set Staff.midiInstrument = #"glockenspiel"
     * Names are obtained from http://lilypond.org/doc/v2.17/Documentation/notation/midi-instruments
     */
    lilypond:   string;
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
    ExitEarly                       = 5,

    /** 
     * All of the pre-conditions of the Model were met, and
     * the annotator should continue to the next item.
     */
    Success                         = 10,

    /** 
     * At least one of the pre-conditions of the Model were not
     * met and an item has been inserted in place of the current
     * item.
     */
    RetryCurrent                    = 20,

    /** 
     * Like RETRY_CURRENT, but explicitly state that the entire
     * remainder of the document must be re-annotated.
     */
    RetryCurrentNoOptimizations     = 30,

    /** 
     * At least one of the pre-conditions of the Model were not
     * met and the entire beam must be re-annotated.
     * 
     * The Model must be in a beam for this return type to be used.
     */
    RetryBeam                       = 40,

    /** 
     * The precondition is now met, but a line was removed. The index has already
     * been set to the correct previous line.
     */
    LineRemoved                     = 50,

    /** 
     * At least one of the pre-conditions of the Model were not
     * met and the entire line must be re-annotated.
     */
    RetryLine                       = 60,

    /** 
     * The precondition is now met, but a line was added somewhere between
     * where the previous line was an idx. The annotator should re-annotate
     * the previous two lines.
     */
    LineCreated                     = 70,

    /** 
     * The precondition is now met, but the previous line was modified. For example,
     * the visual cursor has been moved to the previous line.
     */
    RetryPreviousLine               = 80,

    /** 
     * At least one of the preconditions of the Model were not
     * met and the entire document must be re-annotated.
     */
    RetryFromEntry                  = 90
};

export interface ILocation {
    /** 
     * MSD of cursor position, counting from 1.
     */
    bar:        number;

    /** 
     * LSD of cursor position. Represents the beat directly before the
     * cursor, so if it's at the beginning of bar, it is beat 0.
     */
    beat:       number;

    /** 
     * True if the cursor is at the end of a bar. This information is added as
     * part of the annotation process, and is not guaranteed to exist until after
     * the annotation process.
     */
    endMarker?: boolean;
}

export class Location implements ILocation {
    bar:        number;
    beat:       number;
    endMarker:  boolean;

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
}

export var log2     = Math.log(2);

/** 
 * The Lilypond name for a major key.
 */
export var MAJOR    = "\\major";

/** 
 * The Lilypond name for a minor key.
 */
export var MINOR    = "\\minor";

export var MAX_NUM  = 1000000000;

export interface INotation {
    glyph:          string;
    noDirection:    boolean;
    key?:           string;
    x:              number;
    y:              number;
    scale:          number;
    style?:         any;
};

export var noteNames =
    ["C", "C\u266F", "D\u266D", "D", "D\u266F", "E\u266D", "E", "F", "F\u266F",
        "G\u266D", "G", "G\u266F", "A\u266D", "A", "A\u266F", "B\u266D", "B"];

/** 
 * Used for the metre annotation pass.
 */
export class MetreContext {
    attributes: MusicXML.Attributes;
    endMarker:  boolean                 = false;
    ts:         ISimpleTimeSignature    = { beats: 4, beatType: 4, commonRepresentation: false };
    bar:        number                  = 1;
    beat:       number                  = 0;

    constructor(other?: MetreContext) {
        if (other) {
            this.ts = {
                beats: other.ts.beats,
                beatType: other.ts.beatType,
                commonRepresentation: other.ts.commonRepresentation
            };
            this.bar = other.bar;
            this.beat = other.beat;
            this.endMarker = other.endMarker || false;
        }
    }
}

export interface IMidiEvent {
    type:       MidiEventType;
    note:       number;
    channel:    number;
    velocity:   number;
}

export enum MidiEventType {
    NoteOn      = 0,
    NoteOff     = 1
}

/** 
 * Information about the current mouse position, such as from Renderer.
 */
export interface IMouse {
    /** 
     * The location of the mouse relative to the left, in 'em's
     */
    x:                          number;

    /** 
     * The location of the mouse relative to the top, in 'em's.
     */
    y:                          number;

    /** 
     * A string identifying the currently selected object, if applicable.
     * This currently only works with the Molasses engine.
     * 
     * TODO: Let selectionInfo also work with the Victoria engine.
     */
    selectionInfo?:             string;
    page:                       number;
};

/** 
 * Properties that make up a part
 */
export interface IPart {
    /** 
     * The Models that compose the part.
     */
    body?:                      Model[];

    /** 
     * For playback
     */
    instrument?:                IInstrument;
};

/** 
 * Represents zero or more concurrent pitches, such as a note, rest, or chord.
 * 
 * See also IDuration and IPitchDuration.
 */
export interface IPitch extends MusicXML.Pitch {
    /**
     * Temporary accidental
     */
    displayAlter?:              number;

    /**
     * True if is a rest.
     *
     * @annotated
     * @readOnly
     */
    isRest?:                    boolean;

    /** 
     * Calculated line.
     *
     * @annotated
     * @readOnly
     */
    line?:                      number;

    /** 
     * Used for a preview. If true, must not be saved, sent, or restored.
     */
    temporary?:                 boolean;
};

/** 
 * Represents zero or more concurrent pitches with a duration.
 * 
 * DurationModels implement PitchDurations.
 */
export interface IPitchDuration extends IDuration {
    chord?:                     Array<IPitch>;
    isRest?:                    boolean;
    tie?:                       boolean;
    accToDelete?:               number;
    isWholebar?:                boolean;
};

export interface IPlaybackStore {
    addChangeListener:          (callback: Function) => void;
    addLoadingListener:         (callback: Function) => void;
    removeChangeListener:       (callback: Function) => void;
    removeLoadingListener:      (callback: Function) => void;

    ensureLoaded:               (soundfont: string, avoidEvent?: boolean) => boolean;
    destructor:                 () => void;

    bpm:                        number;
    playing:                    boolean;
    ready:                      boolean;
    upToDate:                   boolean;
}

export enum PreviewMode {
    ExcludePreviews             = 0,
    IncludePreviews     		= 1
}

export interface IPointerAction {
    mouseData:                  IPointerData;
    fn:                 		(obj: Model, ctx: Annotator.Context) => IterationStatus;
}

export interface IPointerData {
    partIdx:                    number;
    obj:                		Model;
    idx:                		number;
    visualIdx?:         		number;
    musicLine?:         		number;
    line?:              		number;
    ctxData?:           		IVisualCursor;
};

export enum RectifyXPolicy {
    Invalid                     = 0,
    Max                         = 1,
    Min                         = 2
}

/** 
 * A session, directly from the server.
 * 
 * See also "session.d".
 */
export interface ISession {
    user:                   IUser;
    remoteSongsSynced:      boolean;
    isLoading:              boolean;
    /** 
     * Either LoggedIn or LoggedOut
     */
    state:                  string;
    csrf:                   string;
};

export interface ISessionStore {
    addChangeListener:      (callback: () => void) => void;
    removeChangeListener:   (callback: () => void) => void;

    activeSong:             ISong;
    apiRole:                ApiRole;
    errors:                 Array<IError>;
    info:                   ISession;
    songs:                  Array<ISong>;
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
    _id:            string;

    /** 
     * MongoDB ID for the IUser who created the song.
     */
    _owner:         string;

    /** 
     * Lylite source for the song.
     */
    src:            string;

    /** 
     * The title. This should always match the title at the top of the page.
     */
    title:          string;

    /** 
     * The composer. Should match the composer in the header.
     */
    composer:       string;

    subtitle?:      string;
    arranger?:      string;
    lyricist?:      string;
    copyright?:     string;
    secret?:        boolean;
    path?:          string;
    clefs?:         string;
};

export interface ISongEditor {
    /* Lifecycle */
    destructor:                         () => void;

    addListener:                        (event: number, listener: Function) => void;
    removeListener:                     (event: number, listener: Function) => void;

    /* Properties */
    notationsSidebarVisible:            boolean;

    autosaveModalVisible:               boolean;
    changesPending:                     boolean;
    copyModalVisible:                   boolean;
    midiModalTab:                       number;
    dirty:                              boolean;
    dragonAudio:                        string[];
    exportModalVisible:                 boolean;
    finalCtx:                           Annotator.Context;
    getLineDirty:                       (idx: number, h: number) => void;
    metadataModalVisible:               boolean;
    midiOutHint:                        (out: Array<number>) => void;
    partModalStave:                     IPart;
    selection:                          Model[];
    socialModalVisible:                 boolean;
    header:                             ScoreHeader;
    parts:                              IPart[];
    src:                                string;
    tool:                               any;
    visualCursor:                       IVisualCursor;
    legacyAudioID:                      number;

    /* Sketch */
    dangerouslyHidePreview:             () => void;
    dangerouslyMarkRenderDone:          () => void;
    dangerouslyMarkRendererDirty:       () => void;
    dangerouslyMarkRendererLineClean:   (action: IFluxAction<string, void>) => void; // request is $(PART)_$(LINE)
    dangerouslyMarkRendererLineDirty:   (line: number) => void;
    dangerouslySetVisualCursor:         (visualCursor: IVisualCursor) => void;
    dangerouslyShowPreview:             (action: IFluxAction<IPointerAction, void>) => void;
    dangerouslyTakeSnapshot:            (ctx: Annotator.Context) => void;
    ensureSoundfontLoaded:              (soundfont: string, avoidEvent?: boolean) => void;
};

export enum EventType {
    Change,
    Annotate,
    History,
    ClearHistory,
    MidiOut,
    MidiIn
}

/** 
 * The subclass of a Model. Also doubles as a priority.
 */
export enum Type {
    Print                   = 50,         // C.MusicXML.Print
    Attributes              = 60,         // C.MusicXML.Attributes

    START_OF_ATTRIBUTES     = 100,
    EndMarker               = 110,
    NewPage                 = 120,
    NewLine                 = 130,

    Begin                   = 140,
    Clef                    = 150,
    KeySignature            = 160,
    TimeSignature           = 170,
    END_OF_ATTRIBUTES       = 199,

    Barline                 = 300,

    START_OF_MODIFIERS      = 400,
    Slur                    = 425,
    BeamGroup               = 450,
    Wedge                   = 475,
    END_OF_MODIFIERS        = 499,

    Duration                = 600,

    Placeholder             = 999,

    Unknown                 = 1111
};

/** 
 * A time signature, such as a TimeSignatureModel.
 */
export interface ISimpleTimeSignature {
    /** 
     * The numerator of a time signature.
     */
    beats:                  number;

    /** 
     * The denominator of a time signature.
     */
    beatType:               number;

    /** 
     * True if the time signature should be rendered as "common"
     * e.g., as a "C" instead of "4/4".
     */
    commonRepresentation?:  boolean;
};

/** 
 * A user, directly from the server.
 */
export interface IUser {
    /** 
     * Google ID
     */
    userId:                 string;

    /** 
     * MongoDB id
     */
    _id:                    string;

    identity: {
        id:                 string;
        displayName:        string;
    };

    whitelisted:            boolean;
};

/** 
 * Tuplet information, found in IDuration.
 * 
 * A triplet would have the following ITuplet:
 * {
 *     "num": 3,
 *        "den": 2
 * }
 */
export interface ITuplet {
    num:                    number;
    den:                    number;
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
    annotatedObj?:          Model;

    /** 
     * The line, counting from 1, where annotatedObj is.
     */
    annotatedLine?:         number;

    /** 
     * The page, counting from 1, where annotatedObj is.
     */
    annotatedPage?:         number;

    /** 
     * The part, counting from 0, not counting parts without a body, where
     * annotatedObj is.
     */
    annotatedStave?:        number;
};

export module NoteUtil {
    "use strict";

    /** 
     * Creates a simple realization of an IDuration
     * 
     * @param spec
     */
    export function makeDuration(spec: IDurationSpec): IDuration {
        "use strict";

        return {
            count:          spec.count,
            dots:           spec.dots || 0,
            tuplet:         spec.tuplet || null,
            displayTuplet:  null
        };
    }

    /** 
     * Given a pitch, computes the midi note(s) (number of semitones where 60 is middle C).
     */
    export function pitchToMidiNumber(p: IPitch) {
        "use strict";

        var base = require("./duration").chromaticScale[p.step] + 48;

        return base +
            (p.octave || 0)*12 +
            (p.alter  || 0);
    }

    export var noteToVal: { [key: string]: number } = {
        c: 0,
        d: 2,
        e: 4,
        f: 5,
        g: 7,
        a: 9,
        b: 11
    }; // c:12

    export var valToNote = _.invert(noteToVal);

    /** 
     * Given a pitch, computes the midi note(s) (number of semitones where 60 is middle C).
     */
    export function midiNumberToPitch(n: number, ctx: Annotator.Context): IPitch {
        "use strict";

        // Notes are easiest to read and to pick when they are spelled according to the
        // following conventions:
        //  - Use the most familiar intervals -- perfect, minor, and major -- rather than augmented
        //    or diminished intervals (IMPLEMENTED)
        //  - Chromatic-scale figures use sharps to ascend, flats to descend (TODO)
        //  - Spell stepwise figures as a scale, i.e., as adjacent pitch letters (TODO)
        //
        //     -- Behind Bars by Elaine Gould, p. 85
        var key = ctx.attributes.keySignature;

        // Some notes are only aug or dim, never p/M/m, so we tend to give sharps to Cmaj and keys
        // with sharps, and flats to Amin and keys with flats. (This looks backwards here -- flats
        // have a higher number than sharps. That's because tendency is in terms of the base note!)
        var tendency = key.fifths >= 0 ? 0 : 1;

        var idealStepsPerInterval: {[key: number]: number} = {
            0:  0,              // Perfect unison
            1:  0 + tendency,   // Augmented unison or diminished second
            2:  1,              // Perfect second
            3:  2,              // Minor third
            4:  2,              // Major third
            5:  3,              // Perfect fourth
            6:  3 + tendency,   // Tritone (Augmented fourth or dimished fifth)
            7:  4,              // Perfect fifth
            8:  5,              // Minor sixth (Augmented fifth is fairly common though)
            9:  5,              // Major sixth
            10: 6,              // Minor seventh
            11: 6               // Major seventh
        };

        // We avoid negative modulos.
        // MXFIX: mode should be an enum!
        var pitchS = NoteUtil.keyCircle[
                NoteUtil.circleOffsetByMode[<any>key.mode] + key.fifths];

        var pitch: IPitch = {
            alter:  pitchS[1] === "#" ? 1 : (pitchS[1] === "b" ? -1 : 0),
            octave: 0,
            step:   pitchS[0]
        };
        var halfStepsFromScaleRoot = (((n - pitchToMidiNumber(pitch)) % 12) + 12) % 12;

        var idealSteps = idealStepsPerInterval[halfStepsFromScaleRoot];
        var notesInv: {[key: string]: number} = {
            "c": 0,
            "d": 1,
            "e": 2,
            "f": 3,
            "g": 4,
            "a": 5,
            "b": 6
        };
        var notes = _.invert(notesInv);

        var base = notes[(notesInv[pitch.step] + idealSteps) % 7];

        // Add accidental
        var acc = -positiveMod(pitchToMidiNumber({octave: 0, alter: 0, step: base}) - n, 12) || null;
        if (acc < -6) {
            acc += 12;
        }

        return {
            octave: Math.floor(n/12 - 4),
            alter:  acc,
            step:   base
        };
    }

    export function positiveMod(base: number, mod: number) {
        return ((base % mod) + mod) % mod;
    }

    export function getAccidentals(key: MusicXML.Key) {
        var ret: IAccidentals = { };

        if (key.fifths < 0) {
            _.times(-key.fifths, idx => {
                ret[flatCircle[idx]] = -1;
            });
            return ret;
        }

        _.times(key.fifths, idx => {
            ret[sharpCircle[idx]] = 1;
        });
        return ret;
    };

    export var flatCircle = "beadgcf";
    export var sharpCircle = "fcgdaeb";

    export var keyCircle = [
        "fb", "cb", "gb", "db", "ab", "eb", "bb",
        "f ", "c ", "g ", "d ", "a ", "e ", "b ",
        "f#", "c#", "g#", "d#", "a#", "e#"];
    export var circleOffsetByMode: {[key: string]: number} = { // MXFIX: enum plz
        major: 8,
        minor: 11
    };

    export function isPitch(k: IPitch, name: string, acc?: number) {
        return k.step === name && (k.alter || 0) === (acc || 0);
    }
}

export var InvalidAccidental = 9001;

export module JSONx {
    "use strict";
    export function clone<T>(obj: T): T {
        "use strict";
        return <T>JSON.parse(JSON.stringify(obj));
    }
    export function hash<T>(obj: T): number {
        "use strict";
        return strHash(JSON.stringify(obj));
    }
}

export function deepAssign<T>(a: T, b: T):T {
    "use strict";
    if (a instanceof Array || b instanceof Array) {
        var retArr: any[] = [];
        var aArr:   any[] = (<any>a);
        var bArr:   any[] = (<any>b);
        for (var i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return (<any>retArr);
    } else if (a instanceof Object || b instanceof Object) {
        var ret: T = a ? JSONx.clone(a) : (<T>{});
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                (<any>ret)[key] = deepAssign((<any>ret)[key], (<any>b)[key]);
            }
        }
        return ret;
    } else {
        return (a === undefined) ? b : a;
    }
}

global.C = module.exports; // For debugging
