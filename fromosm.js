var _ = _ || require("underscore");
var YY = require("./yatayat.js");
var libxmljs = require("libxmljs");


/**
 * Converts a file containing routes in osm xml format to a yatayat based system
 * 1) process all the returned nodes; put them in local nodes obj
 * 2) put all ways from overpass into local segments obj + stopToSegDict
 *
 * @param  xml_data_type overpassXML
 * @return system
 */
function fromOSM(overpassXML) {

    var nodes = {}; // nodes object referenced by id
    var segments = {}; // ways object referenced by id
    var routeStops = {};
    var stopToSegDict = {}; // stopid references which seg it lies on

    /**
     * Converts tags to dict
     * @param  {xml element} tag list with k v pair
     * @return {tag object}
     */
    var tagToObj = function(tag) {
        tags = {};
        _.each(tag, function(t) {
            tags[t.attr('k').value()] = t.attr('v').value();
        });
        return tags;
    };

    var xmlDoc = libxmljs.parseXml(overpassXML);

    /* Step 1: process all the returned nodes; put them in local nodes obj referenced by nodeid */
    _.each(xmlDoc.find('node'), function(n) {
        var tagObj = tagToObj(n.find('tag'));
        nodes[n.attr('id').value()] = {
            id: n.attr('id').value(),
            lat: n.attr('lat').value(),
            lng: n.attr('lon').value(),
            tag: tagObj,
            is_stop: tagObj.public_transport === 'stop_position'
        };
    });

    /* Step 2: put all ways from overpass into local segments obj + stopToSegDict */
    _.each(xmlDoc.find('way'), function(w) {
        var myNodes = [];
        var myNodesids = [];
        var myStops = [];
        var mydictofnodes = {};
        _.each(w.find('nd'), function(n) {
            var node = nodes[n.attr('ref').value()];
            if (node.is_stop) {
                myStops.push(node);
                if (!stopToSegDict[node.id])
                    stopToSegDict[node.id] = [];

                stopToSegDict[node.id].push(w.attr('id').value());
            }
            myNodes.push([node.lat, node.lng]);
            myNodesids.push(node.id);
            mydictofnodes[node.id] = node;
        });
        // At this point, myNodes = ordered list of nodes in this segment, myStops = ordered list of stops
        segments[w.attr('id').value()] = new YY.Segment(w.attr('id').value(), myNodes, myNodesids, mydictofnodes, tagToObj(w.find('tag')), myStops);
    });


    /* Step 3: */
    var routes = _.map(xmlDoc.find('relation'), function(r) {
        var mySegments = [];
        var startStop, startSegID;

        _.each(r.find('member'), function(m) {
            if (m.attr('type').value() === 'way') {
                mySegments.push(segments[m.attr('ref').value()]);
            } else if (m.attr('type').value() === 'node') {
                var n = nodes[m.attr('ref').value()];
                if (n && n.lat && n.lng) {
                    var stop = new YY.Stop(m.attr('ref').value(), n.lat, n.lng, n.tag);
                    if (m.attr('role').value() === 'terminus' || m.attr('role').value() === 'start') {
                        startStop = stop;
                        n.is_start = true;
                    }
                }
            }
        });
        var startSegID = startStop && _.find(stopToSegDict[startStop.id], function(segID) {
            return _.contains(_.pluck(mySegments, 'id'), segID);
        })
        return new YY.Route(r.attr('id').value(), [], mySegments, tagToObj(r.find('tag')), startSegID);
    });

    // Filter out hiking routes
    routes = routes.filter(function(x) {
        return x.transport !== "hiking";
    });

    return new YY.System(routes, stopToSegDict);
}

// A little idiosyncratic, perhaps?
module.exports = function(YY) { 
    YY.fromOSM = fromOSM;
}
