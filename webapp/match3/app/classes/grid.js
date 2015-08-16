/*
 the grid

 pieces == [rows] (fix this?, array of pieces with x,y)
 row == [piece]

 x/y
 0       1       2
 0   (0,0)   (1,0)   (2,0)
 1   (0,1)   (1,1)   (2,1)
 2   (0,2)   (1,2)   (2,2)

 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function (require) {
    var _ = require('underscore')

    var EMPTY_TYPE = 'empty'

    function Grid(options) {
        options = options || {}
        this.gravity = options.gravity || 'down'
        this.width = options.width || 10
        this.height = options.height || 10
        this.matchesNeeded = options.matchesNeeded || 3
        this.pieces = []
        fillPieces.call(this);

        function fillPieces() {
            var that = this
            for (var i = 0; i < that.height; i++) {
                that.pieces.push(new Array(that.width))
            }
            for (var x = 0; x < that.width; x++) {
                for (var y = 0; y < that.height; y++) {
                    that.pieces[y][x] = new Piece(x, y)
                }
            }
        }

        Grid.prototype.getMatches = function () {
            var that = this
            var matches = []

            this.getRows().concat(this.getColumns()).forEach(function (line) {
                var matchesInLine = _.flatten(getMatchesIn(line))
                if (!_.isEmpty(matchesInLine)) matches.push(matchesInLine)
            })

            function getMatchesIn(array) {
                return getMatchesLoop(array, 0, [], [])

                function getMatchesLoop(array, index, match, matches) {
                    if (index >= array.length) {
                        if (match.length >= that.matchesNeeded) matches.push(match)
                        return matches
                    }

                    if ((match.length === 0 || match[0].type === array[index].type) && array[index].type != EMPTY_TYPE) {
                        match.push(array[index])
                    } else {
                        if (match.length >= that.matchesNeeded) {
                            matches.push(match)
                        }
                        match = [array[index]]
                    }

                    return getMatchesLoop(array, ++index, match, matches)
                }
            }

            return matches
        }

        Grid.prototype.clearMatches = function () {
            var that = this
            var matches = this.getMatches()
            _.forEach(matches, function (match) {
                _.forEach(match, function (p) {
                    that.setPiece(p.x, p.y, new Piece(p.x, p.y, EMPTY_TYPE))
                })
            })

            return matches
        }

        // returns an array of objects containing the x,y and amount of fall
        // [{x: 1, y: 3, move: 2}, ...]
        Grid.prototype.applyGravity = function () {
            var that = this
            if (!that.gravity) return []

            var fallingPieces = [];

            for (var x = 0; x < that.width; x++) {
                var col = this.getColumns()[x]
                var drop = 0

                for (var y = (col.length - 1); y >= 0; y--) {
                    if (col[y].type === EMPTY_TYPE) {
                        drop++
                    } else if (drop > 0) {
                        fallingPieces.push({x: x, y: y, move: drop})
                    }
                }
            }
            that.movePieces(fallingPieces)
            return fallingPieces
        }

        Grid.prototype.movePieces = function (movingPieces) {
            var that = this
            movingPieces.forEach(function (mover) {
                var p = that.getPiece(mover.x, mover.y)
                p.y += mover.move
                if (that.getPiece(p.x, p.y).type != EMPTY_TYPE) console.log('ERROR: Moved on actual piece')
                that.setPiece(mover.x, mover.y, new Piece(mover.x, mover.y, EMPTY_TYPE))
                that.setPiece(p.x, p.y, p)
            })
        }

        Grid.prototype.setPieces = function (pieceTypesMatrix) {
            var that = this
            for (var rowIndex = 0; rowIndex < that .height; rowIndex++) {
                for (var columnIndex = 0; columnIndex < that .width; columnIndex++) {
                    this.setPiece(columnIndex, rowIndex, new Piece(columnIndex, rowIndex, pieceTypesMatrix[rowIndex][columnIndex]))
                }
            }
        }

        Grid.prototype.getPieces = function () {
            var that = this
            return that.pieces
        }

        Grid.prototype.getPiece = function (columnIndex, rowIndex) {
            var piece
            var that = this
            try {
                piece = that.pieces[rowIndex][columnIndex]
            } catch (e) {
                console.log('Invalid coords, x: ' + columnIndex + ', y: ' + rowIndex)
            }
            return piece
        }

        Grid.prototype.setPiece = function (columnIndex, rowIndex, piece) {
            var that = this
            that.pieces[rowIndex][columnIndex] = piece
        }

        Grid.prototype.debugPrint = function() {
            var that = this
            var output = ''
            _.range(that.height).forEach(function(y) {
                _.range(that.width).forEach(function(x) {
                    output += toFiveChars(that.getPiece(x,y).type) + ' '
                })
                output += '\n'
            })

            console.log(output)

            function toFiveChars(str) {
                return (str.toString() + '     ').slice(0,5)
            }
        }

        Grid.prototype.getEmptyPiecesPerColumn = function() {
            var emptyCols = []
            this.getColumns().forEach(function(col) {
                emptyCols.push(_.filter(col, function(p) { return p.type === EMPTY_TYPE}).length)
            })
            return emptyCols
        }

        Grid.prototype.getRows = function() {
            return this.getPieces()
        }

        Grid.prototype.getColumns = function() {
            return _.zip.apply(this, this.getPieces())
        }

        Grid.prototype.swap = function(piece1, piece2) {
            this.setPiece(piece2.x, piece2.y, new Piece(piece2.x, piece2.y, piece1.type))
            this.setPiece(piece1.x, piece1.y, new Piece(piece1.x, piece1.y, piece2.type))
        }

        // returns array of objects like {x, y, direction: "right" / "down"}
        Grid.prototype.getAvailableMoves = function() {
            if (this.getMatches().length > 0) return []
            var moves = []
            var that = this
            that.getRows().forEach(function(row) {
                row.forEach(function(p) {
                    if (p.x + 1 < that.width) {
                        moves.push(getMoves(p,that.getPiece(p.x+1, p.y), "right"))
                    }
                    if (p.y + 1 < that.height) {
                        moves.push(getMoves(p,that.getPiece(p.x, p.y+1), "down"))
                    }
                })
            })

            return _.filter(moves, function(m) {return m != undefined})

            function getMoves(p1, p2, directionStr) {
                var move
                that.swap(p1, p2)
                if (that.getMatches().length > 0) {
                    move = {x: p1.x, y: p1.y, direction: directionStr}
                }
                that.swap(that.getPiece(p1.x, p1.y), that.getPiece(p2.x, p2.y))
                return move
            }
        }
    }

    function Piece(x, y, type) {
        return {
            x: x,
            y: y,
            type: type
        }
    }

    return Grid
})
