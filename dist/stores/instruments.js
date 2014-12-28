var _ = require("lodash");
var C = require("./contracts");
exports.List = [
    {
        name: "Acoustic Grand Piano",
        clef: 4 /* Piano */,
        shortName: "Piano",
        soundfont: "acoustic_grand_piano",
        lilypond: "acoustic grand",
        program: 0
    },
    {
        name: "Bright Acoustic Piano",
        clef: 4 /* Piano */,
        shortName: "Piano",
        soundfont: "bright_acoustic_piano",
        lilypond: "bright acoustic",
        program: 1
    },
    {
        name: "Electric Grand Piano",
        clef: 4 /* Piano */,
        shortName: "Piano",
        soundfont: "electric_grand_piano",
        lilypond: "electric grand",
        program: 2
    },
    {
        name: "Honky-tonk Piano",
        clef: 4 /* Piano */,
        shortName: "HT Piano",
        soundfont: "honytonk_piano",
        lilypond: "honky-tonk",
        program: 3
    },
    {
        name: "Electric Piano 1",
        clef: 4 /* Piano */,
        shortName: "E Piano",
        soundfont: "electric_piano_1",
        lilypond: "electric piano 1",
        program: 4
    },
    {
        name: "Electric Piano 2",
        clef: 4 /* Piano */,
        shortName: "E Piano",
        soundfont: "electric_piano_2",
        lilypond: "electric piano 2",
        program: 5
    },
    {
        name: "Harpsichord",
        clef: 4 /* Piano */,
        shortName: "Harpsichord",
        soundfont: "harpsichord",
        lilypond: "harpsichord",
        program: 6
    },
    {
        name: "Clavi",
        clef: 4 /* Piano */,
        shortName: "Clavi",
        soundfont: "clavichord",
        lilypond: "clav",
        program: 7
    },
    {
        name: "Celesta",
        shortName: "Celesta",
        clef: 4 /* Piano */,
        soundfont: "celesta",
        lilypond: "celesta",
        program: 8
    },
    {
        name: "Glockenspiel",
        shortName: "Glockenspiel",
        clef: 0 /* Treble */,
        soundfont: "glockenspiel",
        lilypond: "glockenspiel",
        program: 9
    },
    {
        name: "Music Box",
        shortName: "Music Box",
        clef: 0 /* Treble */,
        soundfont: "music_box",
        lilypond: "music box",
        program: 10
    },
    {
        name: "Vibraphone",
        shortName: "Vibraphone",
        clef: 0 /* Treble */,
        soundfont: "vibraphone",
        lilypond: "vibraphone",
        program: 11
    },
    {
        name: "Marimba",
        shortName: "Marimba",
        clef: 4 /* Piano */,
        soundfont: "marimba",
        lilypond: "marimba",
        program: 12
    },
    {
        name: "Xylophone",
        shortName: "Xylophone",
        clef: 0 /* Treble */,
        soundfont: "xylophone",
        lilypond: "xylophone",
        program: 13
    },
    {
        name: "Tubular Bells",
        shortName: "Bells",
        clef: 0 /* Treble */,
        soundfont: "tubular_bells",
        lilypond: "tubular bells",
        program: 14
    },
    {
        name: "Dulcimer",
        shortName: "Dulcimer",
        clef: 0 /* Treble */,
        soundfont: "dulcimer",
        lilypond: "dulcimer",
        program: 15
    },
    {
        name: "Drawbar Organ",
        shortName: "Organ",
        clef: 4 /* Piano */,
        soundfont: "drawbar_organ",
        lilypond: "drawbar organ",
        program: 16
    },
    {
        name: "Percussive Organ",
        shortName: "Organ",
        clef: 4 /* Piano */,
        soundfont: "percussive_organ",
        lilypond: "percussive organ",
        program: 17
    },
    {
        name: "Rock Organ",
        shortName: "Organ",
        clef: 4 /* Piano */,
        soundfont: "rock_organ",
        lilypond: "rock organ",
        program: 18
    },
    {
        name: "Church Organ",
        shortName: "Organ",
        clef: 4 /* Piano */,
        soundfont: "church_organ",
        lilypond: "church organ",
        program: 19
    },
    {
        name: "Reed Organ",
        shortName: "Organ",
        clef: 4 /* Piano */,
        soundfont: "reed_organ",
        lilypond: "reed organ",
        program: 20
    },
    {
        name: "Accordion",
        shortName: "Accordion",
        clef: 4 /* Piano */,
        soundfont: "accordion",
        lilypond: "accordion",
        program: 21
    },
    {
        name: "Tango Accordion",
        shortName: "Accordion",
        clef: 4 /* Piano */,
        soundfont: "tango_accordion",
        lilypond: "concertina",
        program: 23
    },
    {
        name: "Harmonica",
        shortName: "Harmonica",
        clef: 0 /* Treble */,
        soundfont: "harmonica",
        lilypond: "harmonica",
        program: 22
    },
    {
        name: "Acoustic Guitar (nylon)",
        shortName: "Acc. Guitar",
        clef: 0 /* Treble */,
        soundfont: "acoustic_guitar_nylon",
        lilypond: "acoustic guitar (nylon)",
        program: 24
    },
    {
        name: "Acoustic Guitar (steel)",
        shortName: "Acc. Guitar",
        clef: 0 /* Treble */,
        soundfont: "acoustic_guitar_steel",
        lilypond: "acoustic guitar (steel)",
        program: 25
    },
    {
        name: "Electric Guitar (jazz)",
        shortName: "E Guitar",
        clef: 0 /* Treble */,
        soundfont: "acoustic_guitar_jazz",
        lilypond: "acoustic guitar (jazz)",
        program: 26
    },
    {
        name: "Electric Guitar (clean)",
        shortName: "E Guitar",
        clef: 0 /* Treble */,
        soundfont: "electric_guitar_clean",
        lilypond: "acoustic guitar (clean)",
        program: 27
    },
    {
        name: "Electric Guitar (muted)",
        shortName: "E Guitar",
        clef: 0 /* Treble */,
        soundfont: "electric_guitar_muted",
        lilypond: "acoustic guitar (muted)",
        program: 28
    },
    {
        name: "Overdriven Guitar",
        shortName: "E Guitar",
        clef: 0 /* Treble */,
        soundfont: "overdriven_guitar",
        lilypond: "overdriven guitar",
        program: 29
    },
    {
        name: "Distortion Guitar",
        shortName: "E Guitar",
        clef: 0 /* Treble */,
        soundfont: "distortion_guitar",
        lilypond: "distortion guitar",
        program: 30
    },
    {
        name: "Guitar harmonics",
        shortName: "Guitar Harm.",
        clef: 0 /* Treble */,
        soundfont: "guitar_harmonics",
        lilypond: "guitar harmonics",
        program: 31
    },
    {
        name: "Acoustic Bass",
        shortName: "Bass",
        clef: 1 /* Bass */,
        soundfont: "acoustic_bass",
        lilypond: "acoustic bass",
        program: 32
    },
    {
        name: "Electric Bass (finger)",
        shortName: "E. Bass",
        clef: 1 /* Bass */,
        soundfont: "electric_bass_finger",
        lilypond: "electric bass (finger)",
        program: 33
    },
    {
        name: "Electric Bass (pick)",
        shortName: "E. Bass",
        clef: 1 /* Bass */,
        soundfont: "electric_bass_pick",
        lilypond: "electric bass (pick)",
        program: 34
    },
    {
        name: "Fretless Bass",
        shortName: "Fretless Bass",
        clef: 1 /* Bass */,
        soundfont: "fretless_bass",
        lilypond: "fretless bass",
        program: 35
    },
    {
        name: "Slap Bass 1",
        shortName: "Slap Bass",
        clef: 1 /* Bass */,
        soundfont: "slap_bass_1",
        lilypond: "slap bass 1",
        program: 36
    },
    {
        name: "Slap Bass 2",
        shortName: "Slap Bass",
        clef: 1 /* Bass */,
        soundfont: "slap_bass_2",
        lilypond: "slap bass 2",
        program: 37
    },
    {
        name: "Synth Bass 1",
        shortName: "Synth Bass",
        clef: 1 /* Bass */,
        soundfont: "synth_bass_1",
        lilypond: "synth bass 1",
        program: 38
    },
    {
        name: "Synth Bass 2",
        shortName: "Synth Bass",
        clef: 1 /* Bass */,
        soundfont: "synth_bass_2",
        lilypond: "synth bass 2",
        program: 39
    },
    {
        name: "Violin",
        shortName: "Violin",
        clef: 0 /* Treble */,
        soundfont: "violin",
        lilypond: "violin",
        program: 40
    },
    {
        name: "Viola",
        shortName: "Viola",
        clef: 2 /* Alto */,
        soundfont: "viola",
        lilypond: "viola",
        program: 41
    },
    {
        name: "Cello",
        shortName: "Cello",
        clef: 1 /* Bass */,
        soundfont: "cello",
        lilypond: "cello",
        program: 42
    },
    {
        name: "Contrabass",
        shortName: "Bass",
        clef: 1 /* Bass */,
        soundfont: "contrabass",
        lilypond: "contrabass",
        program: 43
    },
    {
        name: "Tremolo Strings",
        shortName: "Strings",
        clef: 5 /* Choral */,
        soundfont: "tremolo_strings",
        lilypond: "tremolo strings",
        program: 44
    },
    {
        name: "Pizzicato Strings",
        shortName: "Pizz. Strings",
        clef: 5 /* Choral */,
        soundfont: "pizzicato_strings",
        lilypond: "pizzicato strings",
        program: 45
    },
    {
        name: "Orchestral Harp",
        shortName: "Harp",
        clef: 4 /* Piano */,
        soundfont: "orchestral_harp",
        lilypond: "orchestral harp",
        program: 46
    },
    {
        name: "Timpani",
        shortName: "Timpani",
        clef: 1 /* Bass */,
        soundfont: "timpani",
        lilypond: "timpani",
        program: 47
    },
    {
        name: "String Ensemble 1",
        shortName: "Strings",
        clef: 4 /* Piano */,
        soundfont: "string_ensemble_1",
        lilypond: "string ensemble 1",
        program: 48
    },
    {
        name: "String Ensemble 2",
        shortName: "Strings",
        clef: 4 /* Piano */,
        soundfont: "string_ensemble_2",
        lilypond: "string ensemble 2",
        program: 49
    },
    {
        name: "SynthStrings 1",
        shortName: "Synth Strings",
        clef: 4 /* Piano */,
        soundfont: "synthstrings_1",
        lilypond: "synthstrings 1",
        program: 50
    },
    {
        name: "SynthStrings 2",
        shortName: "Synth Strings",
        clef: 4 /* Piano */,
        soundfont: "synthstrings_2",
        lilypond: "synthstrings 2",
        program: 51
    },
    {
        name: "Choir Aahs",
        shortName: "Choir",
        clef: 5 /* Choral */,
        soundfont: "choir_aahs",
        lilypond: "choir aahs",
        program: 52
    },
    {
        name: "Voice Oohs",
        shortName: "Choir",
        clef: 5 /* Choral */,
        soundfont: "voice_oohs",
        lilypond: "voice oohs",
        program: 53
    },
    {
        name: "Synth Voice",
        shortName: "Voice",
        clef: 5 /* Choral */,
        soundfont: "synth_voice",
        lilypond: "synth voice",
        program: 54
    },
    {
        name: "Orchestra Hit",
        shortName: "Orch. Hit",
        clef: 4 /* Piano */,
        soundfont: "orchestra_hit",
        lilypond: "orchestra hit",
        program: 55
    },
    {
        name: "Trumpet",
        shortName: "Trumpet",
        clef: 0 /* Treble */,
        soundfont: "trumpet",
        lilypond: "trumpet",
        program: 56
    },
    {
        name: "Muted Trumpet",
        shortName: "Muted Trumpet",
        clef: 0 /* Treble */,
        soundfont: "muted_trumpet",
        lilypond: "muted trumpet",
        program: 59
    },
    {
        name: "Trombone",
        shortName: "Trombone",
        clef: 1 /* Bass */,
        soundfont: "trombone",
        lilypond: "trombone",
        program: 57
    },
    {
        name: "Tenor Trombone",
        shortName: "Tnr. Trbne.",
        clef: 3 /* Tenor */,
        soundfont: "trombone",
        lilypond: "trombone<tenor>",
        program: 57
    },
    {
        name: "Tuba",
        shortName: "Tuba",
        clef: 1 /* Bass */,
        soundfont: "tuba",
        lilypond: "tuba",
        program: 58
    },
    {
        name: "French Horn",
        shortName: "F. Horn",
        clef: 0 /* Treble */,
        soundfont: "french_horn",
        lilypond: "french horn",
        program: 60
    },
    {
        name: "French Horn (Bass)",
        shortName: "Bs. F. Horn",
        clef: 1 /* Bass */,
        soundfont: "french_horn",
        lilypond: "french horn<bass>",
        program: 60
    },
    {
        name: "Brass Section",
        shortName: "Brass",
        clef: 5 /* Choral */,
        soundfont: "brass_section",
        lilypond: "brass section",
        program: 61
    },
    {
        name: "SynthBrass 1",
        shortName: "Synth Brass",
        clef: 4 /* Piano */,
        soundfont: "synthbrass_1",
        lilypond: "synthbrass 1",
        program: 62
    },
    {
        name: "SynthBrass 2",
        shortName: "Synth Brass",
        clef: 4 /* Piano */,
        soundfont: "synthbrass_2",
        lilypond: "synthbrass 2",
        program: 63
    },
    {
        name: "Soprano Sax",
        shortName: "S. Sax",
        clef: 0 /* Treble */,
        soundfont: "soprano_sax",
        lilypond: "soprano sax",
        program: 64
    },
    {
        name: "Alto Sax",
        shortName: "A. Sax",
        clef: 0 /* Treble */,
        soundfont: "alto_sax",
        lilypond: "alto sax",
        program: 65
    },
    {
        name: "Tenor Sax",
        shortName: "T. Sax",
        clef: 0 /* Treble */,
        soundfont: "tenor_sax",
        lilypond: "tenor sax",
        program: 66
    },
    {
        name: "Baritone Sax",
        shortName: "B. Sax",
        clef: 0 /* Treble */,
        soundfont: "baritone_sax",
        lilypond: "baritone sax",
        program: 67
    },
    {
        name: "Oboe",
        shortName: "Oboe",
        clef: 0 /* Treble */,
        soundfont: "oboe",
        lilypond: "oboe",
        program: 68
    },
    {
        name: "English Horn",
        shortName: "E. Horn",
        clef: 0 /* Treble */,
        soundfont: "english_horn",
        lilypond: "english horn",
        program: 69
    },
    {
        name: "Bassoon",
        shortName: "Bassoon",
        clef: 1 /* Bass */,
        soundfont: "bassoon",
        lilypond: "bassoon",
        program: 70
    },
    {
        name: "Bassoon (tenor)",
        shortName: "Bassoon",
        clef: 3 /* Tenor */,
        soundfont: "bassoon",
        lilypond: "bassoon",
        program: 70
    },
    {
        name: "Clarinet",
        shortName: "Clarinet",
        clef: 0 /* Treble */,
        soundfont: "clarinet",
        lilypond: "clarinet",
        program: 71
    },
    {
        name: "Bass Clarinet",
        shortName: "B. Clarinet",
        clef: 1 /* Bass */,
        soundfont: "clarinet",
        lilypond: "clarinet",
        program: 71
    },
    {
        name: "Piccolo",
        shortName: "Piccolo",
        clef: 0 /* Treble */,
        soundfont: "piccolo",
        lilypond: "piccolo",
        program: 72
    },
    {
        name: "Flute",
        shortName: "Flute",
        clef: 0 /* Treble */,
        soundfont: "flute",
        lilypond: "flute",
        program: 73
    },
    {
        name: "Recorder",
        shortName: "Recorder",
        clef: 0 /* Treble */,
        soundfont: "recorder",
        lilypond: "recorder",
        program: 74
    },
    {
        name: "Pan Flute",
        shortName: "Pan Flute",
        clef: 0 /* Treble */,
        soundfont: "pan_flute",
        lilypond: "pan flute",
        program: 75
    },
    {
        name: "Blown Bottle",
        shortName: "Bottle",
        clef: 0 /* Treble */,
        soundfont: "blown_bottle",
        lilypond: "blown bottle",
        program: 76
    },
    {
        name: "Shakuhachi",
        shortName: "Shakuhachi",
        clef: 0 /* Treble */,
        soundfont: "shakuhachi",
        lilypond: "shakuhachi",
        program: 77
    },
    {
        name: "Whistle",
        shortName: "Whistle",
        clef: 0 /* Treble */,
        soundfont: "whistle",
        lilypond: "whistle",
        program: 78
    },
    {
        name: "Ocarina",
        shortName: "Ocarina",
        clef: 0 /* Treble */,
        soundfont: "ocarina",
        lilypond: "ocarina",
        program: 79
    },
    {
        name: "Lead 1 (square)",
        shortName: "Square",
        clef: 0 /* Treble */,
        soundfont: "lead_1_square",
        lilypond: "lead 1 (square)",
        program: 80
    },
    {
        name: "Lead 2 (sawtooth)",
        shortName: "Sawtooth",
        clef: 0 /* Treble */,
        soundfont: "lead_2_sawtooth",
        lilypond: "lead 2 (sawtooth)",
        program: 81
    },
    {
        name: "Lead 3 (calliope)",
        shortName: "Calliope",
        clef: 0 /* Treble */,
        soundfont: "lead_3_calliope",
        lilypond: "lead 3 (calliope)",
        program: 82
    },
    {
        name: "Lead 4 (chiff)",
        shortName: "Chiff",
        clef: 0 /* Treble */,
        soundfont: "lead_4_chiff",
        lilypond: "lead 4 (chiff)",
        program: 83
    },
    {
        name: "Lead 5 (charang)",
        shortName: "Charang",
        clef: 0 /* Treble */,
        soundfont: "lead_5_charang",
        lilypond: "lead 5 (charang)",
        program: 84
    },
    {
        name: "Lead 6 (voice)",
        shortName: "Voice",
        clef: 0 /* Treble */,
        soundfont: "lead_6_voice",
        lilypond: "lead 6 (voice)",
        program: 85
    },
    {
        name: "Lead 7 (fifths)",
        shortName: "Fifths",
        clef: 0 /* Treble */,
        soundfont: "lead_7_fifths",
        lilypond: "lead 7 (fifths)",
        program: 86
    },
    {
        name: "Lead 8 (bass + lead)",
        shortName: "Bass+Lead",
        clef: 0 /* Treble */,
        soundfont: "lead_8_bass_lead",
        lilypond: "lead 8 (bass+lead)",
        program: 87
    },
    {
        name: "Pad 1 (new age)",
        shortName: "Pad 1",
        clef: 4 /* Piano */,
        soundfont: "pad_1_new_age",
        lilypond: "pad 1 (new age)",
        program: 88
    },
    {
        name: "Pad 2 (warm)",
        shortName: "Pad 2",
        clef: 4 /* Piano */,
        soundfont: "pad_2_warm",
        lilypond: "pad 2 (warm)",
        program: 89
    },
    {
        name: "Pad 3 (polysynth)",
        shortName: "Pad 3",
        clef: 4 /* Piano */,
        soundfont: "pad_3_polysynth",
        lilypond: "pad 3 (polysynth)",
        program: 90
    },
    {
        name: "Pad 4 (choir)",
        shortName: "Pad 4",
        clef: 4 /* Piano */,
        soundfont: "pad_4_choir",
        lilypond: "pad 4 (choir)",
        program: 91
    },
    {
        name: "Pad 5 (bowed)",
        shortName: "Pad 5",
        clef: 4 /* Piano */,
        soundfont: "pad_5_bowed",
        lilypond: "pad 5 (bowed)",
        program: 92
    },
    {
        name: "Pad 6 (metallic)",
        shortName: "Pad y",
        clef: 4 /* Piano */,
        soundfont: "pad_6_metallic",
        lilypond: "pad 6 (metallic)",
        program: 93
    },
    {
        name: "Pad 7 (halo)",
        shortName: "Pad 7",
        clef: 4 /* Piano */,
        soundfont: "pad_7_halo",
        lilypond: "pad 7 (halo)",
        program: 94
    },
    {
        name: "Pad 8 (sweep)",
        shortName: "Pad 8",
        clef: 4 /* Piano */,
        soundfont: "pad_8_sweep",
        lilypond: "pad 8 (sweep)",
        program: 95
    },
    {
        name: "FX 1 (rain)",
        shortName: "FX 1",
        clef: 0 /* Treble */,
        soundfont: "fx_1_rain",
        lilypond: "fx 1 (rain)",
        program: 96
    },
    {
        name: "FX 2 (soundtrack)",
        shortName: "FX 2",
        clef: 0 /* Treble */,
        soundfont: "fx_2_soundtrack",
        lilypond: "fx 2 (soundtrack)",
        program: 97
    },
    {
        name: "FX 3 (crystal)",
        shortName: "FX 3",
        clef: 0 /* Treble */,
        soundfont: "fx_3_crystal",
        lilypond: "fx 3 (crystal)",
        program: 98
    },
    {
        name: "FX 4 (atmosphere)",
        shortName: "FX 4",
        soundfont: "fx_4_atmosphere",
        lilypond: "fx 4 (atmosphere)",
        clef: 0 /* Treble */,
        program: 99
    },
    {
        name: "FX 5 (brightness)",
        shortName: "FX 5",
        soundfont: "fx_5_brightness",
        lilypond: "fx 5 (brightness)",
        clef: 0 /* Treble */,
        program: 100
    },
    {
        name: "FX 6 (goblins)",
        shortName: "FX 6",
        soundfont: "fx_6_goblins",
        lilypond: "fx 6 (goblins)",
        clef: 0 /* Treble */,
        program: 101
    },
    {
        name: "FX 7 (echoes)",
        shortName: "FX 7",
        soundfont: "fx_7_echoes",
        lilypond: "fx 7 (echoes)",
        clef: 0 /* Treble */,
        program: 102
    },
    {
        name: "FX 8 (sci-fi)",
        shortName: "FX 8",
        soundfont: "fx_8_scifi",
        lilypond: "fx 8 (scifi)",
        clef: 0 /* Treble */,
        program: 103
    },
    {
        name: "Sitar",
        shortName: "Sitar",
        soundfont: "sitar",
        lilypond: "sitar",
        clef: 0 /* Treble */,
        program: 104
    },
    {
        name: "Banjo",
        soundfont: "banjo",
        shortName: "Banjo",
        lilypond: "banjo",
        clef: 0 /* Treble */,
        program: 105
    },
    {
        name: "Shamisen",
        shortName: "Shamisen",
        soundfont: "shamisen",
        lilypond: "shamisen",
        clef: 0 /* Treble */,
        program: 106
    },
    {
        name: "Koto",
        shortName: "Koto",
        soundfont: "koto",
        lilypond: "koto",
        clef: 0 /* Treble */,
        program: 107
    },
    {
        name: "Kalimba",
        shortName: "Kalimba",
        soundfont: "kalimba",
        lilypond: "kalimba",
        clef: 0 /* Treble */,
        program: 108
    },
    {
        name: "Bag pipe",
        shortName: "Bag Pipe",
        soundfont: "bag_pipe",
        lilypond: "bagpipe",
        clef: 0 /* Treble */,
        program: 109
    },
    {
        name: "Fiddle",
        shortName: "Fiddle",
        soundfont: "fiddle",
        lilypond: "fiddle",
        clef: 0 /* Treble */,
        program: 110
    },
    {
        name: "Shanai",
        shortName: "Shanai",
        soundfont: "shanai",
        lilypond: "shanai",
        clef: 0 /* Treble */,
        program: 111
    },
    {
        name: "Tinkle Bell",
        shortName: "Tl. Bell",
        soundfont: "tinkle_bell",
        lilypond: "tinkle bell",
        clef: 0 /* Treble */,
        program: 112
    },
    {
        name: "Agogo",
        shortName: "Agogo",
        soundfont: "agogo",
        lilypond: "agogo",
        clef: 6 /* TrebleDrums */,
        program: 113
    },
    {
        name: "Steel Drums",
        shortName: "Steel Drums",
        soundfont: "steel_drums",
        lilypond: "steel drums",
        clef: 0 /* Treble */,
        program: 114
    },
    {
        name: "Woodblock",
        shortName: "Woodblock",
        soundfont: "woodblock",
        lilypond: "woodblock",
        clef: 6 /* TrebleDrums */,
        program: 115
    },
    {
        name: "Taiko Drum",
        shortName: "Taiko Drum",
        soundfont: "taiko_drum",
        lilypond: "taiko drum",
        clef: 6 /* TrebleDrums */,
        program: 116
    },
    {
        name: "Melodic Tom",
        shortName: "Melodic Tom",
        soundfont: "melodic_tom",
        lilypond: "melodic tom",
        clef: 0 /* Treble */,
        program: 117
    },
    {
        name: "Synth Drum",
        shortName: "Synth Drum",
        soundfont: "synth_drum",
        lilypond: "synth drum",
        clef: 6 /* TrebleDrums */,
        program: 118
    },
    {
        name: "Reverse Cymbal",
        shortName: "Reverse Cymbal",
        soundfont: "reverse_cymbal",
        lilypond: "reverse cymbal",
        clef: 6 /* TrebleDrums */,
        program: 119
    },
    {
        name: "Guitar Fret Noise",
        shortName: "Guitar Fret",
        soundfont: "guitar_fret_noise",
        lilypond: "guitar fret noise",
        clef: 6 /* TrebleDrums */,
        program: 120
    },
    {
        name: "Breath Noise",
        shortName: "Breath",
        soundfont: "breath_noise",
        lilypond: "breath noise",
        clef: 6 /* TrebleDrums */,
        program: 121
    },
    {
        name: "Seashore",
        shortName: "Seashore",
        soundfont: "seashore",
        lilypond: "seashore",
        clef: 6 /* TrebleDrums */,
        program: 122
    },
    {
        name: "Bird Tweet",
        shortName: "Tweet",
        soundfont: "bird_tweet",
        lilypond: "bird tweet",
        clef: 6 /* TrebleDrums */,
        program: 123
    },
    {
        name: "Telephone Ring",
        shortName: "Telephone",
        soundfont: "telephone_ring",
        lilypond: "telephone ring",
        clef: 6 /* TrebleDrums */,
        program: 124
    },
    {
        name: "Helicopter",
        shortName: "Helicopter",
        soundfont: "helicopter",
        lilypond: "helicopter",
        clef: 6 /* TrebleDrums */,
        program: 125
    },
    {
        name: "Applause",
        shortName: "Applause",
        clef: 6 /* TrebleDrums */,
        soundfont: "applause",
        lilypond: "applause",
        program: 126
    },
    {
        name: "Gunshot",
        shortName: "Gunshot",
        clef: 6 /* TrebleDrums */,
        soundfont: "gunshot",
        lilypond: "gunshot",
        program: 127
    }
];
exports.byLilypondName = _.indexBy(exports.List, "lilypond");
exports.soundfontToProgram = _.reduce(_.indexBy(exports.List, "soundfont"), function (memo, obj, soundfont) {
    memo[soundfont] = obj.program;
    return memo;
}, {});
