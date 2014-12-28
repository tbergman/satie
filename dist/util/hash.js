function hash(str) {
    "use strict";
    var hash = 0;
    var i = 0;
    var chr = 0;
    var len;
    if (str.length === 0) {
        return hash;
    }
    for (i = 0, len = str.length; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}
;
module.exports = hash;
