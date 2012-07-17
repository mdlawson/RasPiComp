state = require 'state'

game = new Rogue.Game
	fps: true
game.input = new Rogue.KeyboardManager game.canvas
game.mouse = new Rogue.Mouse game
game.assets = assets = new Rogue.AssetManager()

assets.add ['img/1.png','img/2.png','img/b1.png','img/b2.png', 'sound/jump.ogg', 'sound/jump.mp3']
assets.loadAll
	onFinish: ->
		console.log "Assets Loaded"
		game.start state
	onLoad: (p) -> console.log "Assets Loading: #{p}%"

module.exports = game
