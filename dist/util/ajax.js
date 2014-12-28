var _ = require("lodash");
var postJSON = function (withCredentials, verb, url, json, onload) {
    if (typeof XMLHttpRequest === "undefined") {
        return;
    }
    if (url.indexOf("/api") === 0 && global.RipienoDesktop) {
        url = "http://ripieno.local:8000" + url;
    }
    var request = new XMLHttpRequest();
    request.open(verb, url);
    request.withCredentials = withCredentials;
    if (json) {
        request.setRequestHeader("Content-Type", "application/json");
    }
    request.onload = function () {
        onload(JSON.parse(request.responseText), request);
    };
    request.onerror = function () {
        onload(null, { status: undefined });
    };
    request.send(JSON.stringify(json));
};
var getJSON = function (withCredentials, url, onload) {
    if (typeof XMLHttpRequest === "undefined") {
        return;
    }
    if (url.indexOf("/api") === 0 && global.RipienoDesktop) {
        url = "http://ripieno.local:8000" + url;
    }
    var request = new XMLHttpRequest();
    request.open("GET", url);
    request.withCredentials = withCredentials;
    request.onload = function () {
        onload(JSON.parse(request.responseText), request);
    };
    request.send();
};
exports.untrusted = {
    postJSON: _.partial(postJSON, false, "POST"),
    putJSON: _.partial(postJSON, false, "PUT"),
    anyJSON: _.partial(postJSON, false),
    getJSON: _.partial(getJSON, false)
};
exports.trusted = {
    postJSON: _.partial(postJSON, true, "POST"),
    putJSON: _.partial(postJSON, true, "PUT"),
    anyJSON: _.partial(postJSON, true),
    getJSON: _.partial(getJSON, true)
};
