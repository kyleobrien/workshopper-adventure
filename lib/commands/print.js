exports.menu = false
exports.handler = function print(shop, argv) {
  var selected = argv._.length > 1 ? argv._.slice(1).join(' ') : shop.appStorage.get('current')
  if (/[0-9]+/.test(selected)) {
    selected = shop.exercises[parseInt(selected-1, 10)] || selected
  } else {
    selected = shop.exercises.filter(function (exercise) {
      return selected === shop.__('exercise.' + exercise)
    }.bind(shop))[0] || selected;
  }
  shop.printExercise(selected)
}