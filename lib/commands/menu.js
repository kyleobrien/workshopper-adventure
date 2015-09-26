var chalk = require('chalk')

exports.handler = function (shop) {
  var __ = shop.i18n.__
    , completed = shop.appStorage.get('completed') || []
    , isCommandInMenu = function (extra) {
        if (typeof extra.filter === 'function' && !extra.filter(shop)) {
          return false
        } 
        return extra.menu !== false
      }
    , exitCommand = {
        name: 'exit',
        handler: process.exit.bind(process, 0)
      }

  shop.options.menuFactory.create({
    title: __('title'),
    subtitle: shop.i18n.has('subtitle') && __('subtitle'),
    menu: shop.exercises.map(function (exercise) {
        return {
          label: chalk.bold('»') + ' ' + __('exercise.' + exercise),
          marker: (completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed') + ']' : '',
          handler: shop.printExercise.bind(shop, exercise)
        };
      }),
    extras: shop.cli.commands.concat()
      .reverse()
      .filter(isCommandInMenu)
      .concat(exitCommand)
      .map(function (command) {
        return {
          label: __('menu.' + command.name),
          handler: command.handler.bind(command, shop)
        };
      })
    
  });
}
exports.menu = false