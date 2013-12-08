// Data Quality: headless sanity checks for Yatayat System data.

var DQ = DQ || {};
var _ = _ || require("underscore");

// nearestStops returns squared-distance; 
// regardless, this is a magic number.
var SAME_STOP_DIST = Math.pow(0.0005,2);

DQ.sanityChecks = {
    // name of test -> {
    //   run: function(route, [system]),
    //   print: function(run_output, route, system)
    //   }


    "nearby different stops": {
        run: function(route, system) {
            // Returns: stop1.id -> stop2, when stop1 and stop2 are nearby
            // and different
            stopClosest = {};

            route.stops.forEach(function(stop) {
                var stops = system.nearestStops([stop.lat, stop.lng], 2, SAME_STOP_DIST)
                    .filter(function(s) { return s.id !== stop.id; });
                if(stops.length > 0 && stop.name && stops[0].name && stops[0].name !== stop.name) {
                    stopClosest[stop.id] = stops[0];
                }
            });

        return stopClosest;
        },
        print: function(run_output, route, system) {
            var pairs = [];
            for(var stopid in run_output) {
                pairs.push([route.stopDict[stopid], run_output[stopid]]);
            }
            if(pairs.length > 0) {
                var out = "" + pairs.length + " nearby different stops:\n";
                pairs.forEach(function(pair) {
                    out += "    " + pair[0].name + "(" + pair[0].id + ") - " + pair[1].name + "(" + pair[1].id + ")\n";
                });
                out += "\n";
                return out;
            }
        },
        kind: 'WARNING'
    },

    "first segment doesn't end at a stop": {
        run: function(route) {
            if(route.stops.length === 0 || route.segments.length === 0) {
                return true;
            }
            var firstStop = route.stops[0];
            var firstSegmentEnd = route.segments[0].listOfLatLng[0];
            if (!firstStop) return true;
            return firstStop.lat == firstSegmentEnd[0] && firstStop.lng == firstSegmentEnd[1];
        },
        print: function(run_output, route) {
            debugger;
            if (run_output) {
                if(route.stops.length === 0 || route.segments.length === 0) {
                    return "Without stops or segments, it's silly to talk about whether the first segment will end at a stop.\n\n";
                }
                return "First segment of route (id:" + route.segments[0].id + 
                    ") doesn't start at a properly key-ed stop.\n";
            }
        },
        kind: 'WARNING'
    },

    "unnamed stops":  {
        run: function(route) {
            // Returns: stop.id -> true, when stop is unnamed
            unnamedStops = {};

            route.stops.forEach(function(stop) {
                if(!stop.name) {
                    unnamedStops[stop.id] = true;
                }
            });

            return unnamedStops;
        },
        print: function(run_output, route, system) {
            var stops = [];
            for(var stopid in run_output) {
                stops.push(route.stopDict[stopid]);
            }
            if(stops.length > 0) {
                var out = "" + stops.length + " unnamed stops:\n";
                stops.forEach(function(stop) {
                    out += "    " + stop.id + "\n";
                });
                out += "\n";
                return out;
            }
        },
        kind: 'WARNING'
    },

    "no terminus": {
        run: function(route) {
            // Returns true if route has no terminus, false otherwise
            return false ||  route._noTerminus;
        },
        print: function(run_output, route, system) {
            if(run_output) {
                return "No terminus\n\n";
            }
        },
        kind: 'ERROR'
    },

    "unconnected segments": {
        run: function(route) {
            // Returns seg.id -> true, when Segment is unconnected
            unconnected = {};
            route._unconnectedSegments.forEach(function(seg) {
                unconnected[seg.id] = true;
            });
            return unconnected;
        },
        print: function(run_output, route, system) {
            var segs = [];
            for(var segid in run_output) {
                segs.push(segid);
            }
            if(segs.length > 0) {
                var out = "" + segs.length + " unconnected segments:\n";
                segs.forEach(function(segid) {
                    out += "    " + segid + "\n";
                });
                out += "\n";
                return out;
            }
        },
        kind: 'ERROR'
    },

    "similar names": {
        run: function(route, system) {
            // Returns stop1.id -> stop2, when stop1 and stop2 have
            // similar names.

            // thanks! http://thinkphp.ro/apps/js-hacks/String.levenshtein/String.levenshtein.html
            var levenshtein = function(stringa, stringb) {
                var cost = new Array(),
                str1 = stringa,
                str2 = stringb,
                n = str1.length,
                m = str2.length,
                i, j;
                var minimum = function(a,b,c) {
                    var min = a;
                    if(b < min) {
                        min = b;
                    }
                    if(c < min) {
                        min = c;
                    }
                    return min;
                }

                if(n == 0 || m == 0) {
                    return;  
                } 

                for(var i=0;i<=n;i++) {
                    cost[i] = new Array();
                }

                for(i=0;i<=n;i++) {
                    cost[i][0] = i;
                }

                for(j=0;j<=m;j++) {
                    cost[0][j] = j;
                }

                for(i=1;i<=n;i++) {
                    var x = str1.charAt(i-1);
                    for(j=1;j<=m;j++) {
                        var y = str2.charAt(j-1);
                        if(x == y) {
                            cost[i][j] = cost[i-1][j-1]; 
                        } else {
                            cost[i][j] = 1 + minimum(cost[i-1][j-1], cost[i][j-1], cost[i-1][j]);
                        } 
                    }
                }
                return cost[n][m];  
            };

            var preprocess = function(str) {
                return str.toLowerCase().replace(' ', '');
            };

            similarNames = {};

            // n^2 algorithm that compares string-distance between every two pairs of stop
            route.stops.forEach(function(stop) {
                
                system.routes.forEach(function(route2) {
                    route.stops.forEach(function(stop2) {

                        if(stop.name && stop2.name && levenshtein(stop.name, stop2.name) < 3) {
                            var physicalDistance = Math.pow(stop.lat-stop2.lat,2) + Math.pow(stop.lng-stop2.lng,2);
                            if(physicalDistance > SAME_STOP_DIST) {
                                // console.log(stop.name, stop2.name, physicalDistance);
                                similarNames[stop.id] = stop2;
                            }
                            else if(stop.id != stop2.id) {
                                //console.log(stop.name, stop2.name, 'nearby');
                            }
                        }
                        
                    });
                });
            });
            return similarNames;
        },
        print: function(run_output, route, system) {
            // XXX: *very* similar code to nearby different stops
            var pairs = [];
            for(var stopid in run_output) {
                pairs.push([route.stopDict[stopid], run_output[stopid]]);
            }
            if(pairs.length > 0) {
                var out = "" + pairs.length + " stops with similar names:\n";
                pairs.forEach(function(pair) {
                    out += "    " + pair[0].name + "(" + pair[0].id + ") - " + pair[1].name + "(" + pair[1].id + ")\n";
                });
                out += "\n";
                return out;
            }
        },
        kind: 'WARNING'
    }
};

