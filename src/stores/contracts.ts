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

/** 
 * @file Holds interfaces, enumerations, and utilities used throughout Satie.
 */

export import MusicXML   = require("musicxml-interfaces");
import        _          = require("lodash");
import        assert     = require("assert");
var           assign     = require("react/lib/Object.assign");

import        Annotator  = require("./annotator");
import        Model      = require("./model");

export import SMuFL      = require("../util/SMuFL");
export import renderUtil = require("../util/renderUtil");
export import strHash    = require("../util/hash");

export interface IApi {
    // Local (Flux) methods
    // ========================
    // You'll notice there's no "GET". To retrieve values, use the appropriate store.
    // For example, to retrieve BPM, use PlaybackStore. You should also subscribe to updates from
    // said store.
    "PUT /webapp/bpm"?                      (action: IFluxAction<number>): void;
    "POST /webapp/midiOut"?                 (action: IFluxAction<any>): void;
    "PUT /webapp/visualCursor/togglePlay"?  (action: IFluxAction<void>): void;
    "PUT /webapp/song/dirty"?               (action: IFluxAction<void>): void;
    "DELETE /webapp/song/dirty"?            (action: IFluxAction<void>): void;
    "PUT /webapp/song/forceUpdate"?         (action: IFluxAction<void>): void;
    "PUT /webapp/song/lineDirty"?           (action: IFluxAction<string>): void;
    "DELETE /webapp/song/lineDirty"?        (action: IFluxAction<number>): void;
    "PUT /webapp/song/src"?                 (action: IFluxAction<string>): void;
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
    GET:                (url: string, p?: any, onSuccess?: (response: any) => void, onError?: (response: any) => void) => Promise<void>;
    DELETE:             (url: string, p?: any, onSuccess?: (response: any) => void, onError?: (response: any) => void) => Promise<void>;
    PATCH:              (url: string, p?: any, onSuccess?: (response: any) => void, onError?: (response: any) => void) => Promise<void>;
    PUT:                (url: string, p?: any, onSuccess?: (response: any) => void, onError?: (response: any) => void) => Promise<void>;
    POST:               (url: string, p?: any, onSuccess?: (response: any) => void, onError?: (response: any) => void) => Promise<void>;

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
    displayTuplet?:     MusicXML.TimeModification;

    hasFlagOrBeam?:     boolean;

    temporary?:         boolean;

    /** 
     * The displayed tuplet, or null.
     */
    tuplet:             MusicXML.TimeModification;
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
    tuplet?:            MusicXML.TimeModification
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

export interface IFluxAction<PostData>{
    /** 
     * The path and verb of the resource, such as "PUT /webapp/selection"
     */
    description:        string;

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
}

/**
 * Catch this exception when processing toScore.
 */
export class InvalidMXMLException {
    constructor(reason: string, bar: number, beat: number, part: string) {
        this.reason     = reason;
        this.bar        = bar;
        this.beat       = beat;
        this.part       = part;
    }

    toString() {
        return "Import failed in part " +
            this.part + " on bar " + this.bar + ", beat " + this.beat + ".\n\n" + this.reason +
            "If you believe this error is a bug, please report it at https://github.com/ripieno/satie";
    }

    part:       string;
    reason:     string;
    bar:        number;
    beat:       number;
}


/** 
 * A header is a child of parts, and includes the title and other basic
 * information.
 */
export class ScoreHeader implements MusicXML.ScoreHeader {
    // MusicXML.ScoreHeader
    credits:            MusicXML.Credit[]           = [];

