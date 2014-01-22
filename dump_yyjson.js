#!/usr/bin/env nodejs

var YY = require('./yatayat.js');
// Hijack fromOSM call
require("./fromosm.js")(YY);

var fs = require("fs");

var USAGE = "./dump_yyjson.js OVERPASS.xml OUTFILE"

var OVERPASS_XML = process.argv[2];
var OUTFILE = process.argv[3];

// Load system as YY.System
var system = YY.fromOSM(fs.readFileSync(OVERPASS_XML, "utf-8"));

// Dump to something like this
// {
//   "stops": {id -> {latLng: [lat,lng], tag: {}}, ...},
//   "segments": {id -> {listOfLatLng: [[lat,lng], ...], tag: {}}, ...},
//   "routes": {id -> {stops: [stop_id, ...], segments: [seg_id, ...], tag: {}}, ...}
// }

var out = {
    "stops": {},
    "segments": {},
    "routes": {}};

system.routes.forEach(function(route) {
    var sys_stops = [];
    var sys_segs = [];
    route.stops.forEach(function(stop) {
        out.stops[stop.id] = {latLng: [stop.lat, stop.lng], tag: stop.tag};
        sys_stops.push(stop.id);
    });
    route.segments.forEach(function(seg) {
        out.segments[seg.id] = {listOfLatLng: seg.listOfLatLng, tag: seg.tag};
        sys_segs.push(seg.id);
    });
    out.routes[route.id] = {stops: sys_stops, segments: sys_segs, tag: route.tag};
})

fs.writeFileSync(OUTFILE, JSON.stringify(out));
