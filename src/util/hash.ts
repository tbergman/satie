/**
 * Public domain.
 */

function hash(str: string) {
    "use strict";

    var hash = 0;
    var i = 0;
    var chr = 0;
    var len: number;
    if (str.length === 0) {
        return hash;
    }
    for (i = 0, len = str.length; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

export = hash;
