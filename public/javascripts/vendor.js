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

// lib/handlebars/base.js
var Handlebars = {};

Handlebars.VERSION = "1.0.beta.6";

Handlebars.helpers  = {};
Handlebars.partials = {};

Handlebars.registerHelper = function(name, fn, inverse) {
  if(inverse) { fn.not = inverse; }
  this.helpers[name] = fn;
};

Handlebars.registerPartial = function(name, str) {
  this.partials[name] = str;
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Could not find property '" + arg + "'");
  }
});

var toString = Object.prototype.toString, functionType = "[object Function]";

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;


  var ret = "";
  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      for(var i=0, j=context.length; i<j; i++) {
        ret = ret + fn(context[i]);
      }
    } else {
      ret = inverse(this);
    }
    return ret;
  } else {
    return fn(context);
  }
});

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var ret = "";

  if(context && context.length > 0) {
    for(var i=0, j=context.length; i<j; i++) {
      ret = ret + fn(context[i]);
    }
  } else {
    ret = inverse(this);
  }
  return ret;
});

Handlebars.registerHelper('if', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if(!context || Handlebars.Utils.isEmpty(context)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  options.fn = inverse;
  options.inverse = fn;

  return Handlebars.helpers['if'].call(this, context, options);
});

Handlebars.registerHelper('with', function(context, options) {
  return options.fn(context);
});

Handlebars.registerHelper('log', function(context) {
  Handlebars.log(context);
});
;
// lib/handlebars/utils.js
Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  for (var p in tmp) {
    if (tmp.hasOwnProperty(p)) { this[p] = tmp[p]; }
  }

  this.message = tmp.message;
};
Handlebars.Exception.prototype = new Error;

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

(function() {
  var escape = {
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var badChars = /&(?!\w+;)|[<>"'`]/g;
  var possible = /[&<>"'`]/;

  var escapeChar = function(chr) {
    return escape[chr] || "&amp;";
  };

  Handlebars.Utils = {
    escapeExpression: function(string) {
      // don't escape SafeStrings, since they're already safe
      if (string instanceof Handlebars.SafeString) {
        return string.toString();
      } else if (string == null || string === false) {
        return "";
      }

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    },

    isEmpty: function(value) {
      if (typeof value === "undefined") {
        return true;
      } else if (value === null) {
        return true;
      } else if (value === false) {
        return true;
      } else if(Object.prototype.toString.call(value) === "[object Array]" && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }
  };
})();;
// lib/handlebars/runtime.js
Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          return Handlebars.VM.program(fn, data);
        } else if(programWrapper) {
          return programWrapper;
        } else {
          programWrapper = this.programs[i] = Handlebars.VM.program(fn);
          return programWrapper;
        }
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop
    };

    return function(context, options) {
      options = options || {};
      return templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);
    };
  },

  programWithDepth: function(fn, data, $depth) {
    var args = Array.prototype.slice.call(arguments, 2);

    return function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
  },
  program: function(fn, data) {
    return function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial);
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;
;
;

