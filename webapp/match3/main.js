define(function () {
    require.config({
        paths: {
            'bacon.model': '../node_modules/bacon.model/dist/bacon.model',
            'bacon.jquery': '../node_modules/bacon.jquery/dist/bacon.jquery',
            'bacon': '../node_modules/baconjs/dist/bacon',
            'jquery': '../node_modules/jquery/dist/jquery',
            'underscore': '../node_modules/underscore/underscore',
            'Grid': './app/classes/grid'
        }
    })

    require(['./app/app'], function (app) {
        app.init()
    })
})
