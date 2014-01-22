var YY = require('./yatayat.js');
// Hijack fromOSM call
require("./fromosm.js")(YY);

var DQ = require('./dataquality.js');
var docopt = require('./docopt.coffee/');

var fs = require("fs");
var docstring = "\n" +
             "Usage:\n" +
             "./cli_dataquality.js <overpass.xml> [show_correct_routes] [--include-warnings]\n";

var opts = docopt.docopt(docstring);

// Load system as YY.System
var system = YY.fromOSM(fs.readFileSync(opts['<overpass.xml>'], "utf-8"));

// Run tests: this will be silent if there are no errors
if(opts['show_correct_routes']) {
    console.log("CORRECT ROUTES");
    console.log(DQ.findCorrectRoutes(system).map(function(route) {
        return route.name + " (" + route.id + ")";
    }));
} else {
    var errors = DQ.errorString(system);
    if(errors.length > 0)
        console.log("\n\n~~~~~~~~~~~ERRORS:~~~~~~~~~~~~~~\n\n" + errors);
    if (opts['--include-warnings']) {
        var warnings = DQ.errorString(system, 'WARNING');
        if(warnings.length > 0)
            console.log("\n\n~~~~~~~~~~~WARNINGS:~~~~~~~~~~~~~~\n\n" + warnings);
    }
} 
