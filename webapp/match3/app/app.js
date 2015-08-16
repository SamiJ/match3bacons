define(function (require) {

// libraries
    var $ = require('jquery')
    var _ = require('underscore')
    var Bacon = require('bacon')
    var Grid = require('Grid')
    require('bacon.model')
    require('bacon.jquery')

// dev stuff
    $.fn.asEventStream = Bacon.$.asEventStream //NOTE: explicit monkey patching here so loading order doesn't matter
    var debug = true
    var LOG = debug ? console.log.bind(console) : function () {
    }

// vars
    var START_TIME = 10
    var ITEM_WIDTH = 100
    var TIMER_TICK_MS = 800
    var TIMER_MIN_DELAY_MS = 400
    var TIMER_TICK = -1 // set to 0 to disable timer, -1 to enable
    var PIG_SCORE_MULTIPLIER = 2
    var PIG_TIME_BONUS = 2
    var TYPES = ['chicken', 'giraffe', 'goat', 'pig']
    var highScore = localStorage.getItem('highscore') || 0
    var grid = new Grid({width: 5, height: 5, matchesNeeded: 3})

// jquery
    var $gameArea = $('.gameArea')
    var $highScore = $('.high-score')
    var $score = $('.score')
    var $timer = $('.time')


// event streams
    var matchesBus = new Bacon.Bus()

    var timerInterval = Bacon.fromBinder(function (sink) {
        delay(TIMER_TICK_MS)

        function delay(delayMs) {
            setTimeout(function () {
                sink(TIMER_TICK)
                if (delayMs > TIMER_MIN_DELAY_MS) {
                    delay(delayMs - 2)
                } else {
                    delay(delayMs)
                }
            }, delayMs)
        }
    })

    var bonusTimeStream = matchesBus
        .map(matchesToTimeBonus)

    var timeLeftProperty = timerInterval
        .merge(bonusTimeStream)
        .scan(START_TIME, add)
        .takeWhile(isPositive)

    var scoreProperty = matchesBus
        .map(matchesToPoints)
        .scan(0, add)
        .skipDuplicates()

    var highScoreProperty = scoreProperty
        .map(Math.max, highScore)
        .skipDuplicates()

    var pieceSelectedStream = $gameArea
        .asEventStream('click', '.piece', getPieceAndElFromClickEvent)
        .takeWhile(timeLeftProperty)

    var selectedPiecesProperty = pieceSelectedStream
        .withStateMachine([], selectedPiecesStateMachine)
        .takeWhile(timeLeftProperty)

    var fadeMatchingPiecesRequestStream = matchesBus
        .map(matchesTo$pieces)
        .filter(isNotEmpty)

    var fadeMatchingPiecesResponseStream = fadeMatchingPiecesRequestStream
        .flatMap(function ($matchingPieces) {
            return Bacon.fromPromise($.when($matchingPieces.fadeTo(500, 0)))
        })

    var fallingPiecesStream = fadeMatchingPiecesResponseStream
        .map(function () {
            return grid.applyGravity().concat(createNewPieces())
        })
        .filter(isNotEmpty)

    var availableMovesStream = matchesBus
        .filter(isEmpty)
        .map(function () {
            return grid.getAvailableMoves()
        })

    var fallingPiecesAnimationFinished = fallingPiecesStream
        .flatMap(animateFallingPieces)

// event stream handlers
    timeLeftProperty.onValue(function (x) {
        $timer.text(x)
    })

    timeLeftProperty.onEnd(function () {
        $gameArea.animate({opacity: 0.2}, 1000)
        $timer.text('GAME OVER')
    })

    selectedPiecesProperty.onValue(function (pieces) {
        $('.piece').removeClass('highlight')
        if (!pieces || pieces.length === 0) {
            return
        }
        if (pieces.length === 1) {
            $(pieces[0].el).addClass('highlight')
        } else {
            swap(pieces)
        }
    })

    fadeMatchingPiecesResponseStream
        .onValue(function ($fadedPieces) {
            $fadedPieces.remove();
        })

    fallingPiecesAnimationFinished
        .onValue(function () {
            matchesBus.push(grid.clearMatches())
        })

    scoreProperty.onValue(function (score) {
        $score.text('Score: ' + score)
    })

    highScoreProperty.onValue(function (highScore) {
        localStorage.setItem('highscore', highScore)
    })

    fadeMatchingPiecesRequestStream
        .onValue($.noop)

    availableMovesStream
        .filter(isEmpty)
        .onValue(recreateGameArea)

// Functions
    function init() {
        $highScore.text('Highscore: ' + highScore)
        fillWithRandomPieces(grid)
        render(grid)
        matchesBus.push(grid.clearMatches())
    }

    function matchesToPoints(matches) {
        var p = 0
        matches.forEach(function (match) {
            if (match[0].type === 'pig') {
                p += match.length * PIG_SCORE_MULTIPLIER
            } else {
                p += match.length
            }
        })
        return p
    }

    function matchesToTimeBonus(matches) {
        if (isEmpty(matches)) return 0

        return _.reduce(matches, function (memo, match) {
            return match[0].type === 'pig'
                ? memo + match.length - 2 + PIG_TIME_BONUS
                : memo + match.length - 2
        }, 0)
    }

    function matchesTo$pieces(matches) {
        var $allMatchingPieces = $()
        _.forEach(matches, function (match) {
            _.forEach(match, function (piece) {
                $allMatchingPieces = $allMatchingPieces.add($findPiece(piece))
            })
        })
        return $allMatchingPieces
    }

    function selectedPiecesStateMachine(previousState, event) {
        var newState = []
        var value = event.hasValue() ? event.value() : null
        if (previousState.length === 0 || previousState.length === 2) {
            newState = [value]
        } else if (previousState.length === 1 && !_.isEqual(previousState[0], value)) {
            newState = [previousState[0], value]
        }
        return [newState, [new Bacon.Next(newState)]]
    }

    function fillWithRandomPieces(grid) {
        grid.setPieces(_.map(grid.getPieces(), function (row) {
            return _.map(row, function () {
                return _.sample(TYPES)
            })
        }))
    }

    function render(grid) {
        $gameArea.empty()
        grid.getPieces().forEach(function (row) {
            _.chain(row)
                .filter(function (piece) {
                    return piece.type !== 'empty'
                })
                .forEach(function (piece) {
                    $gameArea.append(create$Piece(piece))
                })
        })
    }

    function create$Piece(piece) {
        var $piece = $('<div class="piece"></div>')
        $piece
            .data({'x': piece.x, 'y': piece.y, 'type': piece.type})
            .css({'left': piece.x * ITEM_WIDTH, 'top': piece.y * ITEM_WIDTH})
            .addClass(piece.type)
        return $piece
    }

    function isPositive(number) {
        return number >= 0;
    }

    function getPieceAndElFromClickEvent(event) {
        var $target = $(event.target)
        return {
            piece: grid.getPiece($target.data('x'), $target.data('y')),
            el: event.target
        }
    }

    function recreateGameArea() {
        $.when($('.piece', $gameArea).animate({opacity: "0"}, 500))
            .done(function () {
                fillWithRandomPieces(grid)
                render(grid)
                $('.piece', $gameArea).css({opacity: "0"})
                $.when($('.piece', $gameArea).animate({opacity: "1"}, 500))
                    .done(function () {
                        matchesBus.push(grid.clearMatches())
                    })
            })
    }

    function createNewPieces() {
        var newPieces = []
        var emptyCount = grid.getEmptyPiecesPerColumn()
        emptyCount.forEach(function (emptyCount, colIndex) {
            for (var rowIndex = 0; rowIndex < emptyCount; rowIndex++) {
                var type = _.sample(TYPES)
                var newPiece = {
                    x: colIndex,
                    y: (rowIndex - emptyCount),
                    type: type
                }
                grid.setPiece(colIndex, rowIndex, {x: colIndex, y: rowIndex, type: newPiece.type})
                $gameArea.append(create$Piece(newPiece))
                newPieces.push({x: newPiece.x, y: newPiece.y, move: emptyCount})
            }
        })
        return newPieces
    }

    function animateFallingPieces(fallingPieces) {
        var animations = []
        fallingPieces.forEach(function (piece) {
            var movePx = ITEM_WIDTH * piece.move
            var $p = $findPiece(piece)
            $p.data('y', $p.data('y') + piece.move)
            animations.push($p.animateE({top: '+=' + movePx + 'px'}, fallDuration(piece), easeInQuad))
        })
        function fallDuration(piece) {
            return 250 * Math.sqrt(piece.move)
        }

        return Bacon.combineAsArray(animations)
    }

    function swap(selection) {
        var p1 = selection[0].piece
        var p2 = selection[1].piece

        if (isHorizontalNeighbour(p1, p2) || isVerticalNeighbour(p1, p2)) {
            var originalP1Type = p1.type
            var originalP2Type = p2.type
            p1.type = originalP2Type
            p2.type = originalP1Type
            if (grid.getMatches().length > 0) {
                render(grid)
                matchesBus.push(grid.clearMatches())
            } else {
                p1.type = originalP1Type
                p2.type = originalP2Type
            }
        }

        function isHorizontalNeighbour(p1, p2) {
            return (Math.abs(p1.x - p2.x) === 1 && Math.abs(p1.y - p2.y) === 0)
        }

        function isVerticalNeighbour(p1, p2) {
            return (Math.abs(p1.x - p2.x) === 0 && Math.abs(p1.y - p2.y) === 1)
        }
    }

    function $findPiece(piece) {
        return $('.piece').filter(function () {
            var $this = $(this)
            return $this.data('x') === piece.x && $this.data('y') === piece.y
        })
    }

    function easeInQuad(t, b, c, d) {
        t /= d
        return c * t * t + b
    }

    function add(x, y) {
        return x + y
    }

    function isEmpty(array) {
        return array.length === 0
    }

    function isNotEmpty(array) {
        return !isEmpty(array)
    }

    return {init: init}
})
