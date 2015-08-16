var Grid = require('../app/classes/grid')
var requirejs = require('requirejs')

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
        [1, 2, 2, 2, 2],
        [5, 1, 3, 5, 9],
        [0, 1, 2, 3, 4]
    ]

    var allMatches33= [
        ['gem', 'gem', 'gem'],
        ['gem', 'gem', 'gem'],
        ['gem', 'gem', 'gem']
    ]

    var grid55 = new Grid({width: 5, height: 5})
    var grid33 = new Grid({width: 3, height: 3})

    describe('#getMatches()', function () {
        describe('when having a single row match', function() {
            before(function() {
                grid55.setPieces(singleRowMatch55)
            })

            it('returns a single match', function () {
                grid55.getMatches().length.should.be.equal(1)
            })
        })

        describe('when having no matches', function() {
            before(function() {
                grid55.setPieces(noMatches55)
            })

            it('returns an empty matches array', function () {
                grid55.getMatches().length.should.be.equal(0)
            })
        })

        describe('when having all matches on 3x3 grid', function() {
            before(function() {
                grid33.setPieces(allMatches33)
            })

            it('returns six matches', function () {
                grid33.getMatches().length.should.be.equal(6)
            })
        })
    })
})
