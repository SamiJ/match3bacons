var Grid = require('../app/classes/grid')
var requirejs = require('requirejs')
var should = require('should')

requirejs.config({
    nodeRequire: require
})

describe('grid', function() {
    var noMatches55 = [
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [1, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [0, 1, 2, 3, 4]
    ]

    var singleRowMatch55 = [
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [1, 'empty', 'empty', 'empty', 'empty'],
        [5, 1, 'empty', 5, 9],
        [0, 1, 2, 3, 4]
    ]


    var matches55 = [
        [0, 'empty', 2, 3, 4],
        [5, 'empty', 7, 8, 9],
        ['empty', 'empty', 'empty', 1, 2],
        [5, 'empty', 1, 5, 9],
        [0, 1, 2, 3, 4]
    ]

    var matches2_55 = [
        ['empty', 'empty', 'empty', 3, 'empty'],
        [2, 2, 'empty', 8, 'empty'],
        [1, 1, 'empty', 1, 'empty'],
        [3, 2, 'empty', 5, 'empty'],
        [1, 'empty', 'empty', 'empty', 4]
    ]

    var allMatches33= [
        ['gem', 'gem', 'gem'],
        ['gem', 'gem', 'gem'],
        ['gem', 'gem', 'gem']
    ]

    var grid55 = new Grid({width: 5, height: 5})
    var grid33 = new Grid({width: 3, height: 3})

    describe('#applyGravity()', function() {
        describe('when having a single row match', function() {
            before(function() {
                grid55.setPieces(singleRowMatch55)
            })

            it('should return 6 falling pieces', function() {
                grid55.applyGravity().length.should.be.equal(8)
                grid55.debugPrint()
            })
        })

        describe('when having a multiple matches', function () {
            before(function () {
                grid55.setPieces(matches55)
            })

            it('should return 4 falling pieces', function () {
                grid55.applyGravity().length.should.be.equal(4)
                grid55.debugPrint()
            })
        })


        describe('when having a empty column', function () {
            before(function () {
                grid55.setPieces(matches2_55)
            })

            it('should return 7 falling pieces', function () {
                grid55.applyGravity().length.should.be.equal(7)
                grid55.debugPrint()
            })
        })

        describe('when having no matches', function() {
            before(function() {
                grid55.setPieces(noMatches55)
            })

            it('should return an empty array', function() {
                grid55.applyGravity().length.should.be.equal(0)
            })
        })

        describe('when having all matches on 3x3 grid', function() {
            before(function() {
                grid33.setPieces(allMatches33)
            })

            it('should return an empty array', function() {
                grid33.applyGravity().length.should.be.equal(0)
            })
        })
    })
})
