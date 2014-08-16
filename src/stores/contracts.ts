import Model = require("./model");
import IterationStatus = require("./iterationStatus");
import Context = require("./context");

export var MAJOR = "\\major";
export var MINOR = "\\minor";

export interface Accidentals {
    [key: string]: number
}

export interface KeySignature {
    acc: number;
    mode: string;
    pitch: Pitch;
}

export interface PageSize { 
    height: number;
    lilypondName: string;
    unit: string;
    width: number;
};

export interface Mouse {
    x: number;
    y: number;
    selectionInfo?: string;
    page: number;
};

export interface PointerData {
    staveIdx: number;
    obj: Model;
    musicLine: number;
    idx: number;
    line?: number;
};

export interface Stave {
    body?: Array<Model>;
    pianoStaff?: boolean;

    staveHeight?: number;
    pageSize?: PageSize;
    header?: {
        title: string;
        composer: string;
    }
};

export interface AnnotationOpts {
    cursor: {};
    cursorBar: number;
    cursorBeat: number;
    cursorStave: number;
    pointerData: PointerData;
    staveIdx: number;
    toolFn: (obj: Model, ctx: Context) => IterationStatus;
};

export interface VisualCursor {
    bar: number;
    beat: number;
    annotatedObj?: Model;
    annotatedLine?: number;
    annotatedPage?: number;
    endMarker?: boolean;
};

export interface ActiveIntersection {
    obj: Model;
    expires: number;
}

export interface Pitch {
    acc: number;
    accTemporary?: number;
    chord?: Array<Pitch>;
    pitch: string;
    octave: number;
    temporary?: boolean;
    line?: number;
};

export interface TimeSignature {
    beats: number;
    beatType: number;
};

export interface Tuplet {
    num: number;
    den: number;
}

export interface PitchDuration extends Pitch {
    count: number;
    getBeats: (inheritedCount?: number, inheritedTS?: TimeSignature) => number;
    midiNote: () => any; // TSFIX
    dots: number;
    actualDots: number;
    tuplet: Tuplet;
    actualTuplet: Tuplet;
};

export interface User {
    userId: string; // Google id
    _id: string; // db id
};

export interface Session {
    user: User;
    remoteSongsSynced: boolean;
    isLoading: boolean;
};

export interface Song {
    _id: string;
    src: string;
};

export interface Error {
    type: string;
    redirectTo: string;
};

export interface FluxAction {
    description: string;
    response: any;
    resource?: string;
    query: string;
    postData: any;
};

export enum ModelType {
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