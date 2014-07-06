/**
 * @jsx React.DOM
 */

var React = require('react');
var Router = require('react-router-component');
var _ = require("lodash");

var Location = Router.Location;

function Redirect(props) {
    var Handler = React.createClass({
        mixins: [Router.NavigatableMixin],

        componentDidMount: function() {
            props.onRedirect && props.onRedirect(location.pathname);
            _.defer(() => this.navigate(props.to, {replace: true}));
        },
        render: function() {
            return <i />;
        }
    });
    return <Location path={props.path} handler={Handler} />;
}

module.exports = Redirect;
