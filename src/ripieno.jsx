/**
 * Contains a router for the main application.
 * Every part of Repieno is rendered through this file.
 *
 * @jsx React.DOM
 */

var React = require('react');
var Router = require('react-router-component');
var _ = require('underscore');
var assert = require('assert');

var AboutPage = require("./landing/about.jsx");
var BlogPage = require("./landing/blog.jsx");
var DiscoverPage = require("./landing/discover.jsx");
var FourOhFour = require("./landing/fourOhFour.jsx");
var HeroPage = require("./landing/heroPage.jsx");
var LibraryPage = require("./landing/libraryPage.jsx");
var ProductPage = require("./landing/products.jsx");
var Redirect = require("./util/redirect.jsx");
var ScalesPage = require("./promos/scales/scales.jsx");
var SessionStore = require("./stores/session.jsx");
var SongEditor = require("./renderer/songEditor.jsx");

var Location = Router.Location;
var Locations = Router.Locations;
var NotFound = Router.NotFound;

if (typeof window !== "undefined") {
    require("./landing/landing.less");
    require("./main.less");
}

var Ripieno = React.createClass({
    render: function() {
        var loggedIn = this.props.session.state === "LoggedIn";

        return <Locations path={this.props.defaultPath} ref="router"
                style={{width: "100%", height: "100%"}}>
            {/* The hero page with the login button */}
            {/* Only available to logged in users */}
            {loggedIn ?
                <Redirect path="/" to="/library" /> :
                <Location path="/"
                    handler={HeroPage}
                    session={this.props.session} />}

            {/* Managing and creating new songs */}
            {/* Currenly you can only see your own library */}
            {loggedIn ?
                <Location path="/library" 
                    handler={LibraryPage}
                    session={this.props.session}
                    songs={this.props.songs} /> :
                <Redirect path="/library*" to="/"
                    onRedirect={(path) => { futurePath = path; }} />}
            {loggedIn ?
                <Location path="/library/:subpage" 
                    handler={LibraryPage}
                    session={this.props.session}
                    songs={this.props.songs} /> :
                <Redirect path="/library*" to="/"
                    onRedirect={(path) => { futurePath = path; }} />}

            {/* See songs from other users. No login required to view. */}
            <Location path="/discover*"
                handler={DiscoverPage}
                session={this.props.session} />

            {/* See songs from other users. No login required to view. */}
            <Location path="/products"
                handler={ProductPage}
                session={this.props.session} />

            {/* The blog. No login required to view. */}
            <Location path="/blog/:post"
                handler={BlogPage}
                session={this.props.session} />
            <Location path="/blog*"
                handler={BlogPage}
                session={this.props.session} />

            {/* The blog. No login required to view. */}
            <Location path="/about"
                handler={AboutPage}
                session={this.props.session} />

            {/* View or edit a song. No login required to view. */}
            <Location path="/songs/:songId"
                activeSong={this.props.activeSong}
                handler={SongEditor}
                session={this.props.session}
                songs={this.props.songs} />

            {/* Scales promo. No login required to view. */}
            <Location path="/scales/:keyName/:type"
                handler={ScalesPage}
                session={this.props.session} />
            <Location path="/scales/:keyName/:type/*"
                handler={ScalesPage}
                session={this.props.session} />

            <Redirect path="/scales" to="/scales/g/major" />
            <Redirect path="/scales/" to="/scales/g/major" />

            <Redirect path="/index.html" to="/" />

            <NotFound handler={FourOhFour}
                session={this.props.session} />
        </Locations>;
    },
    getDefaultProps: function() {
        return {
            errors: SessionStore.errors(),
            session: SessionStore.session(),
            songs: SessionStore.songs()
        };
    },

    componentDidMount: function() {
        SessionStore.addChangeListener(this._onChange);

        "/api/user/start_session".GET();
    },

    componentWillUpdate: function(nextProps, nextState) {
        if (this.props.session.state === "LoggedOut" &&
                nextProps.session.state === "LoggedIn") {

            // futurePath is set when a user requested a page
            // they did not have access to. By logging in, they
            // get access to it.
            var newPath = futurePath || "/library";

            // By replacing the current url, we avoid creating
            // a page that cannot be easily exited.
            this.refs.router.navigate(newPath, {replace: "true"});
        }

        if (this.props.session.state !== "LoggedIn" &&
                nextProps.session.state === "LoggedIn") {
            // This is true in two cases:
            //  1. The user was logged out and is now logged in
            //  2. The page was loading. The user was always logged in.

            // Load all songs in a users library.
            ("/api/song?userId=" + nextProps.session.user._id).GET();
        }
    },
    componentWillUnmount: function() {
        SessionStore.removeChangeListener(this._onChange);
    },

    _onChange: function() {
        // Responde to updates from SessionStore. This follow's Facebook's Flux
        // architecture.
        var errors = SessionStore.errors();
        for (var i = this.props.errors.length; i < errors.length; ++i) {
            console.warn("Error:", errors[i]);
            if (errors[i].redirectTo) {
                var err = errors[i].redirectTo;
                _.defer(() => this.refs.router.navigate(err));
            }
        }

        this.setProps({
            session: SessionStore.session(),
            activeSong: SessionStore.activeSong(),
            songs: SessionStore.songs(),
            errors: errors
        });
    }
});

var futurePath = null;

module.exports = Ripieno;
