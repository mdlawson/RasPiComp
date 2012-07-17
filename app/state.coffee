state =
	setup: ->
		console.log "setup run"
		@sounds = new Rogue.SoundBox(@assets.sound)
		@sounds.func("jump","sound/jump")

		@sprites = new Rogue.SpriteSheet
			image: @assets.get 'img/2.png'
			res: [16,16]

		@viewport = new Rogue.ViewPort
			parent: @
			viewWidth: 1000
			viewHeight: 400

		bg1 = new Rogue.Entity
			name: "bg1"
			image: @assets.get 'img/b1.png'
			speed: 0.5
			repeatX: true
			require: ["layer"]
		bg2 = new Rogue.Entity
			name: "bg2"
			image: @assets.get 'img/b2.png'
			speed: 0.9
			repeatX: true
			require: ["layer"]

		game.player = new Rogue.Entity
			name: "player"
			image: @assets.get 'img/2.png'
			require: ["move","collide","AABB","gravity"]
			onHit: (col) -> if col.dir is "bottom" then @canJump = true 

		tiles = new Rogue.TileMap
			name: "tiles"
			y: 300
			size: [30,1]

		@viewport.add [bg2, bg1, game.player, tiles]
		@viewport.updates[98] = ->
			@follow @player
			@forceInside @player, false

		blocks = []
		blocks.push(new Rogue.Entity({image: @assets.get('img/1.png'), x: x, y: 0, require: ["sprite","collide","AABB"]})) for x in [0...@viewport.tiles.size[0]]
		
		@viewport.tiles.place blocks

	update: ->
		if @input.pressed("right")
			@player.move(2,0)
		if @input.pressed("left")
			@player.move(-2,0)
		if @input.pressed("up")
			if @player.canJump
				@sounds.jump()
				@player.canJump = false
				@player.dy = 17
		if @input.pressed("down")
			@player.move(0,2)

		#app.player.image = app.animation.next()
		@viewport.update()
	draw: ->
		@clear()
		@viewport.draw()

module.exports = state