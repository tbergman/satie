var browserify = require("browserify");
var exorcist = require("exorcist");
var gulp = require("gulp");
var gutil = require("gulp-util");
var mocha = require("gulp-mocha");
var source = require("vinyl-source-stream");
var spawn = require("child_process").spawn;
var streamify = require("gulp-streamify");
var uglify = require("gulp-uglify");
var watchify = require("watchify");
var concat = require("gulp-concat");
var jasmine = require('gulp-jasmine');
var karma = require("gulp-karma");
var generateSuite = require("gulp-mocha-browserify-sweet");

var browserifyOpts = {
    extensions: [".ts", ".jsx"],
    debug: true
};

var browserifyOptsProd = {
    extensions: [".ts", ".jsx"]
};


gulp.task("watch", function() {
    var bundler = watchify(browserify("./src/main.ts", browserifyOpts));
    bundler.on("update", rebundle);

    function rebundle(first) {
        return bundler.bundle()
            .on("error", gutil.log.bind(gutil, "Browserify Error"))
            .on("end", gutil.log.bind(gutil, first ? "Built bundle" : "Updated bundle"))
            .pipe(source("browser-bundle.js"))
            .pipe(gulp.dest("./build"));
    }

    var nginx = spawn("nginx", ["-c", "./nginx.conf", "-p", "./nginx"], {cwd: process.cwd()});
    nginx.stderr.on("data", function(data) {
        console.log(data.toString());
    });

    return rebundle(true);
});

gulp.task("test", ["test-suite"], function() {
    var bundler = watchify(browserify({entries: "./build/suite.js", debug: true}, browserifyOpts));
    bundler.on("update", retest);

    function retest() {
        console.log("Retesting...");
        try {
            return bundler.bundle()
                .pipe(source("deps.min.js"))
                .pipe(gulp.dest("build"))
                .pipe(streamify(jasmine({includeStackTrace: true})));
                //.pipe(karma({
                //    configFile: "karma.conf.js",
                //    action: "run",
                //    autoWatch: false,
                //    singleRun: true,
                //    dieOnError: false
                //}))
                //.on("error", gutil.log.bind(gutil, "Test Error"));
        } catch(err) {
            console.log(err);
        }
    }

    return retest();
});

gulp.task("test-suite", function() {
    return gulp.src("src/**/test/*.ts")
        .pipe(generateSuite({addPrefix: "../test"}))
        .pipe(concat("suite.js"))
        .pipe(gulp.dest("build"));
});

gulp.task("build", function() {
    return browserify("./src/main.ts", browserifyOptsProd).bundle()
        .on("error", gutil.log.bind(gutil, "Browserify Error"))
        .on("end", gutil.log.bind(gutil, "Built bundle"))
        .pipe(source("browser-bundle.js"))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest("./build"));
});
