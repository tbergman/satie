var browserify = require("browserify");
var concat = require("gulp-concat");
var exit = require("gulp-exit");
var generateSuite = require("gulp-mocha-browserify-sweet");
var gulp = require("gulp");
var gutil = require("gulp-util");
var jasmine = require('gulp-jasmine');
var karma = require("gulp-karma");
var path = require("path");
var source = require("vinyl-source-stream");
var spawn = require("child_process").spawn;
var streamify = require("gulp-streamify");
var tslint = require("gulp-tslint");
var typescript = require("gulp-typescript");
var uglify = require("gulp-uglify");
var watchify = require("watchify");

var browserifyOpts = {
    debug: {
        extensions: [".jsx"],
        debug: true,
        cache: {},
        packageCache: {},
        fullPaths: true
    },
    prod: {
        extensions: [".jsx"],
        debug: false
    },
    chore: {
        extensions: [".jsx"],
        debug: false,
        noparse: ["startExpressServer.js"],
        builtins: false,
        commondir: false,
        detectGlobals: false
    }
};

var dirs = {
    build: path.join(__dirname, ".partialBuild"),
    typings: path.join(__dirname, "references")
};

var files = {
    ts: path.join(__dirname, "src", "**", "*.ts"),
    typings: path.join(__dirname, dirs.typings, "**", "*.d.ts"),
    nonTsSources: path.join(__dirname, "src", "**", "*.{fs,jison,js,json,jsx,less,vs}"),
    allSrc: path.join(__dirname, "src", "**", "*.{fs,jison,js,json,jsx,less,ts,vs}"),
    mainLocal: "./.partialBuild/main.js"
};

gulp.task("watch", ["build-debug", "chores"], function() {
    var nginx = spawn("nginx", ["-c", "./nginx.dev.conf", "-p", "./nginx"], {cwd: process.cwd()});
    nginx.stderr.on("data", function(data) {
        console.log(data.toString());
    });

    gulp.watch(files.allSrc, ["build-debug"]);
});

var __sharedBrowserify = null;
function getSharedBrowserify() {
    if (!__sharedBrowserify) {
        __sharedBrowserify = watchify(browserify(browserifyOpts.debug))
            .add(files.mainLocal);
    }
    return __sharedBrowserify;
}
gulp.task("build-debug", ["typescript"], function() {
    return getSharedBrowserify()
        .bundle()
        .on("error", gutil.log.bind(gutil, "Browserify Error"))
        .on("end", gutil.log.bind(gutil, "Built bundle"))
        .pipe(source("browser-bundle.js"))
        .pipe(gulp.dest("./build"));
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

gulp.task("build-chores", ["typescript"], function() {
    return browserify("./.partialBuild/choreServer.js", browserifyOpts.chore).bundle()
        .on("error", gutil.log.bind(gutil, "Browserify Error"))
        .on("end", gutil.log.bind(gutil, "Built bundle"))
        .pipe(source("chore-server.js"))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest("./build"));
});

gulp.task("chores", ["build-chores"], function() {
    run_cmd("bash", ["-c", "cat ./build/chore-server.js | node"]);

    function run_cmd(cmd, args, callback ) {
        var spawn = require('child_process').spawn;
        var child = spawn(cmd, args);
        var resp = "";

        child.stdout.on('data', function (buffer) { resp += buffer.toString() });
        child.stdout.on('end', function() { callback && callback(resp) });
    }
});

var sharedTypescriptProject = typescript.createProject({
    removeComments: false,
    noImplicitAny: true,
    target: 'ES5',
    module: 'commonjs',
    noExternalResolve: false
});

gulp.task("typescript", function() {
    var ts = gulp.src([files.ts, files.typings])
        .pipe(typescript(sharedTypescriptProject));
    ts.dts.pipe(gulp.dest(dirs.build));
    gulp.src([files.nonTsSources]).pipe(gulp.dest(dirs.build));
    return ts.js.pipe(gulp.dest(dirs.build));
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
            emitError: false
        }));
});

gulp.task("build", ["typescript", "cli-test-once"], function() {
    return browserify("./.partialBuild/main.js", browserifyOpts.prod).bundle()
        .on("error", gutil.log.bind(gutil, "Browserify Error"))
        .on("end", gutil.log.bind(gutil, "Built bundle"))
        .pipe(source("browser-bundle.js"))
        .pipe(streamify(uglify()))
        .pipe(gulp.dest("./build"));
});