// For easier integration with data_quality.html, make aliases
DQ.nearbyDifferentStops = DQ.sanityChecks["nearby different stops"].run;
DQ.unnamedStops = DQ.sanityChecks["unnamed stops"].run;
DQ.similarNames = DQ.sanityChecks["similar names"].run;
DQ.noTerminus = DQ.sanityChecks["no terminus"].run;
DQ.unconnectedSegments = DQ.sanityChecks["unconnected segments"].run;

DQ.errorString = function(system, which) {
    var which = which || 'ERROR'; // possible options: 'ERROR', 'WARNING'
    var errForRoute = function(route) {
        var errs = DQ.findErrorsAndWarnings(route, system)[which];
        var prequel = "\n### Route: " + route.name + " (" + route.id + ")\n\n" +
                  "http://yatayat.monsooncollective.org/data_quality.html#" + route.id + "\n\n";
        return errs ? prequel + errs : "";
    };
    return _.chain(system.routes)
        .map(errForRoute)
        .reduce(function(a, b) { return a+b; }, "")
        .value();
};

DQ.findErrorsAndWarnings = function(route, system) {
    var retval = {};
    //TODO: If route is undefined
    _(DQ.sanityChecks).each(function(v, testname) {
        var test = DQ.sanityChecks[testname];
        var res = test.run(route, system);
        var errout = test.print(res, route, system);
        if(errout) {
            if(!(test.kind in retval)) // warning or error not added yet
                retval[test.kind] = [errout];
            else 
                retval[test.kind].push(errout);
        }
    });
    return retval;
};
DQ.findAllErrorsAndWarnings = function(system) {
    return system.routes.map(function(r) { return DQ.findErrorsAndWarnings(r, system); });
};
DQ.findCorrectRoutes = function(system) {
    return system.routes.filter(function(route) {
        for(var testname in DQ.sanityChecks) {
            var res = DQ.sanityChecks[testname].run(route, system);
            var errout = DQ.sanityChecks[testname].print(res, route, system);
            if(errout) {
                return false;
            }
        }
        return true;
    });
};


// export as a node module
var module = module || {};
module.exports = DQ;
