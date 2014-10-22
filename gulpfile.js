var browserify = require("browserify");
var exit = require("gulp-exit");
var gulp = require("gulp");
var gutil = require("gulp-util");
var path = require("path");
var source = require("vinyl-source-stream");
var spawn = require("child_process").spawn;
var streamify = require("gulp-streamify");
var tslint = require("gulp-tslint");
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

var files = {};
files.ts = path.join(__dirname, "src", "**", "*.ts");

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

gulp.task("cli-test-daemon", ["create-test-suite"], function() {
    buildAndRunTest(true);
});

gulp.task("cli-test-once", ["lint", "create-test-suite"], function() {
    buildAndRunTest(false);
});

gulp.task("gui-test-once", ["lint", "create-test-suite"], function() {
    buildAndRunTest(false, true);
});

gulp.task("gui-test-daemon", ["create-test-suite"], function() {
    buildAndRunTest(true, true);
});

function buildAndRunTest(daemonize, karmalize) {
    var bundler = watchify(browserify({entries: "./build/suite.js", debug: true}, browserifyOpts));
    if (daemonize) {
        bundler.on("update", retest);
    }

    function retest() {
        console.log("Streaming test...");
        try {
            var stream = bundler.bundle()
                .pipe(source("deps.min.js"))
                .pipe(gulp.dest("build"))
                .pipe(streamify(jasmine({includeStackTrace: true})));

            if (karmalize) {
                stream = stream
                    .pipe(karma({
                        configFile: "karma.conf.js",
                        action: "run",
                        autoWatch: false,
                        singleRun: true,
                        dieOnError: true
                    }))
                    .on("error", gutil.log.bind(gutil, "Test Error"));
            }
            if (!daemonize) {
                stream = stream
                    .pipe(exit());
            }
            return stream;
        } catch(err) {
            console.log(err);
        }
    }

    return retest();
};


gulp.task("create-test-suite", function() {
    // TODO: Remove es5-shim when we upgrade to PhantomJS 2.
    return gulp.src(["node_modules/es5-shim/es5-shim.js", "src/**/test/*.ts"])
        .pipe(generateSuite({addPrefix: "../test"}))
        .pipe(concat("suite.js"))
        .pipe(gulp.dest("build"));
});

gulp.task("lint", function() {
    return gulp.src(files.ts)
        .pipe(tslint())
        .pipe(tslint.report("verbose", {
            emitError: false
        }));
});

gulp.task("build", ["cli-test-once"], function() {
    return browserify("./src/main.ts", browserifyOptsProd).bundle()
        .on("error", gutil.log.bind(gutil, "Browserify Error"))
        .on("end", gutil.log.bind(gutil, "Built bundle"))
        .pipe(source("browser-bundle.js"))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest("./build"));
});
