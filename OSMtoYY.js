var _ = _ || require("underscore");
var $ = $ || require("jquery");
var kdTree = kdTree || require('./lib/kdtree/src/node/kdTree.js').kdTree;

var O2Y = O2Y || {};

O2Y.rawOSMNodes = {};

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
 * Checks if a node with a given
 * @param id of node object
 * @returns {boolean|O2Y.rawOSMNodes.is_stop == true}
 */
O2Y.is_stop = function(id) {
    return id in O2Y.rawOSMNodes &&
        'is_stop' in O2Y.rawOSMNodes[id] &&
        O2Y.rawOSMNodes[id].is_stop;
}

/**
 * Given two parameters, returns a function that can incrementally "register" small segmented
 * ways into wayRegisters.
 * @param finalWayRegister -- will contain ways where start and end are both stops
 * @param wayRegister -- will contain all other ways; both start+end are NOT stops
 * @returns {Function}
 */
O2Y.registerWay = function(finalWayRegister, wayRegister) {
    var frontSegFinder = {}, backSegFinder = {};
    var register = function(id, edge) {
        if(O2Y.is_stop(edge.startNodeID) && O2Y.is_stop(edge.endNodeID)) {
            finalWayRegister[id] = edge;
        } else {
            frontSegFinder[edge.startNodeID] = id;
            backSegFinder[edge.endNodeID] = id;
            wayRegister[id] = edge;
        }
    };
    var deregister = function(id, edge) {
        if (edge.startNodeID in frontSegFinder) delete frontSegFinder[edge.startNodeID];
        if (edge.endNodeID in backSegFinder) delete backSegFinder[edge.endNodeID];
        if (id in wayRegister) delete wayRegister[id];
    };
    var concatenate = function(wayObj1, wayObj2) {
        return {
            startNodeID: wayObj1.startNodeID,
            endNodeID: wayObj2.endNodeID,
            latLngs: wayObj1.latLngs.concat(_.rest(wayObj2.latLngs))
        };
    };
    var reverse = function(wayObj) {
        return {
            startNodeID: wayObj.endNodeID,
            endNodeID: wayObj.startNodeID,
            latLngs: _.clone(wayObj.latLngs).reverse()
        };
    };
    // Main workhorse function, which is returned and by default called with
    // time == 'first_time'. Best way to follow logic is to draw out a few edges.
    // Basically, it attempts to join edge_A (new edge) with a registered edge
    // that fits into the front or back (edge_B). Calls itself for a second-time
    // with a reversed edge_A if the first round produces no result.
    var registerEdge =  function(edge_A, time) {
        var edge_B, id_B;
        var new_ID = _.uniqueId('#');
        if(edge_A.startNodeID in backSegFinder) {
            id_B = backSegFinder[edge_A.startNodeID];
            edge_B = wayRegister[id_B];
            deregister(id_B, edge_B);
            register(new_ID, concatenate(edge_B, edge_A));
        } else if (edge_A.endNodeID in frontSegFinder) {
            id_B = frontSegFinder[edge_A.endNodeID];
            edge_B = wayRegister[id_B];
            deregister(id_B, edge_B);
            register(new_ID, concatenate(edge_A, edge_B));
        } else if (time=="first_time") {
            registerEdge(reverse(edge_A), "second_time")
        } else {
            register(new_ID, edge_A);
        }
    }
    return function(x) { registerEdge(x, "first_time")};
};

O2Y.fromOSM = function(overpassXML) {
    var interStopSegments = {};
    var $overpassXML = $(overpassXML); 

    /* Step 1: process all the returned nodes; put them in rawOSMNodes
       obj referenced by nodeid, plus pull out is_stop attribute. */
    _.each($overpassXML.find('node'), function(n) {
        var $n = $(n);
        var tagObj = O2Y.tagToObj($n.find('tag'));
        O2Y.rawOSMNodes[$n.attr('id')] = {
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
            return O2Y.rawOSMNodes[$(n).attr('ref')];
        });

        /* This gets hairy. The idea is to split up ways at stops. A way with
           stops at both ends is "processed". A way with stops at only one end,
           or no stops at either end, is "unprocessed" */
        var beginNodeIDX = 0;
        var segsWithoutStops = {}, segsWithStops = {};
        var registerWay = O2Y.registerWay(segsWithStops, segsWithoutStops);
        _.each(nodes, function(n, idx) {
            if (idx === beginNodeIDX) { return; } // no need to process the first element

            if (n.is_stop || (idx === nodes.length - 1)) {
                registerWay({
                        latLngs     : nodes.slice(beginNodeIDX, idx + 1),
                        startNodeID : nodes[beginNodeIDX].osmID,
                        endNodeID   : nodes[idx].osmID,
                });
                if (n.is_stop) beginNodeIDX = idx;
            } 
        });
    });
};

