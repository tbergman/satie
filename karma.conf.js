module.exports = function(karma) {
    karma.set({
        browsers: ["PhantomJS"],
        frameworks: ["mocha"],
        files: ["build/deps.min.js"],
        reporters: ["mocha", "notify", "coverage"],
        singleRun: true,
        autoWatch: false,
        notifyReporter: {
            reportSuccess: true
        },
        preprocessors: {
            'src/**/*.ts': ['coverage']
        },
        coverageReporter: {
            type : 'html',
            dir : 'build/coverage/'
        }
    });
};