    identification:     MusicXML.Identification = {
        creators:                                   [],
        encoding:                                   null,
        miscellaneous:                              [],
        relations:                                  [],
        rights:                                     [],
        source:                                     null
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
            topSystemDistance:                      0
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

    movementTitle:      string =                    "";
    movementNumber:     string =                    "";

    partList:           MusicXML.PartList = {
        scoreParts:                                 [],
        partGroups:                                 []
    };

    /* Convenience */
    constructor(spec: MusicXML.ScoreHeader) {
        for(var key in spec) {
            if (spec.hasOwnProperty(key) && typeof key === "string" && !!(<any>spec)[key]) {
                (<any>this)[key] = (<any>spec)[key];
            }
        }
    }
    get composer() {
        if (!this.identification || !(this.identification.creators||[]).length) {
            return "";
        }
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
        this.identification = this.identification || {
                miscellaneous: [],
                creators: [],
                encoding: [],
                relations: [],
                rights: [],
                source: null
            };
        this.identification.creators = this.identification.creators || [];

        // This is not as powerful as manually setting creators... It only supports a single composer.
        if (!_.any(this.identification.creators, c => {
                    var isComposer = c.type === "composer";
                    // Replace the composer...
                    c.creator = isComposer ? composer : c.creator;
                    return isComposer;
                })) {
            // ...or add a composer
            this.identification.creators.push({
                creator: composer,
                type: "composer"
            });
        }

        this.credits = this.credits || [];
        if (!_.any(this.credits, c => {
                    if (!c.creditWords.length) {
                        return false;
                    }
                    // Replace a credit...
                    var isComposer = !!~c.creditTypes.indexOf("composer");
                    c.creditWords[0].words = isComposer ? composer : c.creditWords[0].words;
                    return isComposer;
                })) {
            this.credits.push({
                // ... or add a credit
                creditImage: null,
                creditTypes: ["composer"],
                creditWords: [{
                    words: composer,
                    defaultX: renderUtil.mmToTenths(renderUtil.defaultStaveHeight,
                        renderUtil.defaultPageSize().width - renderUtil.defaultMargins.right),
                    justify: MusicXML.LeftCenterRight.Right,
                    defaultY: renderUtil.mmToTenths(renderUtil.defaultStaveHeight, 2),
                    fontSize: "18px"
                }],
                page: 1
            });
        }
    }

    get title() {
        return this.movementTitle;
    }
    set title(title: string) {
        // Set meta-data
        this.movementTitle = title;

        // Set image
        this.credits = this.credits || [];
        if (!_.any(this.credits, c => {
                    if (!c.creditWords.length) {
                        return false;
                    }
                    // Replace a credit...
                    var isComposer = !!~c.creditTypes.indexOf("title");
                    c.creditWords[0].words = isComposer ? title : c.creditWords[0].words;
                    return isComposer;
                })) {
            this.credits.push({
                // ... or add a credit
                creditImage: null,
                creditTypes: ["title"],
                creditWords: [{
                    words: title,
                    defaultX: renderUtil.mmToTenths(renderUtil.defaultStaveHeight,
                        renderUtil.defaultPageSize().width/2),
                    justify: MusicXML.LeftCenterRight.Center,
                    defaultY: renderUtil.mmToTenths(renderUtil.defaultStaveHeight, renderUtil.defaultMargins.top/2),
                    fontSize: "24px"
                }],
                page: 1
            });
        }
    }
}

export function generateUUID(): string {
    "use strict";
    return (Math.random().toString(16) + "000000000").substr(2, 8);
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

    /* Convenience */
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
     * Like RetryCurrent, but all following lines must be re-annotated.
     * This is a hack which may be removed later.
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
    division:   number;

    /** 
     * True if the cursor is at the end of a bar. This information is added as
     * part of the annotation process, and is not guaranteed to exist until after
     * the annotation process.
     */
    endMarker?: boolean;
}

export class Location implements ILocation {
    bar:        number;
    division:   number;
    endMarker:  boolean;

    eq(b: ILocation) {
        return this.bar === b.bar && this.division === b.division;
    }

    lt(b: ILocation) {
        return this.bar < b.bar || this.bar === b.bar && this.division < b.division;
    }

    le(b: ILocation) {
        return this.bar < b.bar || this.bar === b.bar && this.division <= b.division;
    }

    ge(b: ILocation) {
        return this.bar > b.bar || this.bar === b.bar && this.division >= b.division;
    }

    gt(b: ILocation) {
        return this.bar > b.bar || this.bar === b.bar && this.division > b.division;
    }

    constructor(opts: ILocation) {
        this.bar = opts.bar;
        this.division = opts.division;
        this.endMarker = opts.endMarker;
    }
}

export var log2     = Math.log(2);

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
    division:   number                  = 0;

