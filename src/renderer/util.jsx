module.exports = {
    // In Lylite: #(set-global-staff-size 14)
    rastalToHeight: [
        /* largest is '0' */
        9.2, // educational
        7.9, // educational
        7.4, // piano (uncommon)
        7,   // single stave / piano
        6.5,  // single stave / piano
        6,   // single stave (uncommon) / piano (uncommon)
        5.5, // choral, cue staves, or ossia
        4.8, // choral, cue staves, or ossia
        3.7  // full score
        // Tags from Begind Bars by Elaine Gould, pp. 483
    ],
    mm: (num, fontSize) => num*1.0415/fontSize,
    ptPerMM: 2.842,
    sigmoid: t => 1/(1 + Math.exp(-t))
};
