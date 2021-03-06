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
        clef: C.Clef.Piano,
        shortName: "Piano",
        soundfont: "acoustic_grand_piano",
        lilypond: "acoustic grand",
        program: 0
    },
    {

        name: "Bright Acoustic Piano",
        clef: C.Clef.Piano,
        shortName: "Piano",
        soundfont: "bright_acoustic_piano",
        lilypond: "bright acoustic",
        program: 1
    },
    {
        name: "Electric Grand Piano",
        clef: C.Clef.Piano,
        shortName: "Piano",
        soundfont: "electric_grand_piano",
        lilypond: "electric grand",
        program: 2
    },
    {
        name: "Honky-tonk Piano",
        clef: C.Clef.Piano,
        shortName: "HT Piano",
        soundfont: "honytonk_piano",
        lilypond: "honky-tonk",
        program: 3
    },
    {
        name: "Electric Piano 1",
        clef: C.Clef.Piano,
        shortName: "E Piano",
        soundfont: "electric_piano_1",
        lilypond: "electric piano 1",
        program: 4
    },
    {
        name: "Electric Piano 2",
        clef: C.Clef.Piano,
        shortName: "E Piano",
        soundfont: "electric_piano_2",
        lilypond: "electric piano 2",
        program: 5
    },
    {
        name: "Harpsichord",
        clef: C.Clef.Piano,
        shortName: "Harpsichord",
        soundfont: "harpsichord",
        lilypond: "harpsichord",
        program: 6
    },
    {
        name: "Clavi",
        clef: C.Clef.Piano,
        shortName: "Clavi",
        soundfont: "clavichord",
        lilypond: "clav",
        program: 7
    },
    {
        name: "Celesta",
        shortName: "Celesta",
        clef: C.Clef.Piano,
        soundfont: "celesta",
        lilypond: "celesta",
        program: 8
    },
    {
        name: "Glockenspiel",
        shortName: "Glockenspiel",
        clef: C.Clef.Treble,
        soundfont: "glockenspiel",
        lilypond: "glockenspiel",
        program: 9
    },
    {
        name: "Music Box",
        shortName: "Music Box",
        clef: C.Clef.Treble,
        soundfont: "music_box",
        lilypond: "music box",
        program: 10
    },
    {
        name: "Vibraphone",
        shortName: "Vibraphone",
        clef: C.Clef.Treble,
        soundfont: "vibraphone",
        lilypond: "vibraphone",
        program: 11
    },
    {
        name: "Marimba",
        shortName: "Marimba",
        clef: C.Clef.Piano,
        soundfont: "marimba",
        lilypond: "marimba",
        program: 12
    },
    {
        name: "Xylophone",
        shortName: "Xylophone",
        clef: C.Clef.Treble,
        soundfont: "xylophone",
        lilypond: "xylophone",
        program: 13
    },
    {
        name: "Tubular Bells",
        shortName: "Bells",
        clef: C.Clef.Treble,
        soundfont: "tubular_bells",
        lilypond: "tubular bells",
        program: 14
    },
    {
        name: "Dulcimer",
        shortName: "Dulcimer",
        clef: C.Clef.Treble,
        soundfont: "dulcimer",
        lilypond: "dulcimer",
        program: 15
    },
    {
        name: "Drawbar Organ",
        shortName: "Organ",
        clef: C.Clef.Piano,
        soundfont: "drawbar_organ",
        lilypond: "drawbar organ",
        program: 16
    },
    {
        name: "Percussive Organ",
        shortName: "Organ",
        clef: C.Clef.Piano,
        soundfont: "percussive_organ",
        lilypond: "percussive organ",
        program: 17
    },
    {
        name: "Rock Organ",
        shortName: "Organ",
        clef: C.Clef.Piano,
        soundfont: "rock_organ",
        lilypond: "rock organ",
        program: 18
    },
    {
        name: "Church Organ",
        shortName: "Organ",
        clef: C.Clef.Piano,
        soundfont: "church_organ",
        lilypond: "church organ",
        program: 19
    },
    {
        name: "Reed Organ",
        shortName: "Organ",
        clef: C.Clef.Piano,
        soundfont: "reed_organ",
        lilypond: "reed organ",
        program: 20
    },
    {
        name: "Accordion",
        shortName: "Accordion",
        clef: C.Clef.Piano,
        soundfont: "accordion",
        lilypond: "accordion",
        program: 21
    },
    {
        name: "Tango Accordion",
        shortName: "Accordion",
        clef: C.Clef.Piano,
        soundfont: "tango_accordion",
        lilypond: "concertina",
        program: 23
    },
    {
        name: "Harmonica",
        shortName: "Harmonica",
        clef: C.Clef.Treble,
        soundfont: "harmonica",
        lilypond: "harmonica",
        program: 22
    },
    {
        name: "Acoustic Guitar (nylon)",
        shortName: "Acc. Guitar",
        clef: C.Clef.Treble,
        soundfont: "acoustic_guitar_nylon",
        lilypond: "acoustic guitar (nylon)",
        program: 24
    },
    {
        name: "Acoustic Guitar (steel)",
        shortName: "Acc. Guitar",
        clef: C.Clef.Treble,
        soundfont: "acoustic_guitar_steel",
        lilypond: "acoustic guitar (steel)",
        program: 25
    },
    {
        name: "Electric Guitar (jazz)",
        shortName: "E Guitar",
        clef: C.Clef.Treble,
        soundfont: "acoustic_guitar_jazz",
        lilypond: "acoustic guitar (jazz)",
        program: 26
    },
    {
        name: "Electric Guitar (clean)",
        shortName: "E Guitar",
        clef: C.Clef.Treble,
        soundfont: "electric_guitar_clean",
        lilypond: "acoustic guitar (clean)",
        program: 27
    },
    {
        name: "Electric Guitar (muted)",
        shortName: "E Guitar",
        clef: C.Clef.Treble,
        soundfont: "electric_guitar_muted",
        lilypond: "acoustic guitar (muted)",
        program: 28
    },
    {
        name: "Overdriven Guitar",
        shortName: "E Guitar",
        clef: C.Clef.Treble,
        soundfont: "overdriven_guitar",
        lilypond: "overdriven guitar",
        program: 29
    },
    {
        name: "Distortion Guitar",
        shortName: "E Guitar",
        clef: C.Clef.Treble,
        soundfont: "distortion_guitar",
        lilypond: "distortion guitar",
        program: 30
    },
    {
        name: "Guitar harmonics",
        shortName: "Guitar Harm.",
        clef: C.Clef.Treble,
        soundfont: "guitar_harmonics",
        lilypond: "guitar harmonics",
        program: 31
    },
    {
        name: "Acoustic Bass",
        shortName: "Bass",
        clef: C.Clef.Bass,
        soundfont: "acoustic_bass",
        lilypond: "acoustic bass",
        program: 32
    },
    {
        name: "Electric Bass (finger)",
        shortName: "E. Bass",
        clef: C.Clef.Bass,
        soundfont: "electric_bass_finger",
        lilypond: "electric bass (finger)",
        program: 33
    },
    {
        name: "Electric Bass (pick)",
        shortName: "E. Bass",
        clef: C.Clef.Bass,
        soundfont: "electric_bass_pick",
        lilypond: "electric bass (pick)",
        program: 34
    },
    {
        name: "Fretless Bass",
        shortName: "Fretless Bass",
        clef: C.Clef.Bass,
        soundfont: "fretless_bass",
        lilypond: "fretless bass",
        program: 35
    },
    {
        name: "Slap Bass 1",
        shortName: "Slap Bass",
        clef: C.Clef.Bass,
        soundfont: "slap_bass_1",
        lilypond: "slap bass 1",
        program: 36
    },
    {
        name: "Slap Bass 2",
        shortName: "Slap Bass",
        clef: C.Clef.Bass,
        soundfont: "slap_bass_2",
        lilypond: "slap bass 2",
        program: 37
    },
    {
        name: "Synth Bass 1",
        shortName: "Synth Bass",
        clef: C.Clef.Bass,
        soundfont: "synth_bass_1",
        lilypond: "synth bass 1",
        program: 38
    },
    {
        name: "Synth Bass 2",
        shortName: "Synth Bass",
        clef: C.Clef.Bass,
        soundfont: "synth_bass_2",
        lilypond: "synth bass 2",
        program: 39
    },
    {
        name: "Violin",
        shortName: "Violin",
        clef: C.Clef.Treble,
        soundfont: "violin",
        lilypond: "violin",
        program: 40
    },
    {
        name: "Viola",
        shortName: "Viola",
        clef: C.Clef.Alto,
        soundfont: "viola",
        lilypond: "viola",
        program: 41
    },
    {
        name: "Cello",
        shortName: "Cello",
        clef: C.Clef.Bass,
        soundfont: "cello",
        lilypond: "cello",
        program: 42
    },
    {
        name: "Contrabass",
        shortName: "Bass",
        clef: C.Clef.Bass,
        soundfont: "contrabass",
        lilypond: "contrabass",
        program: 43
    },
    {
        name: "Tremolo Strings",
        shortName: "Strings",
        clef: C.Clef.Choral,
        soundfont: "tremolo_strings",
        lilypond: "tremolo strings",
        program: 44
    },
    {
        name: "Pizzicato Strings",
        shortName: "Pizz. Strings",
        clef: C.Clef.Choral,
        soundfont: "pizzicato_strings",
        lilypond: "pizzicato strings",
        program: 45
    },
    {
        name: "Orchestral Harp",
        shortName: "Harp",
        clef: C.Clef.Piano, // or treble.
        soundfont: "orchestral_harp",
        lilypond: "orchestral harp",
        program: 46
    },
    {
        name: "Timpani",
        shortName: "Timpani",
        clef: C.Clef.Bass,
        soundfont: "timpani",
        lilypond: "timpani",
        program: 47
    },
    {
        name: "String Ensemble 1",
        shortName: "Strings",
        clef: C.Clef.Piano,
        soundfont: "string_ensemble_1",
        lilypond: "string ensemble 1",
        program: 48
    },
    {
        name: "String Ensemble 2",
        shortName: "Strings",
        clef: C.Clef.Piano,
        soundfont: "string_ensemble_2",
        lilypond: "string ensemble 2",
        program: 49
    },
    {
        name: "SynthStrings 1",
        shortName: "Synth Strings",
        clef: C.Clef.Piano,
        soundfont: "synthstrings_1",
        lilypond: "synthstrings 1",
        program: 50
    },
    {
        name: "SynthStrings 2",
        shortName: "Synth Strings",
        clef: C.Clef.Piano,
        soundfont: "synthstrings_2",
        lilypond: "synthstrings 2",
        program: 51
    },
    {
        name: "Choir Aahs",
        shortName: "Choir",
        clef: C.Clef.Choral,
        soundfont: "choir_aahs",
        lilypond: "choir aahs",
        program: 52
    },
    {
        name: "Voice Oohs",
        shortName: "Choir",
        clef: C.Clef.Choral,
        soundfont: "voice_oohs",
        lilypond: "voice oohs",
        program: 53
    },
    {
        name: "Synth Voice",
        shortName: "Voice",
        clef: C.Clef.Choral,
        soundfont: "synth_voice",
        lilypond: "synth voice",
        program: 54
    },
    {
        name: "Orchestra Hit",
        shortName: "Orch. Hit",
        clef: C.Clef.Piano,
        soundfont: "orchestra_hit",
        lilypond: "orchestra hit",
        program: 55
    },
    {
        name: "Trumpet",
        shortName: "Trumpet",
        clef: C.Clef.Treble,
        soundfont: "trumpet",
        lilypond: "trumpet",
        program: 56
    },
    {
        name: "Muted Trumpet",
        shortName: "Muted Trumpet",
        clef: C.Clef.Treble,
        soundfont: "muted_trumpet",
        lilypond: "muted trumpet",
        program: 59
    },
    {
        name: "Trombone",
        shortName: "Trombone",
        clef: C.Clef.Bass,
        soundfont: "trombone",
        lilypond: "trombone",
        program: 57
    },
    {
        name: "Tenor Trombone",
        shortName: "Tnr. Trbne.",
        clef: C.Clef.Tenor, // Sometimes TREBLE with Bb transposition, which is the same as TENOR
        soundfont: "trombone",
        lilypond: "trombone<tenor>",
        program: 57
    },
    {
        name: "Tuba",
        shortName: "Tuba",
        clef: C.Clef.Bass,
        soundfont: "tuba",
        lilypond: "tuba",
        program: 58
    },
    {
        name: "French Horn",
        shortName: "F. Horn",
        clef: C.Clef.Treble,
        soundfont: "french_horn",
        lilypond: "french horn",
        program: 60
    },
    {
        name: "French Horn (Bass)",
        shortName: "Bs. F. Horn",
        clef: C.Clef.Bass,
        soundfont: "french_horn",
        lilypond: "french horn<bass>",
        program: 60
    },
    {
        name: "Brass Section",
        shortName: "Brass",
        clef: C.Clef.Choral,
        soundfont: "brass_section",
        lilypond: "brass section",
        program: 61
    },
    {
        name: "SynthBrass 1",
        shortName: "Synth Brass",
        clef: C.Clef.Piano,
        soundfont: "synthbrass_1",
        lilypond: "synthbrass 1",
        program: 62
    },
    {
        name: "SynthBrass 2",
        shortName: "Synth Brass",
        clef: C.Clef.Piano,
        soundfont: "synthbrass_2",
        lilypond: "synthbrass 2",
        program: 63
    },
    {
        name: "Soprano Sax",
        shortName: "S. Sax",
        clef: C.Clef.Treble,
        soundfont: "soprano_sax",
        lilypond: "soprano sax",
        program: 64
    },
    {
        name: "Alto Sax",
        shortName: "A. Sax",
        clef: C.Clef.Treble,
        soundfont: "alto_sax",
        lilypond: "alto sax",
        program: 65
    },
    {
        name: "Tenor Sax",
        shortName: "T. Sax",
        clef: C.Clef.Treble,
        soundfont: "tenor_sax",
        lilypond: "tenor sax",
        program: 66
    },
    {
        name: "Baritone Sax",
        shortName: "B. Sax",
        clef: C.Clef.Treble,
        soundfont: "baritone_sax",
        lilypond: "baritone sax",
        program: 67
    },
    {
        name: "Oboe",
        shortName: "Oboe",
        clef: C.Clef.Treble,
        soundfont: "oboe",
        lilypond: "oboe",
        program: 68
    },
    {
        name: "English Horn",
        shortName: "E. Horn",
        clef: C.Clef.Treble,
        soundfont: "english_horn",
        lilypond: "english horn",
        program: 69
    },
    {
        name: "Bassoon",
        shortName: "Bassoon",
        clef: C.Clef.Bass,
        soundfont: "bassoon",
        lilypond: "bassoon",
        program: 70
    },
    {
        name: "Bassoon (tenor)",
        shortName: "Bassoon",
        clef: C.Clef.Tenor,
        soundfont: "bassoon",
        lilypond: "bassoon",
        program: 70
    },
    {
        name: "Clarinet",
        shortName: "Clarinet",
        clef: C.Clef.Treble,
        soundfont: "clarinet",
        lilypond: "clarinet",
        program: 71
    },
    {
        name: "Bass Clarinet",
        shortName: "B. Clarinet",
        clef: C.Clef.Bass,
        soundfont: "clarinet",
        lilypond: "clarinet",
        program: 71
    },
    {
        name: "Piccolo",
        shortName: "Piccolo",
        clef: C.Clef.Treble,
        soundfont: "piccolo",
        lilypond: "piccolo",
        program: 72
    },
    {
        name: "Flute",
        shortName: "Flute",
        clef: C.Clef.Treble,
        soundfont: "flute",
        lilypond: "flute",
        program: 73
    },
    {
        name: "Recorder",
        shortName: "Recorder",
        clef: C.Clef.Treble,
        soundfont: "recorder",
        lilypond: "recorder",
        program: 74
    },
    {
        name: "Pan Flute",
        shortName: "Pan Flute",
        clef: C.Clef.Treble,
        soundfont: "pan_flute",
        lilypond: "pan flute",
        program: 75
    },
    {
        name: "Blown Bottle",
        shortName: "Bottle",
        clef: C.Clef.Treble,
        soundfont: "blown_bottle",
        lilypond: "blown bottle",
        program: 76
    },
    {
        name: "Shakuhachi",
        shortName: "Shakuhachi",
        clef: C.Clef.Treble,
        soundfont: "shakuhachi",
        lilypond: "shakuhachi",
        program: 77
    },
    {
        name: "Whistle",
        shortName: "Whistle",
        clef: C.Clef.Treble,
        soundfont: "whistle",
        lilypond: "whistle",
        program: 78
    },
    {
        name: "Ocarina",
        shortName: "Ocarina",
        clef: C.Clef.Treble,
        soundfont: "ocarina",
        lilypond: "ocarina",
        program: 79
    },
    {
        name: "Lead 1 (square)",
        shortName: "Square",
        clef: C.Clef.Treble,
        soundfont: "lead_1_square",
        lilypond: "lead 1 (square)",
        program: 80
    },
    {
        name: "Lead 2 (sawtooth)",
        shortName: "Sawtooth",
        clef: C.Clef.Treble,
        soundfont: "lead_2_sawtooth",
        lilypond: "lead 2 (sawtooth)",
        program: 81
    },
    {
        name: "Lead 3 (calliope)",
        shortName: "Calliope",
        clef: C.Clef.Treble,
        soundfont: "lead_3_calliope",
        lilypond: "lead 3 (calliope)",
        program: 82
    },
    {
        name: "Lead 4 (chiff)",
        shortName: "Chiff",
        clef: C.Clef.Treble,
        soundfont: "lead_4_chiff",
        lilypond: "lead 4 (chiff)",
        program: 83
    },
    {
        name: "Lead 5 (charang)",
        shortName: "Charang",
        clef: C.Clef.Treble,
        soundfont: "lead_5_charang",
        lilypond: "lead 5 (charang)",
        program: 84
    },
    {
        name: "Lead 6 (voice)",
        shortName: "Voice",
        clef: C.Clef.Treble,
        soundfont: "lead_6_voice",
        lilypond: "lead 6 (voice)",
        program: 85
    },
    {
        name: "Lead 7 (fifths)",
        shortName: "Fifths",
        clef: C.Clef.Treble,
        soundfont: "lead_7_fifths",
        lilypond: "lead 7 (fifths)",
        program: 86
    },
    {
        name: "Lead 8 (bass + lead)",
        shortName: "Bass+Lead",
        clef: C.Clef.Treble,
        soundfont: "lead_8_bass_lead",
        lilypond: "lead 8 (bass+lead)",
        program: 87
    },
    {
        name: "Pad 1 (new age)",
        shortName: "Pad 1",
        clef: C.Clef.Piano,
        soundfont: "pad_1_new_age",
        lilypond: "pad 1 (new age)",
        program: 88
    },
    {
        name: "Pad 2 (warm)",
        shortName: "Pad 2",
        clef: C.Clef.Piano,
        soundfont: "pad_2_warm",
        lilypond: "pad 2 (warm)",
        program: 89
    },
    {
        name: "Pad 3 (polysynth)",
        shortName: "Pad 3",
        clef: C.Clef.Piano,
        soundfont: "pad_3_polysynth",
        lilypond: "pad 3 (polysynth)",
        program: 90
    },
    {
        name: "Pad 4 (choir)",
        shortName: "Pad 4",
        clef: C.Clef.Piano,
        soundfont: "pad_4_choir",
        lilypond: "pad 4 (choir)",
        program: 91
    },
    {
        name: "Pad 5 (bowed)",
        shortName: "Pad 5",
        clef: C.Clef.Piano,
        soundfont: "pad_5_bowed",
        lilypond: "pad 5 (bowed)",
        program: 92
    },
    {
        name: "Pad 6 (metallic)",
        shortName: "Pad y",
        clef: C.Clef.Piano,
        soundfont: "pad_6_metallic",
        lilypond: "pad 6 (metallic)",
        program: 93
    },
    {
        name: "Pad 7 (halo)",
        shortName: "Pad 7",
        clef: C.Clef.Piano,
        soundfont: "pad_7_halo",
        lilypond: "pad 7 (halo)",
        program: 94
    },
    {
        name: "Pad 8 (sweep)",
        shortName: "Pad 8",
        clef: C.Clef.Piano,
        soundfont: "pad_8_sweep",
        lilypond: "pad 8 (sweep)",
        program: 95
    },
    {
        name: "FX 1 (rain)",
        shortName: "FX 1",
        clef: C.Clef.Treble,
        soundfont: "fx_1_rain",
        lilypond: "fx 1 (rain)",
        program: 96
    },
    {
        name: "FX 2 (soundtrack)",
        shortName: "FX 2",
        clef: C.Clef.Treble,
        soundfont: "fx_2_soundtrack",
        lilypond: "fx 2 (soundtrack)",
        program: 97
    },
    {
        name: "FX 3 (crystal)",
        shortName: "FX 3",
        clef: C.Clef.Treble,
        soundfont: "fx_3_crystal",
        lilypond: "fx 3 (crystal)",
        program: 98
    },
    {
        name: "FX 4 (atmosphere)",
        shortName: "FX 4",
        soundfont: "fx_4_atmosphere",
        lilypond: "fx 4 (atmosphere)",
        clef: C.Clef.Treble,
        program: 99
    },
    {
        name: "FX 5 (brightness)",
        shortName: "FX 5",
        soundfont: "fx_5_brightness",
        lilypond: "fx 5 (brightness)",
        clef: C.Clef.Treble,
        program: 100
    },
    {
        name: "FX 6 (goblins)",
        shortName: "FX 6",
        soundfont: "fx_6_goblins",
        lilypond: "fx 6 (goblins)",
        clef: C.Clef.Treble,
        program: 101
    },
    {
        name: "FX 7 (echoes)",
        shortName: "FX 7",
        soundfont: "fx_7_echoes",
        lilypond: "fx 7 (echoes)",
        clef: C.Clef.Treble,
        program: 102
    },
    {
        name: "FX 8 (sci-fi)",
        shortName: "FX 8",
        soundfont: "fx_8_scifi",
        lilypond: "fx 8 (scifi)",
        clef: C.Clef.Treble,
        program: 103
    },
    {
        name: "Sitar",
        shortName: "Sitar",
        soundfont: "sitar",
        lilypond: "sitar",
        clef: C.Clef.Treble,
        program: 104
    },
    {
        name: "Banjo",
        soundfont: "banjo",
        shortName: "Banjo",
        lilypond: "banjo",
        clef: C.Clef.Treble,
        program: 105
    },
    {
        name: "Shamisen",
        shortName: "Shamisen",
        soundfont: "shamisen",
        lilypond: "shamisen",
        clef: C.Clef.Treble,
        program: 106
    },
    {
        name: "Koto",
        shortName: "Koto",
        soundfont: "koto",
        lilypond: "koto",
        clef: C.Clef.Treble,
        program: 107
    },
    {
        name: "Kalimba",
        shortName: "Kalimba",
        soundfont: "kalimba",
        lilypond: "kalimba",
        clef: C.Clef.Treble,
        program: 108
    },
    {
        name: "Bag pipe",
        shortName: "Bag Pipe",
        soundfont: "bag_pipe",
        lilypond: "bagpipe",
        clef: C.Clef.Treble,
        program: 109
    },
    {
        name: "Fiddle",
        shortName: "Fiddle",
        soundfont: "fiddle",
        lilypond: "fiddle",
        clef: C.Clef.Treble,
        program: 110
    },
    {
        name: "Shanai",
        shortName: "Shanai",
        soundfont: "shanai",
        lilypond: "shanai",
        clef: C.Clef.Treble,
        program: 111
    },
    {
        name: "Tinkle Bell",
        shortName: "Tl. Bell",
        soundfont: "tinkle_bell",
        lilypond: "tinkle bell",
        clef: C.Clef.Treble,
        program: 112
    },
    {
        name: "Agogo",
        shortName: "Agogo",
        soundfont: "agogo",
        lilypond: "agogo",
        clef: C.Clef.TrebleDrums,
        program: 113
    },
    {
        name: "Steel Drums",
        shortName: "Steel Drums",
        soundfont: "steel_drums",
        lilypond: "steel drums",
        clef: C.Clef.Treble,
        program: 114
    },
    {
        name: "Woodblock",
        shortName: "Woodblock",
        soundfont: "woodblock",
        lilypond: "woodblock",
        clef: C.Clef.TrebleDrums,
        program: 115
    },
    {
        name: "Taiko Drum",
        shortName: "Taiko Drum",
        soundfont: "taiko_drum",
        lilypond: "taiko drum",
        clef: C.Clef.TrebleDrums,
        program: 116
    },
    {
        name: "Melodic Tom",
        shortName: "Melodic Tom",
        soundfont: "melodic_tom",
        lilypond: "melodic tom",
        clef: C.Clef.Treble,
        program: 117
    },
    {
        name: "Synth Drum",
        shortName: "Synth Drum",
        soundfont: "synth_drum",
        lilypond: "synth drum",
        clef: C.Clef.TrebleDrums,
        program: 118
    },
    {
        name: "Reverse Cymbal",
        shortName: "Reverse Cymbal",
        soundfont: "reverse_cymbal",
        lilypond: "reverse cymbal",
        clef: C.Clef.TrebleDrums,
        program: 119
    },
    {
        name: "Guitar Fret Noise",
        shortName: "Guitar Fret",
        soundfont: "guitar_fret_noise",
        lilypond: "guitar fret noise",
        clef: C.Clef.TrebleDrums,
        program: 120
    },
    {
        name: "Breath Noise",
        shortName: "Breath",
        soundfont: "breath_noise",
        lilypond: "breath noise",
        clef: C.Clef.TrebleDrums,
        program: 121
    },
    {
        name: "Seashore",
        shortName: "Seashore",
        soundfont: "seashore",
        lilypond: "seashore",
        clef: C.Clef.TrebleDrums,
        program: 122
    },
    {
        name: "Bird Tweet",
        shortName: "Tweet",
        soundfont: "bird_tweet",
        lilypond: "bird tweet",
        clef: C.Clef.TrebleDrums,
        program: 123
    },
    {
        name: "Telephone Ring",
        shortName: "Telephone",
        soundfont: "telephone_ring",
        lilypond: "telephone ring",
        clef: C.Clef.TrebleDrums,
        program: 124
    },
    {
        name: "Helicopter",
        shortName: "Helicopter",
        soundfont: "helicopter",
        lilypond: "helicopter",
        clef: C.Clef.TrebleDrums,
        program: 125
    },
    {
        name: "Applause",
        shortName: "Applause",
        clef: C.Clef.TrebleDrums,
        soundfont: "applause",
        lilypond: "applause",
        program: 126
    },
    {
        name: "Gunshot",
        shortName: "Gunshot",
        clef: C.Clef.TrebleDrums,
        soundfont: "gunshot",
        lilypond: "gunshot",
        program: 127
    }
];

/**
 * By lilypond slug. See C.Insturment.lilypond.
 * 
 * This list does not contain duplicated keys. Instead some keys have a keyword in angular brackets
 * appended. When exporting to lilypond, you should omit these keywords and brackets.
 */
export var byLilypondName = _.indexBy(List, "lilypond");

export var soundfontToProgram: { [soundfont: string]: number } =
    _.reduce(_.indexBy(List, "soundfont"),
        function (memo: { [soundfont: string]: number }, obj : C.IInstrument, soundfont: string) {
            memo[soundfont] = obj.program;
            return memo; },
        <{ [soundfont: string]: number }> {});
