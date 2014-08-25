/**
 * @file A React component to redirect from one page to another, running
 * onRedirect() directly before doing so.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import React = require("react");
import _ = require("lodash");

var Router = require("react-router-component");
var Location = Router.Location;

export var Redirect = function(props : IProps) {
    var Handler = React.createClass({
        mixins: [Router.NavigatableMixin],

        componentDidMount: function() {
            props.onRedirect && props.onRedirect(location.pathname);
            _.defer(() => this.navigate(props.to, { replace: true }));
        },
        render: function() {
            return React.DOM.i();
        }
    });
    return Location({
        path: props.path,
        handler: Handler});
}

export interface IProps {
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
