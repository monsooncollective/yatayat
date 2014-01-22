#!/usr/bin/env nodejs

var YY = require('./yatayat.js');
// Hijack fromOSM call
require("./fromosm.js")(YY);
var GTFO = require('./GTFO.js');

var fs = require("fs");

var USAGE = "./dump_gtfs.js OVERPASS.xml OUTDIR"

var AGENCIES = [
    {name: "Microbus", filter: "bus", url: "http://yatayat.monsooncollective.org/#agency:micro"},
    {name: "Tempo", filter: "tempo", url: "http://yatayat.monsooncollective.org/#agency:tempo"}
];

// Get "system" -- assumes that overpass XML is stored locally
if(process.argv.length < 4) {
    console.log(USAGE);
    throw "dump_gtfs requires path to XML data and an output directory";
}

var OVERPASS_XML = process.argv[2];
var OUTDIR = process.argv[3];
if(OUTDIR[OUTDIR.length-1] !== "/") {
    OUTDIR += "/";
}

// Load system as YY.System
var system = YY.fromOSM(fs.readFileSync(OVERPASS_XML, "utf-8"));

AGENCIES.forEach(function(agency) {
    var gtfo = new GTFO(system, agency);
    var csvs = gtfo.generate_csvs();

    for(var key in csvs) {
        fs.writeFileSync(OUTDIR + agency.name + "-" + key + ".txt", csvs[key]);
    }
});