// Generated by CoffeeScript 1.3.3
(function() {
  var Animation, AssetManager, Entity, Game, GameLoop, KeyboardManager, Mouse, Rogue, RollingAverage, SoundBox, SpriteSheet, TileMap, ViewPort, c, collision, find, gfx, log, math, util,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  gfx = {};

  gfx.scale = function(simg, s, pixel) {
    var ctx, dimg;
    dimg = util.canvas();
    dimg.width = simg.width * s[0];
    dimg.height = simg.height * s[1];
    ctx = dimg.getContext("2d");
    ctx.scale(s[0], s[1]);
    if (pixel) {
      if (ctx.mozImageSmoothingEnabled != null) {
        ctx.mozImageSmoothingEnabled = false;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(simg, 0, 0, simg.width, simg.height);
      } else {
        ctx.fillStyle = ctx.createPattern(simg, 'repeat');
        ctx.fillRect(0, 0, simg.width, simg.height);
      }
    } else {
      ctx.drawImage(simg, 0, 0, simg.width, simg.height);
    }
    return dimg;
  };

  gfx.edit = function(data, x, y, r, g, b, a) {
    var darray, index;
    darray = data.data;
    index = (y * data.width + x) * 4;
    if (r || g || b || a) {
      darray[index] = r || 0;
      darray[index++] = g || 0;
      darray[index++] = b || 0;
      darray[index++] = a || 0;
      return data.data = darray;
    } else {
      return [darray[index], darray[index++], darray[index++], darray[index++]];
    }
  };

  gfx.edgeDetect = function(img) {
    var ctx, data, lookup, points, x, y, _i, _j, _ref, _ref1;
    ctx = img.getContext("2d");
    data = ctx.getImageData(0, 0, img.width, img.height);
    lookup = function(x, y) {
      return gfx.edit(data, x, y)[3];
    };
    points = [];
    for (x = _i = 0, _ref = img.width; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
      for (y = _j = 0, _ref1 = img.height; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
        if (lookup(x, y) > 0) {
          if (lookup(x + 1, y) === 0) {
            points.push([x, y, "right"]);
          } else if (lookup(x - 1, y) === 0) {
            points.push([x, y, "left"]);
          } else if (lookup(x, y + 1) === 0) {
            points.push([x, y, "down"]);
          } else if (lookup(x, y - 1) === 0) {
            points.push([x, y, "up"]);
          }
        }
      }
    }
    return points;
  };

  AssetManager = (function() {

    function AssetManager() {
      this.count = 0;
      this.ecount = 0;
      this.queue = [];
      this.image = {};
      this.sound = {};
      this.filetypes = {
        image: ["png", "gif", "jpg", "jpeg", "tiff"],
        sound: ["mp3", "ogg"]
      };
    }

    AssetManager.prototype.add = function(url) {
      return this.queue = this.queue.concat(url);
    };

    AssetManager.prototype.get = function(src) {
      if (!(this[src] != null)) {
        log(2, "asset not loaded: " + src);
      }
      return this[src];
    };

    AssetManager.prototype.loadAll = function(options) {
      var a, _i, _len, _ref, _results;
      this.onFinish = options.onFinish;
      this.onLoad = options.onLoad;
      _ref = this.queue;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        a = _ref[_i];
        _results.push(this.load(a));
      }
      return _results;
    };

    AssetManager.prototype.load = function(src) {
      var asset, cb, codec, ext, key, that, type, value, _ref;
      that = this;
      ext = src.split(".").pop();
      _ref = this.filetypes;
      for (key in _ref) {
        value = _ref[key];
        if (__indexOf.call(value, ext) >= 0) {
          type = key;
        }
      }
      if (!(type != null)) {
        log(2, "unknown extension on: " + src);
        return;
      }
      switch (type) {
        case "image":
          asset = new Image();
          asset.onload = function() {
            var canvas, context;
            canvas = util.canvas();
            canvas.type = type;
            canvas.width = this.width;
            canvas.height = this.height;
            canvas.src = src;
            context = canvas.getContext("2d");
            context.drawImage(this, 0, 0, this.width, this.height);
            that.count++;
            return that.loaded(canvas);
          };
          asset.onerror = function() {
            return that.onerror(this);
          };
          return asset.src = src;
        case "sound":
          asset = new Audio(src);
          asset.type = type;
          asset.name = src;
          switch (ext) {
            case 'mp3':
              codec = 'audio/mpeg';
              break;
            case 'ogg':
              codec = 'audio/ogg';
          }
          if (!asset.canPlayType(codec)) {
            this.loaded(asset);
          }
          cb = function() {
            this.removeEventListener("canplaythrough", cb);
            that.count++;
            return that.loaded(this);
          };
          asset.addEventListener("canplaythrough", cb);
          asset.onerror = function() {
            return that.onerror(this);
          };
          return asset.load();
      }
    };

    AssetManager.prototype.onerror = function(asset) {
      this.ecount++;
      log(2, "could not load asset: " + asset.src);
      return this.loaded(asset);
    };

    AssetManager.prototype.loaded = function(asset) {
      var name, percentage;
      name = asset.name || asset.src;
      this[asset.type][name.split(".")[0]] = asset;
      this[name] = asset;
      percentage = ((this.count + this.ecount) / this.queue.length) * 100;
      this.onLoad(math.round(percentage));
      if (percentage === 100) {
        return this.onFinish();
      }
    };

    return AssetManager;

  })();

  SoundBox = (function() {

    function SoundBox(sounds, map) {
      this.sounds = sounds;
    }

    SoundBox.prototype.play = function(sound) {
      if (this.sounds[sound] != null) {
        return this.sounds[sound].play();
      }
    };

    SoundBox.prototype.pause = function(sound) {
      if (this.sounds[sound] != null) {
        return this.sounds[sound].pause();
      }
    };

    SoundBox.prototype.stop = function(sound) {
      if (this.sounds[sound] != null) {
        return this.sounds[sound].stop();
      }
    };

    SoundBox.prototype.func = function(name, asset) {
      if (this.sounds[asset] != null) {
        return this[name] = function() {
          return this.play(asset);
        };
      } else {
        return "no such sound!";
      }
    };

    return SoundBox;

  })();

  SpriteSheet = (function() {

    function SpriteSheet(options) {
      var c, cx, x, y, _i, _j, _ref, _ref1, _ref2, _ref3;
      this.options = options;
      this.img = this.options.image;
      this.res = this.options.res || [32, 32];
      this.length = 0;
      for (x = _i = 0, _ref = this.img.width, _ref1 = this.res[0]; 0 <= _ref ? _i < _ref : _i > _ref; x = _i += _ref1) {
        for (y = _j = 0, _ref2 = this.img.height, _ref3 = this.res[1]; 0 <= _ref2 ? _j < _ref2 : _j > _ref2; y = _j += _ref3) {
          c = util.canvas();
          cx = c.getContext("2d");
          c.width = this.res[0];
          c.height = this.res[1];
          cx.drawImage(this.img, x, y, c.width, c.height, 0, 0, c.width, c.height);
          this[this.length] = c;
          this.length++;
        }
      }
    }

    SpriteSheet.prototype.slice = function(start, end) {
      return Array.prototype.slice.call(this, start, end);
    };

    return SpriteSheet;

  })();

  Animation = (function() {

    function Animation(options) {
      this.options = options;
      this.sprites = this.options.spritesheet;
      this.speed = this.options.speed || 6;
      this.i = this.options.start || 0;
      this.t = 0;
      this.loop = this.options.loop || true;
      this.bounce = this.options.bounce || false;
      this.onFinish = this.options.onFinish;
      this.dir = 1;
      this.frame = this.sprites[this.i];
    }

    Animation.prototype.next = function() {
      if (this.t === this.speed) {
        this.frame = this.sprites[this.i += this.dir];
        this.t = 0;
      }
      if (this.i === this.sprites.length - 1) {
        if (!this.loop) {
          if (this.onFinish) {
            this.onFinish();
          }
        } else {
          if (this.bounce) {
            this.dir = -1;
          } else {
            this.i = 0;
          }
        }
      }
      if (this.i === 0 && this.dir === -1) {
        this.dir = 1;
      }
      this.t++;
      return this.frame;
    };

    return Animation;

  })();

  Entity = (function() {

    function Entity(options) {
      this.options = options;
      this.components = [];
      this.updates = [];
      util.mixin(this, this.options);
      if (this.require) {
        this["import"](this.require);
      }
      if (this.parent) {
        this.parent.e.push(this);
      }
    }

    Entity.prototype["import"] = function(imports) {
      return util["import"](this, imports);
    };

    Entity.prototype.update = function() {
      var func, _i, _len, _ref, _results;
      _ref = this.updates;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        func = _ref[_i];
        if (func != null) {
          _results.push(func.call(this));
        }
      }
      return _results;
    };

    return Entity;

  })();

  c = {};

  c.sprite = (function() {

    function sprite() {}

    sprite.prototype.init = function() {
      var _ref, _ref1;
      if (!this.image) {
        log(2, "Sprite entitys require an image");
      }
      if ((_ref = this.x) == null) {
        this.x = 0;
      }
      if ((_ref1 = this.y) == null) {
        this.y = 0;
      }
      if (this.scaleFactor != null) {
        return this.scale(this.scaleFactor, this.pixel);
      } else {
        return this._recalculateImage();
      }
    };

    sprite.prototype.draw = function() {
      var r;
      c = this.parent.context;
      r = math.round;
      c.save();
      c.translate(r(this.x - this.xOffset), r(this.y - this.yOffset));
      if (this.angle) {
        c.rotate(this.angle * Math.PI / 180);
      }
      if (this.alpha) {
        c.globalAlpha = this.alpha;
      }
      c.drawImage(this.image, 0, 0, this.width, this.height);
      return c.restore();
    };

    sprite.prototype.scale = function(scaleFactor, pixel) {
      this.scaleFactor = scaleFactor;
      this.pixel = pixel;
      this.y -= this.height * this.scaleFactor[1] / 2;
      this.image = gfx.scale(this.image, this.scaleFactor, this.pixel);
      return this._recalculateImage();
    };

    sprite.prototype.rect = function() {
      return {
        x: this.x - this.xOffset,
        y: this.y - this.yOffset,
        width: this.width,
        height: this.height
      };
    };

    sprite.prototype._recalculateImage = function() {
      this.width = this.image.width;
      this.height = this.image.height;
      this.xOffset = math.round(this.width / 2);
      return this.yOffset = math.round(this.height / 2);
    };

    return sprite;

  })();

  c.move = (function() {

    function move() {}

    move.prototype.init = function() {
      var _ref, _ref1;
      this["import"](["sprite"]);
      if ((_ref = this.dy) == null) {
        this.dy = 0;
      }
      if ((_ref1 = this.dx) == null) {
        this.dx = 0;
      }
      return this.updates[98] = function() {
        return this.move(math.round(this.dx), math.round(-this.dy));
      };
    };

    move.prototype.move = function(x, y) {
      this.x += x;
      return this.y += y;
    };

    move.prototype.moveTo = function(x, y) {
      this.x = x;
      this.y = y;
    };

    return move;

  })();

  c.tile = (function() {

    function tile() {}

    tile.prototype.init = function() {
      return this["import"](["sprite"]);
    };

    tile.prototype.move = function(x, y) {
      util.remove(this.tile.contents, this);
      this.x += x;
      this.y += y;
      return this.tile.parent.place(this);
    };

    tile.prototype.moveTo = function(x, y) {
      this.x = x;
      this.y = y;
      util.remove(this.tile.contents, this);
      return this.tile.parent.place(this);
    };

    tile.prototype.rect = function() {
      return {
        x: (this.res[0] * this.x) - this.xOffset,
        y: (this.res[1] * this.y) - this.yOffset,
        width: this.width,
        height: this.height
      };
    };

    return tile;

  })();

  c.collide = (function() {

    function collide() {}

    collide.prototype.init = function() {
      if (__indexOf.call(this.components, "layer") < 0) {
        return this["import"](["sprite"]);
      }
    };

    collide.prototype.findCollisions = function() {
      var col, dir, obj, solid, _i, _len;
      solid = this.parent.find(["collide"]);
      util.remove(solid, this);
      this.colliding = [];
      for (_i = 0, _len = solid.length; _i < _len; _i++) {
        obj = solid[_i];
        dir = this.collide(obj);
        if (dir) {
          col = {
            dir: dir,
            entity: obj
          };
          if (this.onHit != null) {
            this.onHit(col);
          }
          this.colliding.push(col);
        }
      }
      return this.colliding;
    };

    collide.prototype.move = function(x, y) {
      if (Math.abs(x) < 1 && Math.abs(y) < 1) {
        return false;
      }
      this.x += x;
      this.y += y;
      if (this.findCollisions().length > 0) {
        this.x -= x;
        this.y -= y;
        if (this.move(~~(x / 2), ~~(y / 2))) {
          if (!this.move(~~(x / 2), ~~(y / 2))) {
            return false;
          } else {
            return true;
          }
        } else {
          return false;
        }
      } else {
        return true;
      }
    };

    return collide;

  })();

  c.layer = (function(_super) {

    __extends(layer, _super);

    function layer() {
      return layer.__super__.constructor.apply(this, arguments);
    }

    layer.prototype.init = function() {
      var _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
      if ((_ref = this.width) == null) {
        this.width = this.image.width;
      }
      if ((_ref1 = this.height) == null) {
        this.height = this.image.height;
      }
      if ((_ref2 = this.x) == null) {
        this.x = 0;
      }
      if ((_ref3 = this.y) == null) {
        this.y = 0;
      }
      this.xOffset = this.yOffset = 0;
      if (this.scaleFactor) {
        this.scale(this.scaleFactor);
      }
      if ((_ref4 = this.repeatX) == null) {
        this.repeatX = false;
      }
      if ((_ref5 = this.repeatY) == null) {
        this.repeatY = false;
      }
      if ((_ref6 = this.scrollY) == null) {
        this.scrollY = false;
      }
      if ((_ref7 = this.scrollX) == null) {
        this.scrollX = true;
      }
      return (_ref8 = this.speed) != null ? _ref8 : this.speed = 0;
    };

    layer.prototype.draw = function(x, y) {
      var r, rect;
      if (x == null) {
        x = 0;
      }
      if (y == null) {
        y = 0;
      }
      rect = this.parent.rect();
      r = math.round;
      if (!(x > 0 || y > 0)) {
        if (this.scrollX) {
          this.x = math.round(rect.x * this.speed);
        }
        if (this.scrollY) {
          this.y = math.round(rect.y * this.speed);
        }
      }
      c = this.parent.context;
      c.save();
      if (this.angle) {
        c.rotate(this.angle * Math.PI / 180);
      }
      if (this.alpha) {
        c.globalAlpha = this.alpha;
      }
      c.translate(r(this.x + x), r(this.y + y));
      c.drawImage(this.image, 0, 0, this.width, this.height);
      c.restore();
      if (this.repeatX && this.x + this.width + x < rect.x + rect.width) {
        this.draw(x + this.width, 0);
      }
      if (this.repeatY && this.y + this.height + y < rect.y + rect.height) {
        return this.draw(0, y + this.height);
      }
    };

    return layer;

  })(c.sprite);

  c.gravity = (function() {

    function gravity() {}

    gravity.prototype.init = function() {
      var _ref;
      this["import"](["move"]);
      if ((_ref = this.gravity) == null) {
        this.gravity = -10;
      }
      return this.updates[96] = function() {
        if (this.dy > this.gravity) {
          return this.dy -= 1;
        }
      };
    };

    return gravity;

  })();

  TileMap = (function() {

    function TileMap(options) {
      var calc, d, dirs, x, y, _i, _j, _ref, _ref1;
      if (options == null) {
        options = {};
      }
      this.x = options.x || 0;
      this.y = options.y || 0;
      this.res = options.res || [32, 32];
      this.size = options.size || [100, 100];
      this.parent = options.parent;
      if (options.name) {
        this.name = options.name;
      }
      this.width = this.size[0] * this.res[0];
      this.height = this.size[1] * this.res[1];
      this.components = [];
      this.tiles = (function() {
        var _i, _ref, _results;
        _results = [];
        for (y = _i = 0, _ref = this.size[0]; 0 <= _ref ? _i < _ref : _i > _ref; y = 0 <= _ref ? ++_i : --_i) {
          _results.push((function() {
            var _j, _ref1, _results1;
            _results1 = [];
            for (x = _j = 0, _ref1 = this.size[1]; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; x = 0 <= _ref1 ? ++_j : --_j) {
              _results1.push({
                parent: this
              });
            }
            return _results1;
          }).call(this));
        }
        return _results;
      }).call(this);
      dirs = {
        s: [0, 1],
        e: [1, 0],
        n: [0, -1],
        w: [-1, 0]
      };
      for (y = _i = 0, _ref = this.size[1]; 0 <= _ref ? _i < _ref : _i > _ref; y = 0 <= _ref ? ++_i : --_i) {
        for (x = _j = 0, _ref1 = this.size[0]; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; x = 0 <= _ref1 ? ++_j : --_j) {
          this.tiles[x][y].x = x;
          this.tiles[x][y].y = y;
          this.tiles[x][y].content = [];
          for (d in dirs) {
            calc = dirs[d];
            this.tiles[x][y][d] = (this.tiles[x + calc[0]] != null) && (this.tiles[x + calc[0]][y + calc[1]] != null) ? this.tiles[x + calc[0]][y + calc[1]] : null;
          }
        }
      }
    }

    TileMap.prototype.place = function(obj) {
      var _this = this;
      if (obj.forEach) {
        return obj.forEach(function(item) {
          return _this.place(item);
        });
      } else {
        this.parent.e.push(obj);
        util["import"](["tile"], obj);
        obj.tile = this.tiles[obj.x][obj.y];
        obj.parent = this.parent;
        this.tiles[obj.x][obj.y].content.unshift(obj);
        obj.x = obj.x * this.res[0] + this.x;
        return obj.y = obj.y * this.res[1] + this.y;
      }
    };

    TileMap.prototype.lookup = function(x, y) {
      return this.tiles[x][y].content;
    };

    TileMap.prototype.clear = function() {
      var col, tile, _i, _len, _ref, _results;
      _ref = this.tiles;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        col = _ref[_i];
        _results.push((function() {
          var _j, _len1, _results1;
          _results1 = [];
          for (_j = 0, _len1 = col.length; _j < _len1; _j++) {
            tile = col[_j];
            _results1.push(tile.content = []);
          }
          return _results1;
        })());
      }
      return _results;
    };

    TileMap.prototype.atRect = function(rect) {
      var round, tiles, x, x1, x2, y, y1, y2, _i, _j, _ref;
      tiles = [];
      round = Rogue.math.round;
      x1 = round(rect.x / this.res[0]);
      y1 = round(rect.y / this.res[1]);
      x2 = round((rect.x + rect.width) / this.res[0]);
      y2 = round((rect.y + rect.height) / this.res[1]);
      for (y = _i = y1; y1 <= y2 ? _i <= y2 : _i >= y2; y = y1 <= y2 ? ++_i : --_i) {
        for (x = _j = x1; x1 <= x2 ? _j <= x2 : _j >= x2; x = x1 <= x2 ? ++_j : --_j) {
          if (((_ref = this.tiles[x]) != null ? _ref[y] : void 0) != null) {
            tiles.push(this.tiles[x][y].content);
          }
        }
      }
      return tiles;
    };

    TileMap.prototype.rect = function() {
      return this;
    };

    return TileMap;

  })();

  KeyboardManager = (function() {
    var char, downFn, i, keys, num, pressedKeys, upFn, _i, _j, _len, _ref;

    function KeyboardManager(context) {
      var handleEvent,
        _this = this;
      this.context = context;
      handleEvent = function(e) {
        var fn, key, _ref;
        e = e || window.event;
        if (e.type === 'keyup') {
          key = false;
          fn = upFn;
        } else {
          key = true;
          fn = downFn;
        }
        pressedKeys[e.keyCode] = key;
        if (_ref = e.keyCode, __indexOf.call(fn, _ref) >= 0) {
          fn[e.keyCode]();
        }
        return e.preventDefault();
      };
      this.context.onkeydown = this.context.onkeyup = handleEvent;
    }

    KeyboardManager.prototype.press = function(key, fn) {
      var k, _i, _len, _results;
      if (key.forEach) {
        _results = [];
        for (_i = 0, _len = key.length; _i < _len; _i++) {
          k = key[_i];
          _results.push(this.press(k, fn));
        }
        return _results;
      } else {
        if (keys[key] != null) {
          return downFn[keys[key]] = fn;
        } else {
          return Rogue.log(3, "invalid key: " + key);
        }
      }
    };

    KeyboardManager.prototype.release = function(key, fn) {
      var k, _i, _len, _results;
      if (key.forEach) {
        _results = [];
        for (_i = 0, _len = key.length; _i < _len; _i++) {
          k = key[_i];
          _results.push(this.release(k, fn));
        }
        return _results;
      } else {
        if (keys[key] != null) {
          return upFn[keys[key]] = fn;
        } else {
          return Rogue.log(3, "invalid key: " + key);
        }
      }
    };

    KeyboardManager.prototype.pressed = function(key) {
      if (keys[key] != null) {
        return pressedKeys[keys[key]];
      } else {
        return Rogue.log(3, "invalid key: " + key);
      }
    };

    downFn = [];

    upFn = [];

    pressedKeys = [];

    keys = {
      backspace: 8,
      tab: 9,
      enter: 13,
      shift: 16,
      ctrl: 17,
      alt: 18,
      pause: 19,
      capslock: 20,
      escape: 27,
      space: 32,
      pageup: 33,
      pagedown: 34,
      end: 35,
      home: 36,
      left: 37,
      up: 38,
      right: 39,
      down: 40,
      insert: 45,
      'delete': 46,
      leftwin: 91,
      rightwin: 92,
      multiply: 106,
      add: 107,
      subtract: 109,
      decimalpoint: 110,
      divide: 111,
      numlock: 144,
      scrollock: 145,
      semicolon: 186,
      equals: 187,
      comma: 188,
      dash: 189,
      period: 190,
      forwardslash: 191,
      backtick: 192,
      openbracket: 219,
      backslash: 220,
      closebracket: 221,
      quote: 222
    };

    for (num = _i = 0; _i < 10; num = ++_i) {
      keys['' + num] = 48 + num;
      keys['numpad' + num] = 96 + num;
      keys['f' + num] = 112 + num;
    }

    _ref = 'abcdefghijklmnopqrstuvwxyz';
    for (i = _j = 0, _len = _ref.length; _j < _len; i = ++_j) {
      char = _ref[i];
      keys[char] = 65 + i;
    }

    return KeyboardManager;

  })();

  Mouse = (function() {

    function Mouse(context) {
      var a, actions, b, buttons, listener, mousemove, _i, _j, _k, _len, _len1, _len2,
        _this = this;
      this.context = context;
      this.context.oncontextmenu = function() {
        return false;
      };
      buttons = ["left", "middle", "right"];
      actions = ["click", "down", "up"];
      mousemove = function(e) {
        _this.x = e.offsetX;
        return _this.y = e.offsetX;
      };
      for (_i = 0, _len = buttons.length; _i < _len; _i++) {
        b = buttons[_i];
        this[b] = {};
        for (_j = 0, _len1 = actions.length; _j < _len1; _j++) {
          a = actions[_j];
          this[b][a] = function() {};
        }
      }
      for (_k = 0, _len2 = actions.length; _k < _len2; _k++) {
        a = actions[_k];
        listener = a === "click" ? "onclick" : "onmouse" + a;
        this.context[listener] = function(e) {
          console.log(e.button);
          _this[buttons[e.button]][e.type.replace("mouse", "")](e);
          return e.preventDefault();
        };
      }
      this.context.onmousemove = mousemove;
    }

    return Mouse;

  })();

  collision = {
    AABB: function(r1, r2) {
      var dx, dy, h, hx, w, wy;
      w = (r1.width + r2.width) / 2;
      h = (r1.height + r2.height) / 2;
      dx = (r1.x + r1.width / 2) - (r2.x + r2.width / 2);
      dy = (r1.y + r1.height / 2) - (r2.y + r2.height / 2);
      if (Math.abs(dx) <= w - 1 && Math.abs(dy) <= h - 1) {
        wy = w * dy;
        hx = h * dx;
        if (wy > hx) {
          if (wy > -hx) {
            return "top";
          } else {
            return "left";
          }
        } else {
          if (wy > -hx) {
            return "right";
          } else {
            return "bottom";
          }
        }
      }
      return false;
    },
    hitTest: function(p, r) {
      return this.AABB({
        x: p[0],
        y: p[1],
        width: 1,
        height: 1
      }, r);
    },
    AABBhitmap: function(r, e) {
      var dir, p, points, _i, _len, _ref;
      if (!collision.AABB(r, e.rect())) {
        return false;
      }
      _ref = e.hitmap;
      for (dir in _ref) {
        points = _ref[dir];
        for (_i = 0, _len = points.length; _i < _len; _i++) {
          p = points[_i];
          dir = this.hitTest([e.x + p[0], e.y + p[1]], r);
          if (dir) {
            return dir;
          }
        }
      }
      return false;
    },
    createHitmap: function(img, res) {
      var hitmap, point, points, _i, _len, _step;
      if (res == null) {
        res = 2;
      }
      points = gfx.edgeDetect(img, res);
      hitmap = {
        left: [],
        right: [],
        up: [],
        down: []
      };
      for (_i = 0, _len = points.length, _step = res; _i < _len; _i += _step) {
        point = points[_i];
        hitmap[point[2]].push([point[0], point[1]]);
      }
      return hitmap;
    }
  };

  c.AABB = (function() {

    function AABB() {}

    AABB.prototype.type = "AABB";

    AABB.prototype.collide = function(obj) {
      var _this = this;
      if (obj.forEach) {
        obj.forEach(function(o) {
          return _this.collide(o);
        });
      }
      if (obj.type === this.type) {
        return collision.AABB(this.rect(), obj.rect());
      } else if (obj.type === "hitmap") {
        return collision.AABBhitmap(this.rect(), obj);
      }
      return false;
    };

    return AABB;

  })();

  c.hitmap = (function() {

    function hitmap() {}

    hitmap.prototype.type = "hitmap";

    hitmap.prototype.init = function() {
      return this._recalculateImage();
    };

    hitmap.prototype._recalculateImage = function() {
      this.width = this.image.width;
      this.height = this.image.height;
      this.xOffset = math.round(this.width / 2);
      this.yOffset = math.round(this.height / 2);
      return this.hitmap = collision.createHitmap(this.image);
    };

    hitmap.prototype.collide = function(obj) {
      var dir, dir2, opoint, point, points, points2, _i, _j, _k, _len, _len1, _len2, _ref, _ref1,
        _this = this;
      if (obj.forEach) {
        obj.forEach(function(o) {
          return _this.collide(o);
        });
      }
      if (!collision.AABB(this.rect(), obj.rect())) {
        return false;
      }
      if (obj.type === this.type) {
        _ref = obj.hitmap;
        for (dir in _ref) {
          points = _ref[dir];
          for (_i = 0, _len = points.length; _i < _len; _i++) {
            opoint = points[_i];
            _ref1 = this.hitmap;
            for (points2 = _j = 0, _len1 = _ref1.length; _j < _len1; points2 = ++_j) {
              dir2 = _ref1[points2];
              for (_k = 0, _len2 = points2.length; _k < _len2; _k++) {
                point = points2[_k];
                if (opoint[0] + obj.x === point[0] + this.x && opoint[1] + obj.y === point[1] + this.y) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      } else if (obj.type === "AABB") {
        return collision.AABBhitmap(obj.rect(), this);
      }
    };

    return hitmap;

  })();

  c.polygon = (function() {

    function polygon() {}

    polygon.prototype.type = "polygon";

    polygon.prototype.init = function() {
      if (!this.points) {
        return log(2, "Polygons must have points!");
      }
    };

    return polygon;

  })();

  Game = (function() {

    function Game(options) {
      var _ref, _ref1, _ref2;
      this.options = options != null ? options : {};
      if (this.options.canvas != null) {
        this.canvas = document.getElementById(options.canvas);
      }
      if (!(this.canvas != null)) {
        this.canvas = util.canvas();
        document.body.appendChild(this.canvas);
      }
      this.canvas.tabIndex = 1;
      this.width = this.canvas.width = (_ref = this.options.width) != null ? _ref : 400;
      this.height = this.canvas.height = (_ref1 = this.options.height) != null ? _ref1 : 300;
      this.showFPS = (_ref2 = this.options.fps) != null ? _ref2 : false;
      this.canvas.x = this.canvas.y = 0;
      this.context = this.canvas.getContext('2d');
    }

    Game.prototype.start = function(state) {
      var loading, _ref;
      loading = (_ref = this.options.loadingScreen) != null ? _ref : function() {};
      return this.switchState(state);
    };

    Game.prototype.switchState = function(state) {
      this.e = [];
      this.loop && this.loop.stop();
      this.oldState = this.state;
      this.state = state;
      this.state.setup.call(this);
      this.loop = new GameLoop(this, this.showFPS);
      this.loop.add([this.state.update, this.state.draw]);
      return this.loop.start();
    };

    Game.prototype.clear = function() {
      return this.context.clearRect(0, 0, this.width, this.height);
    };

    Game.prototype.find = function(components) {
      return find.call(this, components);
    };

    return Game;

  })();

  GameLoop = (function() {

    function GameLoop(parent, showFPS) {
      this.parent = parent;
      this.showFPS = showFPS;
      this.loop = __bind(this.loop, this);

      this.fps = 0;
      this.averageFPS = new RollingAverage(20);
      this.call = [];
    }

    GameLoop.prototype.start = function() {
      var currentTick, firstTick, lastTick;
      this.paused = this.stopped = false;
      firstTick = currentTick = lastTick = (new Date()).getTime();
      return Rogue.ticker.call(window, this.loop);
    };

    GameLoop.prototype.loop = function() {
      var func, _i, _len, _ref;
      this.currentTick = (new Date()).getTime();
      this.tickDuration = this.currentTick - this.lastTick;
      this.fps = this.averageFPS.add(1000 / this.tickDuration);
      if (!(this.stopped || this.paused)) {
        _ref = this.call;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          func = _ref[_i];
          func.call(this.parent);
        }
      }
      if (!this.stopped) {
        Rogue.ticker.call(window, this.loop);
      }
      if (this.showFPS) {
        this.parent.context.fillText(this.fps, 10, 10);
      }
      return this.lastTick = this.currentTick;
    };

    GameLoop.prototype.pause = function() {
      return this.paused = true;
    };

    GameLoop.prototype.stop = function() {
      return this.stopped = true;
    };

    GameLoop.prototype.add = function(func) {
      return this.call = this.call.concat(func);
    };

    return GameLoop;

  })();

  RollingAverage = (function() {

    function RollingAverage(size) {
      this.size = size;
      this.values = new Array(this.size);
      this.count = 0;
    }

    RollingAverage.prototype.add = function(value) {
      this.values = this.values.slice(1, this.size);
      this.values.push(value);
      if (this.count < this.size) {
        this.count++;
      }
      return parseInt((this.values.reduce(function(t, s) {
        return t + s;
      })) / this.count);
    };

    return RollingAverage;

  })();

  ViewPort = (function() {

    function ViewPort(options) {
      this.options = options;
      this.parent = this.options.parent;
      this.canvas = this.options.canvas || this.parent.canvas || util.canvas();
      this.context = this.canvas.getContext('2d');
      this.width = this.options.width || this.canvas.width;
      this.height = this.options.height || this.canvas.height;
      this.viewWidth = this.options.viewWidth || this.width;
      this.viewHeight = this.options.viewHeight || this.height;
      this.viewX = this.options.viewX || 0;
      this.viewY = this.options.viewY || 0;
      this.x = this.options.x || 0;
      this.y = this.options.y || 0;
      this.e = [];
      this.updates = [];
    }

    ViewPort.prototype.add = function(entity) {
      var _this = this;
      if (entity.forEach) {
        return entity.forEach(function(obj) {
          return _this.add(obj);
        });
      } else {
        entity.parent = this;
        this.e.push(entity);
        this.parent.e.push(entity);
        if (entity.name != null) {
          return this[entity.name] = entity;
        }
      }
    };

    ViewPort.prototype.update = function() {
      var entity, func, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = this.e;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entity = _ref[_i];
        if (this.close(entity) && (entity.update != null)) {
          entity.update();
        }
      }
      _ref1 = this.updates;
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        func = _ref1[_j];
        if (func != null) {
          _results.push(func.call(this));
        }
      }
      return _results;
    };

    ViewPort.prototype.draw = function() {
      var entity, _i, _len, _ref;
      this.context.save();
      this.context.translate(-this.viewX, -this.viewY);
      this.context.beginPath();
      this.context.rect(this.x + this.viewX, this.y + this.viewY, this.width, this.height);
      this.context.clip();
      _ref = this.e;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entity = _ref[_i];
        if (this.visible(entity) && (entity.draw != null)) {
          entity.draw();
        }
      }
      return this.context.restore();
    };

    ViewPort.prototype.move = function(x, y) {
      this.viewX += x;
      this.viewY += y;
      return this.keepInBounds();
    };

    ViewPort.prototype.moveTo = function(x, y) {
      this.viewX = x;
      this.viewY = y;
      return this.keepInBounds();
    };

    ViewPort.prototype.follow = function(entity) {
      this.viewX = entity.x - math.round(this.width / 2);
      this.viewY = entity.y - math.round(this.height / 2);
      return this.keepInBounds();
    };

    ViewPort.prototype.forceInside = function(entity, visible, buffer) {
      var h, w;
      if (visible == null) {
        visible = false;
      }
      if (buffer == null) {
        buffer = 0;
      }
      if (visible) {
        w = this.width;
        h = this.height;
      } else {
        w = this.viewWidth;
        h = this.viewHeight;
      }
      if (entity.x < buffer) {
        entity.x = buffer;
      }
      if (entity.y < buffer) {
        entity.y = buffer;
      }
      if (entity.x > w - buffer) {
        entity.x = w - buffer;
      }
      if (entity.y > h - buffer) {
        return entity.y = h - buffer;
      }
    };

    ViewPort.prototype.rect = function() {
      return {
        width: this.width,
        height: this.height,
        x: this.viewX,
        y: this.viewY
      };
    };

    ViewPort.prototype.visible = function(entity) {
      return collision.AABB(entity.rect(), this.rect());
    };

    ViewPort.prototype.keepInBounds = function() {
      if (this.viewX < 0) {
        this.viewX = 0;
      }
      if (this.viewY < 0) {
        this.viewY = 0;
      }
      if (this.viewX + this.width > this.viewWidth) {
        this.viewX = this.viewWidth - this.width;
      }
      if (this.viewY + this.height > this.viewHeight) {
        return this.viewY = this.viewHeight - this.height;
      }
    };

    ViewPort.prototype.find = function(components) {
      return find.call(this, components);
    };

    ViewPort.prototype.close = function(entity) {
      return collision.AABB(entity.rect(), {
        width: this.width * 2,
        height: this.height * 2,
        x: this.viewX - this.width / 2,
        y: this.viewY - this.height / 2
      });
    };

    return ViewPort;

  })();

  log = function() {
    var args, func, level;
    level = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!(level <= Rogue.loglevel)) {
      return;
    }
    switch (level) {
      case 1:
        func = console.error || console.log;
        break;
      case 2:
        func = console.warn || console.log;
        break;
      case 3:
        func = console.info || console.log;
        break;
      case 4:
        func = console.debug || console.log;
    }
    return func.call.apply(func, [console, "(Rogue)"].concat(__slice.call(args)));
  };

  util = {
    canvas: function() {
      return document.createElement("canvas");
    },
    isArray: function(value) {
      return Object.prototype.toString.call(value) === '[object Array]';
    },
    remove: function(a, val) {
      return a.splice(a.indexOf(val), 1);
    },
    mixin: function(obj, mixin) {
      var method, name;
      for (name in mixin) {
        method = mixin[name];
        if (method.slice) {
          obj[name] = method.slice(0);
        } else {
          obj[name] = method;
        }
      }
      return obj;
    },
    "import": function(obj, components) {
      var comp, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = components.length; _i < _len; _i++) {
        comp = components[_i];
        if (__indexOf.call(obj.components, comp) < 0) {
          obj.components.push(comp);
          util.mixin(obj, new c[comp]);
          if (obj.init) {
            obj.init();
          }
          delete obj.init;
          _results.push(delete obj["import"]);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    IE: function() {
      return //@cc_on navigator.appVersion;
    }
  };

  find = function(c) {
    var ent, f, found, i, _i, _j, _len, _len1, _ref;
    found = [];
    _ref = this.e;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      ent = _ref[_i];
      f = 0;
      for (_j = 0, _len1 = c.length; _j < _len1; _j++) {
        i = c[_j];
        if (__indexOf.call(ent.components, i) >= 0) {
          f++;
        }
      }
      if (f === c.length) {
        found.push(ent);
      }
    }
    return found;
  };

  math = {
    round: function(num) {
      return (0.5 + num) | 0;
    }
  };

  Rogue = this.Rogue = {};

  if (typeof module !== "undefined" && module !== null) {
    module.exports = Rogue;
  }

  Rogue.ticker = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(tick) {
    return window.setTimeout(tick, 1000 / 60);
  };

  Rogue.ready = function(f) {
    return document.addEventListener("DOMContentLoaded", function() {
      document.removeEventListener("DOMContentLoaded", arguments.callee, false);
      return f();
    });
  };

  Rogue.log = log;

  Rogue.util = util;

  Rogue.math = math;

  Rogue.Game = Game;

  Rogue.GameLoop = GameLoop;

  Rogue.TileMap = TileMap;

  Rogue.AssetManager = AssetManager;

  Rogue.SpriteSheet = SpriteSheet;

  Rogue.SoundBox = SoundBox;

  Rogue.gfx = gfx;

  Rogue.collision = collision;

  Rogue.Animation = Animation;

  Rogue.ViewPort = ViewPort;

  Rogue.components = c;

  Rogue.Entity = Entity;

  Rogue.KeyboardManager = KeyboardManager;

  Rogue.Mouse = Mouse;

  Rogue.loglevel = 4;

}).call(this);
;

