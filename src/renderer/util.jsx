module.exports = {
    rastalToHeight: {
        0: 9.2, // educational
        1: 7.9, // educational
        2: 7.4, // piano (uncommon)
        3: 7,   // single stave / piano
        4: 6.5,  // single stave / piano
        5: 6,   // single stave (uncommon) / piano (uncommon)
        6: 5.5, // choral, cue staves, or ossia
        7: 4.8, // choral, cue staves, or ossia
        8: 3.7  // full score
        // Tags from Begind Bars by Elaine Gould, pp. 483
    },
    //mm: (num, fontSize) => num*1.0415/fontSize
    mm: (num, fontSize) => num*1.0415/fontSize,
    sigmoid: t => 1/(1 + Math.exp(-t))
};
