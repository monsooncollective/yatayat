var someWayObjs = [
    {startNodeID: 1, endNodeID: 2, latLngs: [[1.0, 1.0], [1.5,1.5], [2.0,2.0]] },
    {startNodeID: 2, endNodeID: 3, latLngs: [[2.0, 2.0], [2.5,2.5], [3.0,3.0]] },
    {startNodeID: 4, endNodeID: 3, latLngs: [[4.0, 4.0], [3.5,3.5], [3.0,3.0]] }
];


describe("Converstion from OSM 2 YY objects", function () {
    describe("false Happiness", function() {
        it("1 == 1", function() {
            expect(1).toEqual(1);
        });
    });
    describe( "registerWay", function () {
        var reg, p, u, b, f;
        beforeEach(function() {
            p = {}, u = {}, b = {}, f = {};
            reg = O2Y.registerWay(p, u, b, f);
        })
        it("registerWay works for size 1 false", function() {
            reg(someWayObjs[0], false, false);
            expect(_.values(p).length).toEqual(0);
            expect(_.values(u).length).toEqual(1);
            expect(_.values(b).length).toEqual(1);
            expect(_.values(f).length).toEqual(1);
            expect(_.first(_.values(u)).latLngs).toContain([1.5,1.5]);
        });
        it("registerWay works for size 1 true", function() {
            reg(someWayObjs[0], true, true);
            expect(_.values(p).length).toEqual(1);
            expect(_.values(u).length).toEqual(0);
            expect(_.values(b).length).toEqual(0);
            expect(_.values(f).length).toEqual(0);
            expect(_.first(_.values(p)).latLngs).toContain([1.5,1.5]);
        });
        it("registerWay works for 1 and 2", function() {
            reg(someWayObjs[0], false, true);
            reg(someWayObjs[1], true, true);
            expect(_.values(p).length).toEqual(1);
            expect(_.values(u).length).toEqual(0);
            console.log(p);
            expect(_.first(_.values(p)).latLngs).toContain([1.5,1.5]);
            expect(_.first(_.values(p)).latLngs).toContain([2.5,2.5]);
        });

});


});

