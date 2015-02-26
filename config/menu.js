/**
 * Created by leonid.raizmen on 19/02/2015.
 */
module.exports = function () {
    var menu = { top : [
        {id : 'pages', sub : ['login', 'profile', 'settings']},
        {id : 'panels', sub : ['simple', 'buttons', 'input']},
        {id : 'popups', sub : ['alert', 'confirm', 'input', 'content']},
        {id : 'tables', sub : ['simple', 'advanced', 'tree', 'details']},
        {id : 'forms', sub : ['profile', 'address', 'registration']},
    ]};

    return menu;
}