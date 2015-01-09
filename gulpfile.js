var dtsBundle           = require("dts-bundle");
var eventStream         = require("event-stream");
var gulp                = require("gulp");
var gutil               = require("gulp-util");
var newer               = require("gulp-newer");
var path                = require("path");
var source              = require("vinyl-source-stream");
var typescript          = require("gulp-typescript");

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

gulp.task("build", ["buildTS", "bundleDTS"], function() {
});

gulp.task("watch", ["build"], function() {
    gulp.watch(files.ts, ["build"]);
});
