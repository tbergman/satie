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

import _ = require("lodash");

import C = require("./contracts");

/**
 * Instruments to be displayed in partModal.
 * 
 * It is important to note that this is NOT exactly General MIDI
 */
export var List: Array<C.IInstrument> = [
    {
        name: "Acoustic Grand Piano",
        clef: ["g", "f"],
        shortName: "Piano",
        soundfont: "acoustic_grand_piano",
        program: 0
    },
    {

        name: "Bright Acoustic Piano",
        clef: ["g", "f"],
        shortName: "Piano",
        soundfont: "bright_acoustic_piano",
        program: 1
    },
    {
        name: "Electric Grand Piano",
        clef: ["g", "f"],
        shortName: "Piano",
        soundfont: "electric_grand_piano",
        program: 2
    },
    {
        name: "Honky-tonk Piano",
        clef: ["g", "f"],
        shortName: "HT Piano",
        soundfont: "honytonk_piano",
        program: 3
    },
    {
        name: "Electric Piano 1",
        clef: ["g", "f"],
        shortName: "E Piano",
        soundfont: "electric_piano_1",
        program: 4
    },
    {
        name: "Electric Piano 2",
        clef: ["g", "f"],
        shortName: "E Piano",
        soundfont: "electric_piano_2",
        program: 5
    },
    {
        name: "Harpsichord",
        clef: ["g", "f"],
        shortName: "Harpsichord",
        soundfont: "harpsichord",
        program: 6
    },
    {
        name: "Clavi",
        clef: ["g", "f"],
        shortName: "Clavi",
        soundfont: "clavichord",
        program: 7
    },
    {
        name: "Celesta",
        shortName: "Celesta",
        clef: ["g", "f"],
        soundfont: "celesta",
        program: 8
    },
    {
        name: "Glockenspiel",
        shortName: "Glockenspiel",
        clef: ["g"],
        soundfont: "glockenspiel",
        program: 9
    },
    {
        name: "Music Box",
        shortName: "Music Box",
        clef: ["g"],
        soundfont: "music_box",
        program: 10
    },
    {
        name: "Vibraphone",
        shortName: "Vibraphone",
        clef: ["g"],
        soundfont: "vibraphone",
        program: 11
    },
    {
        name: "Marimba",
        shortName: "Marimba",
        clef: ["g", "f"],
        soundfont: "marimba",
        program: 12
    },
    {
        name: "Xylophone",
        shortName: "Xylophone",
        clef: ["g"],
        soundfont: "xylophone",
        program: 13
    },
    {
        name: "Tubular Bells",
        shortName: "Bells",
        clef: ["g"],
        soundfont: "tubular_bells",
        program: 14
    },
    {
        name: "Dulcimer",
        shortName: "Dulcimer",
        clef: ["g"],
        soundfont: "dulcimer",
        program: 15
    },
    {
        name: "Drawbar Organ",
        shortName: "Organ",
        clef: ["g", "f"],
        soundfont: "drawbar_organ",
        program: 16
    },
    {
        name: "Percussive Organ",
        shortName: "Organ",
        clef: ["g", "f"],
        soundfont: "percussive_organ",
        program: 17
    },
    {
        name: "Rock Organ",
        shortName: "Organ",
        clef: ["g", "f"],
        soundfont: "rock_organ",
        program: 18
    },
    {
        name: "Church Organ",
        shortName: "Organ",
        clef: ["g", "f"],
        soundfont: "church_organ",
        program: 19
    },
    {
        name: "Reed Organ",
        shortName: "Organ",
        clef: ["g", "f"],
        soundfont: "reed_organ",
        program: 20
    },
    {
        name: "Accordion",
        shortName: "Accordion",
        clef: ["g", "f"],
        soundfont: "accordion",
        program: 21
    },
    {
        name: "Tango Accordion",
        shortName: "Accordion",
        clef: ["g", "f"],
        soundfont: "tango_accordion",
        program: 23
    },
    {
        name: "Harmonica",
        shortName: "Harmonica",
        clef: ["g"],
        soundfont: "harmonica",
        program: 22
    },
    {
        name: "Acoustic Guitar (nylon)",
        shortName: "Acc. Guitar",
        clef: ["g"],
        soundfont: "acoustic_guitar_nylon",
        program: 24
    },
    {
        name: "Acoustic Guitar (steel)",
        shortName: "Acc. Guitar",
        clef: ["g"],
        soundfont: "acoustic_guitar_steel",
        program: 25
    },
    {
        name: "Electric Guitar (jazz)",
        shortName: "E Guitar",
        clef: ["g"],
        soundfont: "acoustic_guitar_jazz",
        program: 26
    },
    {
        name: "Electric Guitar (clean)",
        shortName: "E Guitar",
        clef: ["g"],
        soundfont: "electric_guitar_clean",
        program: 27
    },
    {
        name: "Electric Guitar (muted)",
        shortName: "E Guitar",
        clef: ["g"],
        soundfont: "electric_guitar_muted",
        program: 28
    },
    {
        name: "Overdriven Guitar",
        shortName: "E Guitar",
        clef: ["g"],
        soundfont: "overdriven_guitar",
        program: 29
    },
    {
        name: "Distortion Guitar",
        shortName: "E Guitar",
        clef: ["g"],
        soundfont: "distortion_guitar",
        program: 30
    },
    {
        name: "Guitar harmonics",
        shortName: "Guitar Harm.",
        clef: ["g"],
        soundfont: "guitar_harmonics",
        program: 31
    },
    {
        name: "Acoustic Bass",
        shortName: "Bass",
        clef: ["f"],
        soundfont: "acoustic_bass",
        program: 32
    },
    {
        name: "Electric Bass (finger)",
        shortName: "E. Bass",
        clef: ["f"],
        soundfont: "electric_bass_finger",
        program: 33
    },
    {
        name: "Electric Bass (pick)",
        shortName: "E. Bass",
        clef: ["f"],
        soundfont: "electric_bass_pick",
        program: 34
    },
    {
        name: "Fretless Bass",
        shortName: "Fretless Bass",
        clef: ["f"],
        soundfont: "fretless_bass",
        program: 35
    },
    {
        name: "Slap Bass 1",
        shortName: "Slap Bass",
        clef: ["f"],
        soundfont: "slap_bass_1",
        program: 36
    },
    {
        name: "Slap Bass 2",
        shortName: "Slap Bass",
        clef: ["f"],
        soundfont: "slap_bass_2",
        program: 37
    },
    {
        name: "Synth Bass 1",
        shortName: "Synth Bass",
        clef: ["f"],
        soundfont: "synth_bass_1",
        program: 38
    },
    {
        name: "Synth Bass 2",
        shortName: "Synth Bass",
        clef: ["f"],
        soundfont: "synth_bass_2",
        program: 39
    },
    {
        name: "Violin",
        shortName: "Violin",
        clef: ["g"],
        soundfont: "violin",
        program: 40
    },
    {
        name: "Viola",
        shortName: "Viola",
        clef: ["c"],
        soundfont: "viola",
        program: 41
    },
    {
        name: "Cello",
        shortName: "Cello",
        clef: ["f"],
        soundfont: "cello",
        program: 42
    },
    {
        name: "Contrabass",
        shortName: "Bass",
        clef: ["f"],
        soundfont: "contrabass",
        program: 43
    },
    {
        name: "Tremolo Strings",
        shortName: "Strings",
        clef: ["g", "f"],
        soundfont: "tremolo_strings",
        program: 44
    },
    {
        name: "Pizzicato Strings",
        shortName: "Pizz. Strings",
        clef: ["g", "f"],
        soundfont: "pizzicato_strings",
        program: 45
    },
    {
        name: "Orchestral Harp",
        shortName: "Harp",
        clef: ["g", "f"], // or treble.
        soundfont: "orchestral_harp",
        program: 46
    },
    {
        name: "Timpani",
        shortName: "Timpani",
        clef: ["f"],
        soundfont: "timpani",
        program: 47
    },
    {
        name: "String Ensemble 1",
        shortName: "Strings",
        clef: ["g", "f"],
        soundfont: "string_ensemble_1",
        program: 48
    },
    {
        name: "String Ensemble 2",
        shortName: "Strings",
        clef: ["g", "f"],
        soundfont: "string_ensemble_2",
        program: 49
    },
    {
        name: "SynthStrings 1",
        shortName: "Synth Strings",
        clef: ["g", "f"],
        soundfont: "synthstrings_1",
        program: 50
    },
    {
        name: "SynthStrings 2",
        shortName: "Synth Strings",
        clef: ["g", "f"],
        soundfont: "synthstrings_2",
        program: 51
    },
    {
        name: "Choir Aahs",
        shortName: "Choir",
        clef: ["g", "f"],
        soundfont: "choir_aahs",
        program: 52
    },
    {
        name: "Voice Oohs",
        shortName: "Choir",
        clef: ["g", "f"],
        soundfont: "voice_oohs",
        program: 53
    },
    {
        name: "Synth Voice",
        shortName: "Voice",
        clef: ["g", "f"],
        soundfont: "synth_voice",
        program: 54
    },
    {
        name: "Orchestra Hit",
        shortName: "Orch. Hit",
        clef: ["g", "f"],
        soundfont: "orchestra_hit",
        program: 55
    },
    {
        name: "Trumpet",
        shortName: "Trumpet",
        clef: ["g"],
        soundfont: "trumpet",
        program: 56
    },
    {
        name: "Muted Trumpet",
        shortName: "Muted Trumpet",
        clef: ["g"],
        soundfont: "muted_trumpet",
        program: 59
    },
    {
        name: "Trombone",
        shortName: "Trombone",
        clef: ["f"],
        soundfont: "trombone",
        program: 57
    },
    {
        name: "Tenor Trombone",
        shortName: "Tnr. Trbne.",
        clef: ["c_tenor"], // Sometimes TREBLE with Bb transposition, which is the same as TENOR
        soundfont: "trombone",
        program: 57
    },
    {
        name: "Tuba",
        shortName: "Tuba",
        clef: ["f"],
        soundfont: "tuba",
        program: 58
    },
    {
        name: "French Horn",
        shortName: "F. Horn",
        clef: ["g"],
        soundfont: "french_horn",
        program: 60
    },
    {
        name: "French Horn (Bass)",
        shortName: "Bs. F. Horn",
        clef: ["f"],
        soundfont: "french_horn",
        program: 60
    },
    {
        name: "Brass Section",
        shortName: "Brass",
        clef: ["g", "f"],
        soundfont: "brass_section",
        program: 61
    },
    {
        name: "SynthBrass 1",
        shortName: "Synth Brass",
        clef: ["g", "f"],
        soundfont: "synthbrass_1",
        program: 62
    },
    {
        name: "SynthBrass 2",
        shortName: "Synth Brass",
        clef: ["g", "f"],
        soundfont: "synthbrass_2",
        program: 63
    },
    {
        name: "Soprano Sax",
        shortName: "S. Sax",
        clef: ["g"],
        soundfont: "soprano_sax",
        program: 64
    },
    {
        name: "Alto Sax",
        shortName: "A. Sax",
        clef: ["g"],
        soundfont: "alto_sax",
        program: 65
    },
    {
        name: "Tenor Sax",
        shortName: "T. Sax",
        clef: ["g"],
        soundfont: "tenor_sax",
        program: 66
    },
    {
        name: "Baritone Sax",
        shortName: "B. Sax",
        clef: ["g"],
        soundfont: "baritone_sax",
        program: 67
    },
    {
        name: "Oboe",
        shortName: "Oboe",
        clef: ["g"],
        soundfont: "oboe",
        program: 68
    },
    {
        name: "English Horn",
        shortName: "E. Horn",
        clef: ["g"],
        soundfont: "english_horn",
        program: 69
    },
    {
        name: "Bassoon",
        shortName: "Bassoon",
        clef: ["f"],
        soundfont: "bassoon",
        program: 70
    },
    {
        name: "Bassoon (tenor)",
        shortName: "Bassoon",
        clef: ["c_tenor"],
        soundfont: "bassoon",
        program: 70
    },
    {
        name: "Clarinet",
        shortName: "Clarinet",
        clef: ["g"],
        soundfont: "clarinet",
        program: 71
    },
    {
        name: "Bass Clarinet",
        shortName: "B. Clarinet",
        clef: ["f"],
        soundfont: "clarinet",
        program: 71
    },
    {
        name: "Piccolo",
        shortName: "Piccolo",
        clef: ["g"],
        soundfont: "piccolo",
        program: 72
    },
    {
        name: "Flute",
        shortName: "Flute",
        clef: ["g"],
        soundfont: "flute",
        program: 73
    },
    {
        name: "Recorder",
        shortName: "Recorder",
        clef: ["g"],
        soundfont: "recorder",
        program: 74
    },
    {
        name: "Pan Flute",
        shortName: "Pan Flute",
        clef: ["g"],
        soundfont: "pan_flute",
        program: 75
    },
    {
        name: "Blown Bottle",
        shortName: "Bottle",
        clef: ["g"],
        soundfont: "blown_bottle",
        program: 76
    },
    {
        name: "Shakuhachi",
        shortName: "Shakuhachi",
        clef: ["g"],
        soundfont: "shakuhachi",
        program: 77
    },
    {
        name: "Whistle",
        shortName: "Whistle",
        clef: ["g"],
        soundfont: "whistle",
        program: 78
    },
    {
        name: "Ocarina",
        shortName: "Ocarina",
        clef: ["g"],
        soundfont: "ocarina",
        program: 79
    },
    {
        name: "Lead 1 (square)",
        shortName: "Square",
        clef: ["g"],
        soundfont: "lead_1_square",
        program: 80
    },
    {
        name: "Lead 2 (sawtooth)",
        shortName: "Sawtooth",
        clef: ["g"],
        soundfont: "lead_2_sawtooth",
        program: 81
    },
    {
        name: "Lead 3 (calliope)",
        shortName: "Calliope",
        clef: ["g"],
        soundfont: "lead_3_calliope",
        program: 82
    },
    {
        name: "Lead 4 (chiff)",
        shortName: "Chiff",
        clef: ["g"],
        soundfont: "lead_4_chiff",
        program: 83
    },
    {
        name: "Lead 5 (charang)",
        shortName: "Charang",
        clef: ["g"],
        soundfont: "lead_5_charang",
        program: 84
    },
    {
        name: "Lead 6 (voice)",
        shortName: "Voice",
        clef: ["g"],
        soundfont: "lead_6_voice",
        program: 85
    },
    {
        name: "Lead 7 (fifths)",
        shortName: "Fifths",
        clef: ["g"],
        soundfont: "lead_7_fifths",
        program: 86
    },
    {
        name: "Lead 8 (bass + lead)",
        shortName: "Bass+Lead",
        clef: ["g"],
        soundfont: "lead_8_bass_lead",
        program: 87
    },
    {
        name: "Pad 1 (new age)",
        shortName: "Pad 1",
        clef: ["g", "f"],
        soundfont: "pad_1_new_age",
        program: 88
    },
    {
        name: "Pad 2 (warm)",
        shortName: "Pad 2",
        clef: ["g", "f"],
        soundfont: "pad_2_warm",
        program: 89
    },
    {
        name: "Pad 3 (polysynth)",
        shortName: "Pad 3",
        clef: ["g", "f"],
        soundfont: "pad_3_polysynth",
        program: 90
    },
    {
        name: "Pad 4 (choir)",
        shortName: "Pad 4",
        clef: ["g", "f"],
        soundfont: "pad_4_choir",
        program: 91
    },
    {
        name: "Pad 5 (bowed)",
        shortName: "Pad 5",
        clef: ["g", "f"],
        soundfont: "pad_5_bowed",
        program: 92
    },
    {
        name: "Pad 6 (metallic)",
        shortName: "Pad y",
        clef: ["g", "f"],
        soundfont: "pad_6_metallic",
        program: 93
    },
    {
        name: "Pad 7 (halo)",
        shortName: "Pad 7",
        clef: ["g", "f"],
        soundfont: "pad_7_halo",
        program: 94
    },
    {
        name: "Pad 8 (sweep)",
        shortName: "Pad 8",
        clef: ["g", "f"],
        soundfont: "pad_8_sweep",
        program: 95
    },
    {
        name: "FX 1 (rain)",
        shortName: "FX 1",
        clef: ["g"],
        soundfont: "fx_1_rain",
        program: 96
    },
    {
        name: "FX 2 (soundtrack)",
        shortName: "FX 2",
        clef: ["g"],
        soundfont: "fx_2_soundtrack",
        program: 97
    },
    {
        name: "FX 3 (crystal)",
        shortName: "FX 3",
        clef: ["g"],
        soundfont: "fx_3_crystal",
        program: 98
    },
    {
        name: "FX 4 (atmosphere)",
        shortName: "FX 4",
        soundfont: "fx_4_atmosphere",
        clef: ["g"],
        program: 99
    },
    {
        name: "FX 5 (brightness)",
        shortName: "FX 5",
        soundfont: "fx_5_brightness",
        clef: ["g"],
        program: 100
    },
    {
        name: "FX 6 (goblins)",
        shortName: "FX 6",
        soundfont: "fx_6_goblins",
        clef: ["g"],
        program: 101
    },
    {
        name: "FX 7 (echoes)",
        shortName: "FX 7",
        soundfont: "fx_7_echoes",
        clef: ["g"],
        program: 102
    },
    {
        name: "FX 8 (sci-fi)",
        shortName: "FX 8",
        soundfont: "fx_8_scifi",
        clef: ["g"],
        program: 103
    },
    {
        name: "Sitar",
        shortName: "Sitar",
        soundfont: "sitar",
        clef: ["g"],
        program: 104
    },
    {
        name: "Banjo",
        soundfont: "banjo",
        shortName: "Banjo",
        clef: ["g"],
        program: 105
    },
    {
        name: "Shamisen",
        shortName: "Shamisen",
        soundfont: "shamisen",
        clef: ["g"],
        program: 106
    },
    {
        name: "Koto",
        shortName: "Koto",
        soundfont: "koto",
        clef: ["g"],
        program: 107
    },
    {
        name: "Kalimba",
        shortName: "Kalimba",
        soundfont: "kalimba",
        clef: ["g"],
        program: 108
    },
    {
        name: "Bag pipe",
        shortName: "Bag Pipe",
        soundfont: "bag_pipe",
        clef: ["g"],
        program: 109
    },
    {
        name: "Fiddle",
        shortName: "Fiddle",
        soundfont: "fiddle",
        clef: ["g"],
        program: 110
    },
    {
        name: "Shanai",
        shortName: "Shanai",
        soundfont: "shanai",
        clef: ["g"],
        program: 111
    },
    {
        name: "Tinkle Bell",
        shortName: "Tl. Bell",
        soundfont: "tinkle_bell",
        clef: ["g"],
        program: 112
    },
    {
        name: "Agogo",
        shortName: "Agogo",
        soundfont: "agogo",
        clef: ["percussion"],
        program: 113
    },
    {
        name: "Steel Drums",
        shortName: "Steel Drums",
        soundfont: "steel_drums",
        clef: ["g"],
        program: 114
    },
    {
        name: "Woodblock",
        shortName: "Woodblock",
        soundfont: "woodblock",
        clef: ["percussion"],
        program: 115
    },
    {
        name: "Taiko Drum",
        shortName: "Taiko Drum",
        soundfont: "taiko_drum",
        clef: ["percussion"],
        program: 116
    },
    {
        name: "Melodic Tom",
        shortName: "Melodic Tom",
        soundfont: "melodic_tom",
        clef: ["g"],
        program: 117
    },
    {
        name: "Synth Drum",
        shortName: "Synth Drum",
        soundfont: "synth_drum",
        clef: ["percussion"],
        program: 118
    },
    {
        name: "Reverse Cymbal",
        shortName: "Reverse Cymbal",
        soundfont: "reverse_cymbal",
        clef: ["percussion"],
        program: 119
    },
    {
        name: "Guitar Fret Noise",
        shortName: "Guitar Fret",
        soundfont: "guitar_fret_noise",
        clef: ["percussion"],
        program: 120
    },
    {
        name: "Breath Noise",
        shortName: "Breath",
        soundfont: "breath_noise",
        clef: ["percussion"],
        program: 121
    },
    {
        name: "Seashore",
        shortName: "Seashore",
        soundfont: "seashore",
        clef: ["percussion"],
        program: 122
    },
    {
        name: "Bird Tweet",
        shortName: "Tweet",
        soundfont: "bird_tweet",
        clef: ["percussion"],
        program: 123
    },
    {
        name: "Telephone Ring",
        shortName: "Telephone",
        soundfont: "telephone_ring",
        clef: ["percussion"],
        program: 124
    },
    {
        name: "Helicopter",
        shortName: "Helicopter",
        soundfont: "helicopter",
        clef: ["percussion"],
        program: 125
    },
    {
        name: "Applause",
        shortName: "Applause",
        clef: ["percussion"],
        soundfont: "applause",
        program: 126
    },
    {
        name: "Gunshot",
        shortName: "Gunshot",
        clef: ["percussion"],
        soundfont: "gunshot",
        program: 127
    }
];

export var soundfontToProgram: { [soundfont: string]: number } =
    _.reduce(_.indexBy(List, "soundfont"),
        function (memo: { [soundfont: string]: number }, obj : C.IInstrument, soundfont: string) {
            memo[soundfont] = obj.program;
            return memo; },
        <{ [soundfont: string]: number }> {});
