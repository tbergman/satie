var unittests = [];
module.exports = test => unittests.push(test);
module.exports.runAll = () => {
    console.log("==================================");
    unittests.forEach(u => {
        try {
            u();
        } catch(err) {
            console.warn("Failed unit test.");
            console.trace();
            console.log("==================================");
            throw err;
        }
    });
    console.log("All unit tests passed.");
    console.log("==================================");
};
