var someWayObjs = [
    {startNodeID: 1, endNodeID: 2, latLngs: [[1.0, 1.0], [1.5,1.5], [2.0,2.0]] },
    {startNodeID: 2, endNodeID: 3, latLngs: [[2.0, 2.0], [2.5,2.5], [3.0,3.0]] },
    {startNodeID: 4, endNodeID: 3, latLngs: [[4.0, 4.0], [3.5,3.5], [3.0,3.0]] }
];


describe("Converstion from OSM 2 YY objects", function () {
    describe( "registerWay works when there are no stops", function () {
        var reg, p, u, b, f;
        beforeEach(function() {
            p = {}, u = {}, b = {}, f = {};
            reg = O2Y.registerWay(p, u, f, b);
            O2Y.rawOSMNodes = {1: {}, 2: {}, 4: {}, 3: {}};
        });
        it("registerWay works for size 1 (no stops)", function() {
            reg(someWayObjs[0]);
            expect(_.values(p).length).toEqual(0);
            expect(_.values(u).length).toEqual(1);
            expect(_.first(_.values(u)).latLngs).toEqual(
                [[2,2], [1.5,1.5], [1,1]]);
        });
        it("registerWay works for 1 and 2 (no stops)", function() {
            reg(someWayObjs[0]);
            reg(someWayObjs[1]);
            expect(_.values(u).length).toEqual(1);
            expect(_.first(_.values(u)).latLngs).toEqual([
                [3,3], [2.5,2.5], [2,2], [1.5,1.5], [1,1]
            ]);
        });
        it("registerWay works for 2 and 1 (no stops)", function() {
            reg(someWayObjs[1]);
            reg(someWayObjs[0]);
            expect(_.values(u).length).toEqual(1);
            expect(_.first(_.values(u)).latLngs).toEqual([
                [3,3], [2.5,2.5], [2,2], [1.5,1.5], [1,1]
            ]);
        });
        it("registerWay works for 1, 2, and 3 (no stops)", function() {
            reg(someWayObjs[0]);
            reg(someWayObjs[1]);
            expect(_.first(_.values(u)).latLngs).toEqual([
                [3,3], [2.5,2.5], [2,2], [1.5,1.5], [1,1]
            ]);
            reg(someWayObjs[2]);
            expect(_.values(u).length).toEqual(1);
            expect(_.first(_.values(u)).latLngs).toEqual([
                [4,4], [3.5,3.5], [3,3], [2.5,2.5], [2,2], [1.5,1.5], [1,1]
            ]);
        });
    });
    describe( "registerWay works when there ARE stops", function () {
        var reg, p, u, b, f;
        beforeEach(function() {
            p = {}, u = {}, b = {}, f = {};
            reg = O2Y.registerWay(p, u, f, b);
            O2Y.rawOSMNodes = {1: {is_stop: true}, 2:{is_stop: true}, 4:{is_stop: true}, 3:{}};
        });
        it("registerWay works for size 1 (stops)", function() {
            reg(someWayObjs[0]);
            expect(_.values(p).length).toEqual(1);
            expect(_.values(u).length).toEqual(0);
            expect(_.first(_.values(p)).latLngs).toEqual(
                [[2,2], [1.5,1.5], [1,1]]);
        });
        it("registerWay works for 1 and 2 (stops)", function() {
            reg(someWayObjs[0]);
            reg(someWayObjs[1]);
            expect(_.values(u).length).toEqual(1);
            expect(_.values(p).length).toEqual(1);
            expect(_.first(_.values(p)).latLngs).toEqual([
                [2,2], [1.5,1.5], [1,1]
            ]);
            expect(_.first(_.values(u)).latLngs).toEqual([
                [3,3], [2.5,2.5], [2,2]
            ]);
        });
        it("registerWay works for 2 and 1 (stops)", function() {
            reg(someWayObjs[0]);
            reg(someWayObjs[1]);
            expect(_.values(u).length).toEqual(1);
            expect(_.values(p).length).toEqual(1);
            expect(_.first(_.values(p)).latLngs).toEqual([
                [2,2], [1.5,1.5], [1,1]
            ]);
            expect(_.first(_.values(u)).latLngs).toEqual([
                [3,3], [2.5,2.5], [2,2]
            ]);
        });
        it("registerWay works for 1, 2, and 3 (stops)", function() {
            reg(someWayObjs[0]);
            reg(someWayObjs[1]);
            reg(someWayObjs[2]);
            expect(_.values(u).length).toEqual(0);
            expect(_.values(p).length).toEqual(2);
            expect(_.first(_.values(p)).latLngs).toEqual([
                [2,2], [1.5,1.5], [1,1]
            ]);
            expect(_.last(_.values(p)).latLngs).toEqual([
                [4,4], [3.5,3.5], [3,3], [2.5,2.5], [2,2]
            ]);
        });
        it("registerWay works for 1, 2, and 3 (different order)", function() {
            reg(someWayObjs[2]);
            reg(someWayObjs[0]);
            reg(someWayObjs[1]);

            expect(_.values(u).length).toEqual(0);
            expect(_.values(p).length).toEqual(2);
            expect(_.first(_.values(p)).latLngs).toEqual([
                [2,2], [1.5,1.5], [1,1]
            ]);
            expect(_.last(_.values(p)).latLngs).toEqual([
                [2,2], [2.5,2.5], [3,3], [3.5,3.5], [4,4]
            ]);
        });

    });



});

