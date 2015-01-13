var crypto              = require('crypto');
var dtsBundle           = require("dts-bundle");
var eventStream         = require("event-stream");
var fs                  = require("fs")
var gulp                = require("gulp");
var newer               = require("gulp-newer");
var path                = require("path");
var tslint              = require("gulp-tslint");
var typescript          = require("gulp-typescript");
var util                = require("gulp-util");
var _                   = require("lodash");

var dirs = {
    build:              path.join(__dirname, "dist"),
    partial:            path.join(__dirname, ".partialBuild"),
    typings:            path.join(__dirname, "typings")
};

var files = {
    ts:                 path.join(__dirname, "src", "**", "*.ts"),
    typings:            path.join(dirs.typings, "**", "*.d.ts"),
    typedReact:         path.join(__dirname, "node_modules", "typed-react", "dist", "typed-react.d.ts"),
    mxml:               path.join(__dirname, "node_modules", "musicxml-interfaces",
                                                 "typescript", "dist", "musicxml-interfaces.d.ts"),
    mainJS:             path.join(dirs.build, "satie.js"),
    nonTsSources:       path.join(__dirname, "src", "**", "*.{js,json,jsx}")
};

var project = typescript.createProject({
    removeComments:     true,
    noImplicitAny:      true,
    target:             'ES5',
    module:             'commonjs',
    noExternalResolve:  true,
    declarationFiles:   true
});

/*---- Building ---------------------------------------------------------------------------------*/

gulp.task("build", ["buildTS", "bundleDTS", "lint", "testLayout"], function() {
});

gulp.task("watch", ["build"], function() {
    gulp.watch(files.ts, ["buildTS"]);
});

/*---- TypeScript -------------------------------------------------------------------------------*/

gulp.task("buildTS", function() {
    var tsResult = gulp.src([files.ts, files.typings, files.typedReact, files.mxml])
        .pipe(typescript(project));

    var nonJS = gulp.src([files.nonTsSources])
        .pipe(newer(dirs.build))
        .pipe(gulp.dest(dirs.build));

    return eventStream.merge(
        tsResult.dts.pipe(gulp.dest(dirs.partial)),
        tsResult.js.pipe(gulp.dest(dirs.build)),
        nonJS
    );
});

gulp.task("bundleDTS", ["buildTS"], function() {
    return dtsBundle.bundle({
        name: "satie",
        main: ".partialBuild/satie.d.ts",
        baseDir: ".partialBuild",
        out: "../dist/satie.d.ts",
        externals: true
    });
});

/*---- Code quality -----------------------------------------------------------------------------*/

gulp.task("lint", function() {
    return gulp.src([files.ts])
        .pipe(tslint())
        .pipe(tslint.report('verbose'));
});

/*---- Tests ------------------------------------------------------------------------------------*/

gulp.task("renderLayoutTests", ["buildTS"], function(done) {
    var test = util.env.test || "all";
    var verbose = util.env.verbose || false;
    if (test === "all") {
        console.log("\u001b[31mRendering all layout tests...\u001b[39m");
        console.log("Hint: to render just one test, run 'gulp renderLayoutTests --test testID'.");
        console.log("For example, to render 01a, run 'gulp renderLayoutTests --test 01a'.");
    } else {
        console.log("\u001b[31mRendering layout test " + test + "...\u001b[39m");
    }
    var layoutRunner = require("./tests/layoutRunner");
    layoutRunner(test, verbose, done);
});

var baselineHashes;
var currentHashes;

gulp.task("hashBaselines", ["renderLayoutTests"], function(done) {
    baselineHashes = {};
    hashSVGs("./tests/baselines", baselineHashes, done);
});

gulp.task("hashCurrents", ["renderLayoutTests"], function(done) {
    currentHashes = {};
    hashSVGs("./tests/out", currentHashes, done);
});

gulp.task("testLayout", ["hashBaselines", "hashCurrents"], function(done) {
    var files = _.union(
        Object.keys(baselineHashes),
        Object.keys(currentHashes)
    );
    var ok = true;
    _.forEach(files, function(file) {
        if (baselineHashes[file] !== currentHashes[file]) {
            ok = false;
            if (!baselineHashes[file]) {
                console.log("\u001b[31mFAIL!\u001b[39m " + file + " does not have a baseline.");
            } else if (!currentHashes[file]) {
                console.log("\u001b[31mFAIL!\u001b[39m " + file + " was not generated but has a baseline.");
            } else {
                console.log("\u001b[31mFAIL!\u001b[39m " + file + " does not match baseline.");
            }
        }
    });
    done();
    if (!ok) {
        throw "Failed layout tests...";
    }
});

function hashSVGs(path, hashes, done) {
    var dir = fs.readdirSync(path);
    var idx = -1;
    function readNext() {
        ++idx;
        if (idx == dir.length) {
            done();
            return;
        }

        if (!~dir[idx].indexOf(".svg")) {
            readNext();
            return;
        }

        var fd = fs.createReadStream(path + "/" + dir[idx]);
        var hash = crypto.createHash('sha1');
        hash.setEncoding('hex');

        fd.on('end', function() {
            hash.end();
            hashes[dir[idx]] = hash.read();
            readNext();
        });

        // read all file and pipe it (write it) to the hash object
        fd.pipe(hash);
    }
    readNext();
}
