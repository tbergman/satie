var browserify          = require("browserify");
var concat              = require("gulp-concat");
var exec                = require("child_process").exec;
var exit                = require("gulp-exit");
var fs                  = require("fs");
var generateSuite       = require("gulp-mocha-browserify-sweet");
var gulp                = require("gulp");
var gutil               = require("gulp-util");
var jasmine             = require("gulp-jasmine");
var karma               = require("gulp-karma");
var newer               = require("gulp-newer");
var path                = require("path");
var source              = require("vinyl-source-stream");
var spawn               = require("child_process").spawn;
var streamify           = require("gulp-streamify");
var tslint              = require("gulp-tslint");
var typescript          = require("gulp-typescript");
var uglify              = require("gulp-uglify");
var watchify            = require("watchify");

var packageJSON         = require("./package.json");

var browserifyOpts = {
    debug: {
        debug:          false,
        cache:          {},
        packageCache:   {},
        fullPaths:      true
    },
    prod: {
        debug:          false
    }
};

var dirs = {
    build:              path.join(__dirname, ".partialBuild"),
    typings:            path.join(__dirname, "references")
};

var files = {
    ts:                 path.join(__dirname, "src", "**", "*.ts"),
    typings:            path.join(dirs.typings, "*.d.ts"),
    nonTsSources:       path.join(__dirname, "src", "**", "*.{fs,jison,js,json,jsx,less,vs}"),
    allSrc:             path.join(__dirname, "src", "**", "*.{fs,jison,js,json,jsx,less,ts,vs}"),
    mainWebapp:         "./.partialBuild/satie.js"
};

function gitSHA(callback) {
    exec("git rev-parse HEAD", {}, puts);
    function puts(error, stdout, stderr) {
        if (error) {
            console.log("ERROR GETTING GIT SHA:", error);
            console.log("stdout:", stdout);
            console.log("stderr:", stderr);
        }
        callback(stdout);
    }
}
var recordedSHA = false;
gulp.task("record-sha", [], function(done) {
    if (recordedSHA) {
        done();
        return;
    }
    recordedSHA = true;
    gitSHA(function(sha) {
        fs.writeFile(
            path.join(__dirname, "./.partialBuild/version.js"),
            "module.exports = \"" + packageJSON.name + "-" + packageJSON.version + "-" + sha.slice(0, 8) + "\";",
            done);
    });
});

gulp.task("watch", ["watch-prebuild", "lint"], function() {
    // SERVER GOES HERE
    gulp.watch(files.allSrc, ["typescript"]);
});

gulp.task("watch-prebuild", ["typescript"], function() {
    watch(files.mainWebapp, "browser-bundle.js");
});

function watch(main, output) {
    var webappBundler       = watchify(browserify(browserifyOpts.debug))
                                .add(main);

    webappBundler.on("error", gutil.log.bind(gutil, "Browserify Error"))
        .on("update", function () {
            var before      = new Date;
            bundlerShare(webappBundler);
            var after       = new Date;
            console.log("Rebundled in " + (after - before) + "msec...");
        });

    bundlerShare(webappBundler);

    function bundlerShare(bundler) {
        bundler
            .bundle()
            .pipe(source(output))
            .pipe(gulp.dest("./build"));
    }
}


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
    var bundler = watchify(browserify({entries: "./build/suite.js", debug: true}, browserifyOpts.prod));
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
                        configFile:     "karma.conf.js",
                        action:         "run",
                        autoWatch:      false,
                        singleRun:      true,
                        dieOnError:     true
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

var sharedTypescriptProject = typescript.createProject({
    removeComments:     true,
    noImplicitAny:      true,
    target:             'ES5',
    module:             'commonjs',
    noExternalResolve:  true
});

gulp.task("typescript", ["record-sha"], function() {
    var ts = gulp.src([files.ts, files.typings])
        .pipe(typescript(sharedTypescriptProject)).js
        .pipe(gulp.dest(dirs.build));

    var js = gulp.src([files.nonTsSources])
        .pipe(newer(dirs.build))
        .pipe(gulp.dest(dirs.build));

    var tsLint = gulp.src([files.ts])
        .pipe(newer({ dest: dirs.build, ext: ".js" }))
        .pipe(tslint())
        .pipe(tslint.report("verbose", {
            emitError: false
        }));

    return ts;
});

gulp.task("create-test-suite", ["typescript"], function() {
    // TODO: Remove es5-shim when we upgrade to PhantomJS 2.
    return gulp.src(["node_modules/es5-shim/es5-shim.js", ".partialBuild/**/test/*.js"])
        .pipe(generateSuite({addPrefix: "../test"}))
        .pipe(concat("suite.js"))
        .pipe(gulp.dest("build"));
});

gulp.task("lint", function() {
    return gulp.src(files.ts)
        .pipe(tslint())
        .pipe(tslint.report("verbose", {
            emitError: true
        }));
});

gulp.task("build", ["typescript", "cli-test-once"], function() {
    return browserify("./.partialBuild/main.js", browserifyOpts.prod).bundle()
        .on("error", gutil.log.bind(gutil, "Browserify Error"))
        .on("end", gutil.log.bind(gutil, "Built release bundle"))
        .pipe(source("browser-bundle.js"))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest("./build"));
});
