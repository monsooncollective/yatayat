var _ = _ || require("underscore");
var $ = $ || require("jquery");
var kdTree = kdTree || require('./lib/kdtree/src/node/kdTree.js').kdTree;

var O2Y = O2Y || {}; 

/**
 * Converts tags to dict
 * @param  {xml element} tag list with k v pair
 * @return {tag object}
 */
O2Y.tagToObj = function(tag) {
    tags = {};
    _.each(tag, function(t) {
            var $t = $(t);
            tags[$t.attr('k')] = $t.attr('v');
            });
    return tags;
};

/**
 * When passed in a set of "global-ish" objects, returns a function which can "register" ways.
 * @param processedWays
 * @param unprocessedWays
 * @param frontSegFinder
 * @param backSegFinder
 * @returns {Function}
 */
O2Y.registerWay = function(processedWays, unprocessedWays, frontSegFinder, backSegFinder) {
    // Register a segment (wayObj) into the processed/unprocessedWays dicts
    // The idea is that unprocessedWays has a whole bunch of ulat-pulat segments
    // As new ways are registered, they get merged into ways that have
    // stops ata both ends, at which points they enter the processedWays
    return function(wayObj, stopOnLeft, stopOnRight) {
        var id = _.uniqueId();
        var reverse = function(wayObj) {
            return {
                startNodeID: wayObj.endNodeID,
                endNodeID: wayObj.startNodeID,
                latLngs: wayObj.latLngs.reverse()
            };
        };
        var concat = function(wayObj1, wayObj2) {
            return {
                startNodeID: wayObj1.startNodeID,
                endNodeID: wayObj2.endNodeID,
                latLngs: wayObj1.latLngs.concat(_.rest(wayObj2.latLngs))
            };
        };
        var addToFinders = function(wayObj) {
            frontSegFinder[wayObj.startNodeID] = 1;
            backSegFinder[wayObj.endNodeID] = 1;
        }
        if (stopOnLeft && stopOnRight) {
            processedWays[id] = wayObj;
        } else if (stopOnLeft) {
            var wayToModify;
            if (frontSegFinder && wayObj.endNodeID in frontSegFinder) {

                // concat wayObj to wayToModify
                wayToModify = unprocessedWays[frontSegFinder[wayObj.endNodeID]];
                wayToModify = concat(wayObj, wayToModify);

                if(rawOSMNodes[wayToModify.endNodeID].is_stop) {
                    processedWays.push(wayToModify);
                    delete unprocessedWays[frontSegFinder[wayObj.endNodeID]];
                }

            } else if (backSegFinder && wayObj.endNodeID in backSegFinder) {

                // concat wayObj to reverse of wayToModify
                var wayToModify = unprocessedWays[backSegFinder[wayObj.endNodeID]];
                wayToModify = concat(wayObj, reverse(wayToModify));

                if(rawOSMNodes[wayToModify.endNodeID].is_stop) {
                    processedWays.push(wayToModify);
                    delete unprocessedWays[backSegFinder[wayObj.endNodeID]];
                }
            } else {
                backSegFinder[wayObj.endNodeID] = id;
                unprocessedWays[id] = wayObj;
            }
        } else if (stopOnRight) {
            if (frontSegFinder && wayObj.beginStopID in frontSegFinder) {

                var wayToModify = unprocessedWays[frontSegFinder[wayObj.endNodeID]];
                // concat wayToModify to reverse of wayObj
                wayToModify = concat(wayToModify, reverse(wayObj));


                if(rawOSMNodes[wayToModify.startNodeID].is_stop) {
                    processedWays.push(wayToModify);
                    delete unprocessedWays[frontSegFinder[wayObj.endNodeID]];
                }
            } else if (backSegFinder && wayObj.beginStopID in backSegFinder) {

                // concat wayToModify to wayObj
                var wayToModify = unprocessedWays[backSegFinder[wayObj.endNodeID]];
                wayToModify = concat(wayToModify, wayObj);


                if(rawOSMNodes[wayToModify.startNodeID].is_stop) {
                    processedWays.push(wayToModify);
                    delete unprocessedWays[backSegFinder[wayObj.endNodeID]];
                }
            } else {
                frontSegFinder[wayObj.endNodeID] = id;
                unprocessedWays[id] = wayObj;
            }
        } else {
            var wayToModify;
            if (backSegFinder && wayObj.beginStopID in backSegFinder) {

                // concat wayToModify to wayObj
                wayToModify = unprocessedWays[backSegFinder[wayObj.endNodeID]];
                wayToModify = concat(wayToModify, wayObj);

            } else if (frontSegFinder && wayObj.beginStopID in frontSegFinder) {

                wayToModify = unprocessedWays[frontSegFinder[wayObj.endNodeID]];
                // concat wayToModify to reverse of wayObj
                wayToModify = concat(wayToModify, reverse(wayObj));

            } else if (frontSegFinder && wayObj.endNodeID in frontSegFinder) {

                // concat wayObj to wayToModify
                wayToModify = unprocessedWays[frontSegFinder[wayObj.endNodeID]];
                wayToModify = concat(wayObj, wayToModify);

            } else if (backSegFinder && wayObj.endNodeID in backSegFinder) {

                // concat wayObj to reverse of wayToModify
                wayToModify = unprocessedWays[backSegFinder[wayObj.endNodeID]];
                wayToModify = concat(wayObj, reverse(wayToModify));

            } else {
                unprocessedWays[id] = wayObj;
                wayToModify = wayObj;
            }
            addToFinders(wayToModify);
        }
    };
}

O2Y.fromOSM = function(overpassXML) {
    var rawOSMNodes = {};
    var interStopSegments = {};


    var $overpassXML = $(overpassXML); 

    /* Step 1: process all the returned nodes; put them in local rawOSMNodes 
       obj referenced by nodeid, plus pull out is_stop attribute. */
    _.each($overpassXML.find('node'), function(n) {
        var $n = $(n);
        var tagObj = O2Y.tagToObj($n.find('tag'));
        rawOSMNodes[$n.attr('id')] = {
            osmID   : $n.attr('id'),
            latlng  : [$n.attr('lat'), $n.attr('lon')],
            tag     : tagObj,
            is_stop : tagObj.public_transport === 'stop_position'
        };
    });

    /* Step 2: extract all the segments from OSM into rawOSMSegment objects,
       pulling out stopNodes, and start and end node IDs. */ 
    _.each($overpassXML.find('way'), function(w) {
        var $w = $(w);
        var nodes = _($w.find('nd')).map(function(n) {
            return rawOSMNodes[$(n).attr('ref')]; 
        });

        /* This gets hairy. The idea is to split up ways at stops. A way with
           stops at both ends is "processed". A way with stops at only one end,
           or no stops at either end, is "unprocessed" */
        var beginNodeIDX = 0;
        _.each(nodes, function(n, idx) {
            if (idx === beginNodeIDX) { return; } // no need to process the first element

            if (n.is_stop || (idx === nodes.length - 1)) {
                /*registerWay({
                        latLngs     : nodes.slice(beginNodeIDX, idx + 1),
                        startNodeID : nodes[beginNodeIDX].osmID,
                        endNodeID   : nodes[idx].osmID,
                }, nodes[beginNodeIDX].is_stop, n.is_stop);*/
                if (n.is_stop) beginNodeIDX = idx;
            } 
        });
    });
};