    constructor(other?: MetreContext) {
        if (other) {
            this.ts = {
                beats: other.ts.beats,
                beatType: other.ts.beatType,
                commonRepresentation: other.ts.commonRepresentation
            };
            this.bar = other.bar;
            this.division = other.division;
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
 * Staves, voices, and voices are all distinct concepts. A part is usually one instrument.
 * There is a one-to-many relation between parts and voices, as well as between parts and
 * staves. Staves of a single part are grouped together.
 */
export interface IPart {
    /**
     * Id of corresponding part in header. This contains information about how the part is rendered.
     */
    id:                         string;

    /**
     * The keys are indices of voices this part owns.
     * The values are "true".
     */
    containsVoice:              {[key: number]: boolean};

    /**
     * Number of staves this part owns.
     */
    staveCount:                     number;
};

/** 
 * Staves, voices, and parts are all distinct concepts. A voice is a monotonic time-stream
 * of Models. A voice can "switch" staves, but it must remain in the same part.
 */
export interface IVoice {
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
    tieds?:                     Array<MusicXML.Tied>;
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
}

export enum PreviewMode {
    ExcludePreviews             = 0,
    IncludePreviews             = 1
}

export interface IPointerAction {
    mouseData:                  IPointerData;
    fn:                         (obj: Model, ctx: Annotator.Context) => IterationStatus;
}

export interface IPointerData {
    partIdx:                    number;
    obj:                        Model;
    idx:                        number;
    visualIdx?:                 number;
    musicLine?:                 number;
    line?:                      number;
    ctxData?:                   IVisualCursor;
};

export enum RectifyXPolicy {
    Invalid                     = 0,
    Max                         = 1,
    Min                         = 2
}

export interface IScoreStore {
    /* Life-cycle */
    destructor:                         () => void;

    addListener:                        (event: number, listener: Function) => void;
    removeListener:                     (event: number, listener: Function) => void;

    /* Properties */
    dirty:                              boolean;
    finalCtx:                           Annotator.Context;
    getLineDirty:                       (idx: number, h: number) => void;
    midiOutHint:                        (out: Array<number>) => void;
    header:                             ScoreHeader;
    parts:                              IPart[];
    voices:                             IVoice[];
    src:                                string;
    visualCursor:                       IVisualCursor;

    /* Sketchy */
    dangerouslyMarkRenderDone:          () => void;
    dangerouslyMarkRendererDirty:       () => void;
    dangerouslyMarkRendererLineClean:   (action: IFluxAction<string>) => void; // request is $(PART)_$(LINE)
    dangerouslyMarkRendererLineDirty:   (line: number) => void;
    dangerouslySetVisualCursor:         (visualCursor: IVisualCursor) => void;
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
    Print                   = 50,           // Implements C.MusicXML.Print

    START_OF_ATTRIBUTES     = 100,
    EndMarker               = 110,          // Need not be saved. Appears at end of bars and lines.

    NewPage                 = 120,          // Page break flag. Folds into Attributes.
    NewLine                 = 130,          // Line break flag. Folds into Attributes.
    Begin                   = 140,          // Need not be saved. Appears at index 1 of each body, after Print

    Attributes              = 145,          // Implements C.MusicXML.Attributes
    Clef                    = 150,          // Implements C.MusicXML.Clef
    KeySignature            = 160,          // Implements C.MusicXML.Key
    TimeSignature           = 170,          // Implements C.MusicXML.Time
    END_OF_ATTRIBUTES       = 199,

    Barline                 = 300,          // Implements C.MusicXML.Barline

    START_OF_MODIFIERS      = 400,
    Direction               = 410,          // Implements C.MusicXML.Direction
    Slur                    = 425,          // Implements C.MusicXML.Slur
    BeamGroup               = 450,          // Implements C.MusicXML.Beam
    Wedge                   = 475,          // Implements C.MusicXML.Wedge
    END_OF_MODIFIERS        = 499,

    Duration                = 600,          // ._notes implements C.MusicXML.Note[]

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
            "C": 0,
            "D": 1,
            "E": 2,
            "F": 3,
            "G": 4,
            "A": 5,
            "B": 6
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
            _.times(Math.min(7, -key.fifths), idx => {
                ret[flatCircle[idx]] = (7 + idx < -key.fifths) ? -2 : -1;
            });
            return ret;
        } else {
            _.times(Math.min(7, key.fifths), idx => {
                ret[flatCircle[idx]] = (7 + idx < key.fifths) ? 2 : 1;
            });
            return ret;
        }
    };

    export var flatCircle = "BEADGCF";
    export var sharpCircle = "FCGDAEB";

    export var keyCircle = [
        "Fb", "Cb", "Gb", "Db", "Ab", "Eb", "Bb",
        "F ", "C ", "G ", "D ", "A ", "E ", "B ",
        "F#", "C#", "G#", "D#", "A#", "E#"];
    export var circleOffsetByMode: {[key: string]: number} = { // MXFIX: enum plz
        major: 8,
        minor: 11
    };

    export function isPitch(k: IPitch, name: string, acc?: number) {
        return k.step === name && (k.alter || 0) === (acc || 0);
    }
}

export var InvalidAccidental = 9001;

export interface ISynthCallback {
    tmpRef:     string;
    forExport:  boolean;
    cb:         string;
}

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

export function tsToSimpleTS(ts: MusicXML.Time): ISimpleTimeSignature {
    var commonBeatType = _.reduce(ts.beatTypes, (maxBT, beatType) => Math.max(maxBT, beatType), 0);
    var totalBeats = _.reduce(ts.beats, (memo, time, i) => memo +
            _.reduce(time.split("+"), (memo, time) =>
                memo + parseInt(time, 10) * commonBeatType/ts.beatTypes[i], 0), 0);

    return {
        beats:                  totalBeats,
        beatType:               commonBeatType,
        commonRepresentation:   isNaN(ts.symbol) || ts.symbol !== MusicXML.TimeSymbolType.Normal
            // Note: commonRepresentation should really always be either itself set or exist on a prototype.
    };
}

export var defaultClefLines: { [key: string]: number} = {
    G:              2,
    F:              4,
    C:              3,
    PERCUSSION:     3,
    TAB:            5,
    NONE:           3
};

global.C = module.exports; // For debugging
