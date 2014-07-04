var _ = require("underscore");

var postJSON = (withCredentials, verb, url, json, onload) => {
    if (url.indexOf("/api") === 0 && global.RipienoDesktop) {
        url = "http://ripieno.local:8000" + url;
    }
    var request = new XMLHttpRequest();
    request.open(verb, url);
    request.withCredentials = withCredentials;
    request.setRequestHeader('Content-Type', 'application/json');
    request.onload = () => onload(JSON.parse(request.responseText), request);
    request.send(JSON.stringify(json));
};

var getJSON = (withCredentials, url, onload) => {
    if (url.indexOf("/api") === 0 && global.RipienoDesktop) {
        url = "http://ripieno.local:8000" + url;
    }
    var request = new XMLHttpRequest();
    request.open("GET", url);
    request.withCredentials = withCredentials;
    request.onload = () => onload(JSON.parse(request.responseText), request);
    request.send();
};

module.exports = {
    untrusted: {
        postJSON: _.partial(postJSON, false, "POST"),
        putJSON: _.partial(postJSON, false, "PUT"),
        anyJSON: _.partial(postJSON, false),
        getJSON: _.partial(getJSON, false)
    },
    trusted: {
        postJSON: _.partial(postJSON, true, "POST"),
        putJSON: _.partial(postJSON, true, "PUT"),
        anyJSON: _.partial(postJSON, true),
        getJSON: _.partial(getJSON, true)
    }
};
