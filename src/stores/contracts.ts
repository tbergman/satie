﻿/*
 * Holds interfaces, enums, and utilites used throughout Ripieno.
 */

import _ = require("lodash");

import Model = require("./model");
import Context = require("./context");

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

/**
 * Options to pass to Context.annotate and related annotation functions.
 */
export interface IAnnotationOpts {
    cursor?: IVisualCursor;
    cursorBar?: number;
    cursorBeat?: number;
    cursorStave?: number;
    pointerData?: IPointerData;
    staveIdx: number;
    toolFn?: (obj: Model, ctx: Context) => IterationStatus;
};

export enum Barline {
    Standard,
    Double
}

/**
 * Any data structure that holds a duration, such as a chord or a rest.
 * A simple realization of IDuration can be constructed from C.makeDuration().
 * 
 * See also IPitch and IPitchDuration.
 */
export interface IDuration {
    /**
     * The number of dots to be played, if different from dots.
     */
    actualDots: number;

    /**
     * The tuplet to be displayed, if different from tuplet.
     */
    actualTuplet: ITuplet;

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
     * Returns the number of beats in the duration, between 0 and the
     * number of beats in the timeSignature.
     * 
     * @param ctx with a valid timeSignature, for computing beats.
     * @param inheritedCount the count to use if duration's count is null.
     */
    getBeats: (ctx: Context, inheritedCount?: number) => number;

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
    description: string;
    response: any;
    resource?: string;
    query: string;
    postData: any;
};

export enum IterationStatus {
    /**
     * All of the pre-conditions of the Model were met, and
     * the annotater should continue to the next item.
     */
    SUCCESS,

    /**
     * At least one of the preconditions of the Model were not
     * met and the entire document must be re-annotated.
     */
    RETRY_ENTIRE_DOCUMENT,

    /**
     * The precondition is now met, but a line was added somewhere between
     * where the previous line was and idx. The annotater should re-annotate
     * the previous two lines.
     */
    LINE_CREATED,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and the entire line must be re-annotated.
     */
    RETRY_LINE,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and the entire beam must be re-annotated.
     * 
     * The Model must be in a beam for this return type to be used.
     */
    RETRY_BEAM,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and an item has been inserted in place of the current
     * item.
     */
    RETRY_CURRENT
};

/**
 * A key signature, such as a KeySignatureModel.
 */
export interface IKeySignature {
    acc: number;
    mode: string;
    pitch: IPitch;
}

/**
 * A subset of a Context that is used as a snapshot so that modifying a line
 * does not involve a trace from the start of the document.
 */
export interface ILineSnapshot {
    accidentals: IAccidentals;
    all: Array<Model>;
    bar: number;
    barlineX: Array<number>;
    beats: number;
    keySignature: IKeySignature;
    line: number;
    pageLines: Array<number>;
    pageStarts: Array<number>;
    x: number;
    y: number;
}

/**
 * The Lilypond name for a major key.
 */
export var MAJOR = "\\major";

/**
 * The Lilypond name for a minor key.
 */
export var MINOR = "\\minor";

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
 * Represents zero or more concurrent pitches, such as a note, rest, or chord.
 * 
 * TODO: merge pitch and chord.
 * 
 * See also IDuration and IPitchDuration.
 */
export interface IPitch {
    acc: number;
    accTemporary?: number;
    chord?: Array<IPitch>;
    pitch: string;
    octave: number;
    temporary?: boolean;
    line?: number;
    isRest?: boolean; // read only
    hasFlagOrBeam?: boolean;
};

/**
 * Represents zero or more concurrent pitches with a duration.
 * 
 * DurationModels implement PitchDurations.
 */
export interface IPitchDuration extends IPitch, IDuration {
    tie?: boolean;
};

export interface IPointerData {
    staveIdx: number;
    obj: Model;
    musicLine: number;
    idx: number;
    line?: number;
    ctxData?: IVisualCursor;
};

/**
 * A session, directly from the server.
 * 
 * See also "session.d".
 */
export interface ISession {
    user: IUser;
    remoteSongsSynced: boolean;
    isLoading: boolean;
    state: string; // LoggedIn, LoggedOut
};

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
};

/**
 * A composite of all possible stave parts.
 */
export interface IStave {
    /**
     * If the stave is a part, the Models that compose the part.
     */
    body?: Array<Model>;

    /**
     * If the stave is a part, whether the IStave is part of a piano stave.
     */
    pianoStaff?: boolean;

    /**
     * The height of the stave, in "em".
     */
    staveHeight?: number;

    /**
     * The physical (printout) size of the page.
     */
    pageSize?: IPageSize;

    /**
     * Printed information about the piece.
     */
    header?: {
        title: string;
        composer: string;
    }
};

/**
 * The subclass of a Model.
 */
export enum Type {
    UNKNOWN,
    BARLINE,
    BEAM_GROUP,
    BEGIN,
    CLEF,
    DURATION,
    END_MARKER,
    KEY_SIGNATURE,
    NEWLINE,
    NEWPAGE,
    SLUR,
    TIME_SIGNATURE
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

/**
 * The solid blue line on the page is the VisualCursor.
 */
export interface IVisualCursor {
    /**
     * MSD of cursor position, counting from 1.
     */
    bar: number;

    /**
     * LSD of cursor position. Represents the beat directly before the
     * cursor, so if it's at the begining of bar, it is beat 0.
     */
    beat: number;

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
     * True if the cursor is at the end of a bar. This information is added as
     * part of the annotation process, and is not guaranteed to exist until after
     * the annotation process.
     */
    endMarker?: boolean;
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
        actualTuplet: null,
        actualDots: null,
        getBeats(ctx: Context, inheritedCount?: number): number {
            var Metre = require("./metre");
            return Metre.getBeats(
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

    if (p.pitch) {
        var DurationModel = require("./duration");
        var base = DurationModel.chromaticScale[p.pitch] + 48;
        return base + (p.octave || 0)*12 + (p.acc || 0);
    }
    return _.map(p.chord, m => midiNote(m));
}