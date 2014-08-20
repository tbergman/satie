/**
 * A React component to redirect from one page to another, running onRedirect() directly
 * before doing so.
 */

import React = require("react");
import _ = require("lodash");

var Router = require("react-router-component");
var Location = Router.Location;

export var Redirect = function(props : Props) {
    var Handler = React.createClass({
        mixins: [Router.NavigatableMixin],

        componentDidMount: function() {
            props.onRedirect && props.onRedirect(location.pathname);
            _.defer(function() { this.navigate(props.to, {replace: true}) }.bind(this));
        },
        render: function() {
            return React.DOM.i();
        }
    });
    return Location({
        path: props.path,
        handler: Handler});
}

export interface Props {
    /**
     * Function called directly before redirecting.
     */
    onRedirect?: (prevPage: string) => void;

    /**
     * Page to redirect to.
     */
    to: string;

    /**
     * Current page
     */
    path: string;
};
