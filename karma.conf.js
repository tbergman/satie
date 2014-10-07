module.exports = function(karma) {
    var configuration = {
        browsers: ["Chrome", "Firefox"],
        frameworks: ["jasmine"],
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
    };
    if(process.env.TRAVIS) {
        configuration.browsers = ["Firefox"];
    }
    karma.set(configuration);
};
