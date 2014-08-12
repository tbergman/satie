interface Pitch {
    acc: number;
    accTemporary: number;
    chord: Array<Pitch>;
    pitch: string;
    octave: number;
    temporary: boolean;
};

export = Pitch;