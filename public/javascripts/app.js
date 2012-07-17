(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return require(absolute);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    definition(module.exports, localRequire(name), module);
    var exports = cache[name] = module.exports;
    return exports;
  };

  var require = function(name) {
    var path = expand(name, '.');

    if (has(cache, path)) return cache[path];
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex];
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '"');
  };

  var define = function(bundle) {
    for (var key in bundle) {
      if (has(bundle, key)) {
        modules[key] = bundle[key];
      }
    }
  }

  globals.require = require;
  globals.require.define = define;
  globals.require.brunch = true;
})();

window.require.define({"game": function(exports, require, module) {
  (function() {
    var assets, game, state;

    state = require('state');

    game = new Rogue.Game({
      fps: true
    });

    game.input = new Rogue.KeyboardManager(game.canvas);

    game.mouse = new Rogue.Mouse(game);

    game.assets = assets = new Rogue.AssetManager();

    assets.add(['img/1.png', 'img/2.png', 'img/b1.png', 'img/b2.png', 'sound/jump.ogg', 'sound/jump.mp3']);

    assets.loadAll({
      onFinish: function() {
        console.log("Assets Loaded");
        return game.start(state);
      },
      onLoad: function(p) {
        return console.log("Assets Loading: " + p + "%");
      }
    });

    module.exports = game;

  }).call(this);
  
}});

window.require.define({"initialize": function(exports, require, module) {
  (function() {

    Rogue.ready(function() {
      return window.game = require('game');
    });

  }).call(this);
  
}});

window.require.define({"state": function(exports, require, module) {
  (function() {
    var state;

    state = {
      setup: function() {
        var bg1, bg2, blocks, tiles, x, _ref;
        console.log("setup run");
        this.sounds = new Rogue.SoundBox(this.assets.sound);
        this.sounds.func("jump", "sound/jump");
        this.sprites = new Rogue.SpriteSheet({
          image: this.assets.get('img/2.png'),
          res: [16, 16]
        });
        this.viewport = new Rogue.ViewPort({
          parent: this,
          viewWidth: 1000,
          viewHeight: 400
        });
        bg1 = new Rogue.Entity({
          name: "bg1",
          image: this.assets.get('img/b1.png'),
          speed: 0.5,
          repeatX: true,
          require: ["layer"]
        });
        bg2 = new Rogue.Entity({
          name: "bg2",
          image: this.assets.get('img/b2.png'),
          speed: 0.9,
          repeatX: true,
          require: ["layer"]
        });
        game.player = new Rogue.Entity({
          name: "player",
          image: this.assets.get('img/2.png'),
          require: ["move", "collide", "AABB", "gravity"],
          onHit: function(col) {
            if (col.dir === "bottom") return this.canJump = true;
          }
        });
        tiles = new Rogue.TileMap({
          name: "tiles",
          y: 300,
          size: [30, 1]
        });
        this.viewport.add([bg2, bg1, game.player, tiles]);
        this.viewport.updates[98] = function() {
          this.follow(this.player);
          return this.forceInside(this.player, false);
        };
        blocks = [];
        for (x = 0, _ref = this.viewport.tiles.size[0]; 0 <= _ref ? x < _ref : x > _ref; 0 <= _ref ? x++ : x--) {
          blocks.push(new Rogue.Entity({
            image: this.assets.get('img/1.png'),
            x: x,
            y: 0,
            require: ["sprite", "collide", "AABB"]
          }));
        }
        return this.viewport.tiles.place(blocks);
      },
      update: function() {
        if (this.input.pressed("right")) this.player.move(2, 0);
        if (this.input.pressed("left")) this.player.move(-2, 0);
        if (this.input.pressed("up")) {
          if (this.player.canJump) {
            this.sounds.jump();
            this.player.canJump = false;
            this.player.dy = 17;
          }
        }
        if (this.input.pressed("down")) this.player.move(0, 2);
        return this.viewport.update();
      },
      draw: function() {
        this.clear();
        return this.viewport.draw();
      }
    };

    module.exports = state;

  }).call(this);
  
}});

