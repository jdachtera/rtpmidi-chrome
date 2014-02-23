require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":3}],2:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],3:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":2,"/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":9,"inherits":8}],4:[function(require,module,exports){
/**
 * The buffer module from node.js, for the browser.
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install buffer`
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
   // Detect if browser supports Typed Arrays. Supported browsers are IE 10+,
   // Firefox 4+, Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+.
  if (typeof Uint8Array === 'undefined' || typeof ArrayBuffer === 'undefined')
    return false

  // Does the browser support adding properties to `Uint8Array` instances? If
  // not, then that's the same as no `Uint8Array` support. We need to be able to
  // add all the node Buffer API methods.
  // Relevant Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var arr = new Uint8Array(0)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // Assume object is an array
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof Uint8Array === 'function' &&
      subject instanceof Uint8Array) {
    // Speed optimization -- use set if we're copying from a Uint8Array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  // copy!
  for (var i = 0; i < end - start; i++)
    target[i + target_start] = this[i + start]
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array === 'function') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment the Uint8Array *instance* (not the class!) with Buffer methods
 */
function augment (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0,
      'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":5,"ieee754":6}],5:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],6:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],7:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],8:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],10:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

},{}],11:[function(require,module,exports){
module.exports=require(2)
},{}],12:[function(require,module,exports){
module.exports=require(3)
},{"./support/isBuffer":11,"/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":9,"inherits":8}],13:[function(require,module,exports){
(function (Buffer){
/**
 * UDP / Datagram Sockets
 * ======================
 *
 * Datagram sockets are available through require('chrome-dgram').
 */

exports.Socket = Socket

var EventEmitter = require('events').EventEmitter
var util = require('util')

var BIND_STATE_UNBOUND = 0
var BIND_STATE_BINDING = 1
var BIND_STATE_BOUND = 2

/**
 * dgram.createSocket(type, [callback])
 *
 * Creates a datagram Socket of the specified types. Valid types are `udp4`
 * and `udp6`.
 *
 * Takes an optional callback which is added as a listener for message events.
 *
 * Call socket.bind if you want to receive datagrams. socket.bind() will bind
 * to the "all interfaces" address on a random port (it does the right thing
 * for both udp4 and udp6 sockets). You can then retrieve the address and port
 * with socket.address().address and socket.address().port.
 *
 * @param  {string} type       Either 'udp4' or 'udp6'
 * @param  {function} listener Attached as a listener to message events.
 *                             Optional
 * @return {Socket}            Socket object
 */
exports.createSocket = function (type, listener) {
  return new Socket(type, listener)
}

util.inherits(Socket, EventEmitter)

/**
 * Class: dgram.Socket
 *
 * The dgram Socket class encapsulates the datagram functionality. It should
 * be created via `dgram.createSocket(type, [callback])`.
 *
 * Event: 'message'
 *   - msg Buffer object. The message
 *   - rinfo Object. Remote address information
 *   Emitted when a new datagram is available on a socket. msg is a Buffer and
 *   rinfo is an object with the sender's address information and the number
 *   of bytes in the datagram.
 *
 * Event: 'listening'
 *   Emitted when a socket starts listening for datagrams. This happens as soon
 *   as UDP sockets are created.
 *
 * Event: 'close'
 *   Emitted when a socket is closed with close(). No new message events will
 *   be emitted on this socket.
 *
 * Event: 'error'
 *   - exception Error object
 *   Emitted when an error occurs.
 */
function Socket (type, listener) {
  var self = this
  EventEmitter.call(self)

  if (type !== 'udp4')
    throw new Error('Bad socket type specified. Valid types are: udp4')

  if (typeof listener === 'function')
    self.on('message', listener)

  self._destroyed = false
  self._bindState = BIND_STATE_UNBOUND
}

/**
 * socket.bind(port, [address], [callback])
 *
 * For UDP sockets, listen for datagrams on a named port and optional address.
 * If address is not specified, the OS will try to listen on all addresses.
 * After binding is done, a "listening" event is emitted and the callback(if
 * specified) is called. Specifying both a "listening" event listener and
 * callback is not harmful but not very useful.
 *
 * A bound datagram socket keeps the node process running to receive
 * datagrams.
 *
 * If binding fails, an "error" event is generated. In rare case (e.g. binding
 * a closed socket), an Error may be thrown by this method.
 *
 * @param {number} port
 * @param {string} address Optional
 * @param {function} callback Function with no parameters, Optional. Callback
 *                            when binding is done.
 */
Socket.prototype.bind = function (port, address, callback) {
  var self = this
  if (typeof address === 'function') {
    callback = address
    address = undefined
  }

  if (!address)
    address = '0.0.0.0'

  if (self._bindState !== BIND_STATE_UNBOUND)
    throw new Error('Socket is already bound')

  self._bindState = BIND_STATE_BINDING

  if (typeof callback === 'function')
    self.once('listening', callback)

  chrome.socket.create('udp', {}, function (createInfo) {
    self.id = createInfo.socketId

    chrome.socket.bind(self.id, address, port, function (result) {
      if (result < 0) {
        self.emit('error', new Error('Socket ' + self.id + ' failed to bind'))
        return
      }
      chrome.socket.getInfo(self.id, function (result) {
        if (!result.localPort) {
          self.emit(new Error('Cannot get local port for Socket ' + self.id))
          return
        }

        self._port = result.localPort
        self._address = result.localAddress

        self._bindState = BIND_STATE_BOUND
        self.emit('listening')

        self._recvLoop()
      })
    })
  })
}

/**
 * Internal function to receive new messages and emit `message` events.
 */
Socket.prototype._recvLoop = function() {
  var self = this

  chrome.socket.recvFrom(self.id, function (recvFromInfo) {
    if (recvFromInfo.resultCode === 0) {
      self.close()

    } else if (recvFromInfo.resultCode < 0) {
      self.emit('error', new Error('Socket ' + self.id + ' recvFrom error ' +
          recvFromInfo.resultCode))

    } else {
      var buf = new Buffer(new Uint8Array(recvFromInfo.data))
      self.emit('message', buf, recvFromInfo)
      self._recvLoop()
    }
  })
}

/**
 * socket.send(buf, offset, length, port, address, [callback])
 *
 * For UDP sockets, the destination port and IP address must be
 * specified. A string may be supplied for the address parameter, and it will
 * be resolved with DNS. An optional callback may be specified to detect any
 * DNS errors and when buf may be re-used. Note that DNS lookups will delay
 * the time that a send takes place, at least until the next tick. The only
 * way to know for sure that a send has taken place is to use the callback.
 *
 * If the socket has not been previously bound with a call to bind, it's
 * assigned a random port number and bound to the "all interfaces" address
 * (0.0.0.0 for udp4 sockets, ::0 for udp6 sockets).
 *
 * @param {Buffer|Arrayish|string} buf Message to be sent
 * @param {number} offset Offset in the buffer where the message starts.
 * @param {number} length Number of bytes in the message.
 * @param {number} port destination port
 * @param {string} address destination IP
 * @param {function} callback Callback when message is done being delivered.
 *                            Optional.
 */
// Socket.prototype.send = function (buf, host, port, cb) {
Socket.prototype.send = function (buffer,
                                  offset,
                                  length,
                                  port,
                                  address,
                                  callback) {

  var self = this

  if (!callback) callback = function () {}

  if (offset !== 0)
    throw new Error('Non-zero offset not supported yet')

  if (self._bindState === BIND_STATE_UNBOUND)
    self.bind(0)

  // If the socket hasn't been bound yet, push the outbound packet onto the
  // send queue and send after binding is complete.
  if (self._bindState !== BIND_STATE_BOUND) {
    // If the send queue hasn't been initialized yet, do it, and install an
    // event handler that flishes the send queue after binding is done.
    if (!self._sendQueue) {
      self._sendQueue = []
      self.once('listening', function () {
        // Flush the send queue.
        for (var i = 0; i < self._sendQueue.length; i++) {
          self.send.apply(self, self._sendQueue[i])
        }
        self._sendQueue = undefined
      })
    }
    self._sendQueue.push([buffer, offset, length, port, address, callback])
    return
  }

  if (!Buffer.isBuffer(buffer)) buffer = new Buffer(buffer)
  chrome.socket.sendTo(self.id,
                       buffer.toArrayBuffer(),
                       address,
                       port,
                       function (writeInfo) {
    if (writeInfo.bytesWritten < 0) {
      var ex = new Error('Socket ' + self.id + ' send error ' + writeInfo.bytesWritten)
      callback(ex)
      self.emit('error', ex)
    } else {
      callback(null)
    }
  })
}

/**
 * Close the underlying socket and stop listening for data on it.
 */
Socket.prototype.close = function () {
  var self = this
  if (self._destroyed)
    return

  chrome.socket.destroy(self.id)
  self._destroyed = true

  self.emit('close')
}

/**
 * Returns an object containing the address information for a socket. For UDP
 * sockets, this object will contain address, family and port.
 *
 * @return {Object} information
 */
Socket.prototype.address = function () {
  var self = this
  return {
    address: self._address,
    port: self._port,
    family: 'IPv4'
  }
}

Socket.prototype.setBroadcast = function (flag) {
  // No chrome.socket equivalent
}

Socket.prototype.setTTL = function (ttl) {
  // No chrome.socket equivalent
}

// NOTE: Multicast code is untested. Pull requests accepted for bug fixes and to
// add tests!

/**
 * Sets the IP_MULTICAST_TTL socket option. TTL stands for "Time to Live," but
 * in this context it specifies the number of IP hops that a packet is allowed
 * to go through, specifically for multicast traffic. Each router or gateway
 * that forwards a packet decrements the TTL. If the TTL is decremented to 0
 * by a router, it will not be forwarded.
 *
 * The argument to setMulticastTTL() is a number of hops between 0 and 255.
 * The default on most systems is 1.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {number} ttl
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.setMulticastTTL = function (ttl, callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.socket.setMulticastTimeToLive(self.id, ttl, callback)
}

/**
 * Sets or clears the IP_MULTICAST_LOOP socket option. When this option is
 * set, multicast packets will also be received on the local interface.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {boolean} flag
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.setMulticastLoopback = function (flag, callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.socket.setMulticastLoopbackMode(self.id, flag, callback)
}

/**
 * Tells the kernel to join a multicast group with IP_ADD_MEMBERSHIP socket
 * option.
 *
 * If multicastInterface is not specified, the OS will try to add membership
 * to all valid interfaces.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {string} multicastAddress
 * @param {string} [multicastInterface] Optional
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.addMembership = function (multicastAddress,
                                           multicastInterface,
                                           callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.socket.joinGroup(self.id, multicastAddress, callback)
}

/**
 * Opposite of addMembership - tells the kernel to leave a multicast group
 * with IP_DROP_MEMBERSHIP socket option. This is automatically called by the
 * kernel when the socket is closed or process terminates, so most apps will
 * never need to call this.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * If multicastInterface is not specified, the OS will try to drop membership
 * to all valid interfaces.
 *
 * @param  {[type]} multicastAddress
 * @param  {[type]} multicastInterface Optional
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.dropMembership = function (multicastAddress,
                                            multicastInterface,
                                            callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.socket.leaveGroup(self.id, multicastAddress, callback)
}

Socket.prototype.unref = function () {
  // No chrome.socket equivalent
}

Socket.prototype.ref = function () {
  // No chrome.socket equivalent
}

}).call(this,require("buffer").Buffer)
},{"buffer":4,"events":7,"util":12}],"dgram":[function(require,module,exports){
module.exports=require('+nV/x3');
},{}],"+nV/x3":[function(require,module,exports){
module.exports = require('chrome-dgram');
},{"chrome-dgram":13}],"rtpmidi":[function(require,module,exports){
module.exports=require('cKJUDM');
},{}],"cKJUDM":[function(require,module,exports){
(function (process){
"use strict";

process.on = function(eventName, callback) {
  if ('eventName' == 'SIGINT') {
    chrome.app.window.current().onClosed.addListener(callback);
  }
};

module.exports = {
  manager:            require('./node-rtpmidi/src/manager'),
  Session:            require('./node-rtpmidi/src/Session'),
  Stream:             require('./node-rtpmidi/src/Stream'),
  AbstractMessage:    require('./node-rtpmidi/src/AbstractMessage'),
  ControlMessage:     require('./node-rtpmidi/src/ControlMessage'),
  RTPMessage:         require('./node-rtpmidi/src/RTPMessage'),
  MTC:                require('./node-rtpmidi/src/MTC')
};


}).call(this,require("/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"./node-rtpmidi/src/AbstractMessage":21,"./node-rtpmidi/src/ControlMessage":22,"./node-rtpmidi/src/MTC":23,"./node-rtpmidi/src/RTPMessage":25,"./node-rtpmidi/src/Session":26,"./node-rtpmidi/src/Stream":27,"./node-rtpmidi/src/manager":28,"/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":9}],"IeR/1B":[function(require,module,exports){
module.exports = {};

throw 'dont use mdns'
},{}],"mdns":[function(require,module,exports){
module.exports=require('IeR/1B');
},{}],20:[function(require,module,exports){
if (window.angular) {
  angular.module('rtpmidi', []).
    factory('rtpmidi', function($timeout) {
      var EventEmitter = require("events").EventEmitter;

      var emit = EventEmitter.prototype.emit;
      EventEmitter.prototype.emit = function() {
        var that = this;
        emit.apply(that, arguments);
        $timeout(function() {

        })
      };

      return require('rtpmidi')
    });
} else {
  window.rtpmidi = require('rtpmidi');
}


},{"events":7,"rtpmidi":"cKJUDM"}],21:[function(require,module,exports){
(function (Buffer){
"use strict";

var assert = require('assert');

// A Protocol message interface
function AbstractMessage() {}

AbstractMessage.prototype.mixin = function copyFrom(data) {
    for (var k in data) {
        if (data.hasOwnProperty(k)) {
            this[k] = data[k];
        }
    }
    return this;
};

AbstractMessage.prototype.parseBuffer = function parseBuffer(buffer) {
    assert.ok(Buffer.isBuffer(buffer), 'Argument needs to be a buffer');
    this.buffer = buffer;
    return this;
};

AbstractMessage.prototype.generateBuffer = function generateBuffer() {
    return this;
};
AbstractMessage.prototype.isMessage = true;
AbstractMessage.prototype.isValid = true;
AbstractMessage.prototype.buffer = new Buffer(0);

module.exports = AbstractMessage;

}).call(this,require("buffer").Buffer)
},{"assert":1,"buffer":4}],22:[function(require,module,exports){
(function (Buffer){
"use strict";

var util = require("util"),
    assert = require('assert'),
    AbstractMessage = require("./AbstractMessage"),
    byteToCommand = {
        0x494E: 'invitation',
        0x4E4F: 'invitation_rejected',
        0x4F4B: 'invitation_accepted',
        0x4259: 'end',
        0x434B: 'synchronization',
        0x5253: 'receiver_feedback',
        0x524C: 'bitrate_receive_limit'
    },
    commandToByte = (function () {
        var obj = {};
        for (var key in byteToCommand) {
            if (byteToCommand.hasOwnProperty(key)) {
                obj[byteToCommand[key]] = parseInt(key, 10);
            }
        }
        return obj;
    })(),
    flags = {
        start: 0xFFFF
    };

function ControlMessage(buffer) {
    AbstractMessage.apply(this);
}

util.inherits(ControlMessage, AbstractMessage);

ControlMessage.prototype.name = '';
ControlMessage.prototype.isValid = true;
ControlMessage.prototype.start = flags.start;
ControlMessage.prototype.version = 2;

ControlMessage.prototype.parseBuffer = function parseBuffer(buffer) {
    AbstractMessage.prototype.parseBuffer.apply(this, arguments);
    this.start = buffer.readUInt16BE(0);
    if (this.start !== flags.start) {
        this.isValid = false;
        return this;
    }
    this.command = byteToCommand[buffer.readUInt16BE(2)];
    assert.ok(!!this.command, 'Not a valid command');
    switch (this.command) {
        case 'invitation':
        case 'invitation_accepted':
        case 'invitation_rejected':
        case 'end':
            this.version = buffer.readUInt32BE(4);
            this.token = buffer.readUInt32BE(8);
            this.ssrc = buffer.readUInt32BE(12);
            this.name = buffer.toString('utf-8', 16);
            break;
        case 'synchronization':
            this.ssrc = buffer.readUInt32BE(4, 8);
            this.count = buffer.readUInt8(8);
            this.padding = (buffer.readUInt8(9) << 0xF0) + buffer.readUInt16BE(10);
            this.timestamp1 = buffer.slice(12, 20); //[buffer.readUInt32BE(12), buffer.readUInt32BE(16)];
            this.timestamp2 = buffer.slice(20, 28); //[buffer.readUInt32BE(20), buffer.readUInt32BE(24)];
            this.timestamp3 = buffer.slice(28, 36); //[buffer.readUInt32BE(28), buffer.readUInt32BE(32)];
            break;
        case 'receiver_feedback':
            this.ssrc = buffer.readUInt32BE(4, 8);
            this.sequenceNumber = buffer.readUInt16BE(8);
            break;



    }
    return this;
};

ControlMessage.prototype.generateBuffer = function generateBuffer() {
    var buffer,
        commandByte = commandToByte[this.command];
    switch (this.command) {
        case 'invitation':
        case 'invitation_accepted':
        case 'invitation_rejected':
        case 'end':
            this.name = this.name || '';
            buffer = new Buffer(17 + Buffer.byteLength(this.name, 'utf8'));
            buffer.writeUInt16BE(this.start, 0);
            buffer.writeUInt16BE(commandByte, 2);
            buffer.writeUInt32BE(this.version, 4);
            buffer.writeUInt32BE(this.token, 8);
            buffer.writeUInt32BE(this.ssrc, 12);
            buffer.write(this.name, 16);
            if (this.command !== 'end') {
                buffer.writeUInt8(0, buffer.length - 1);
            }
            break;
        case 'synchronization':
            buffer = new Buffer(36);
            buffer.writeUInt16BE(this.start, 0);
            buffer.writeUInt16BE(commandByte, 2);
            buffer.writeUInt32BE(this.ssrc, 4);
            buffer.writeUInt8(this.count, 8);
            buffer.writeUInt8(this.padding >>> 0xF0, 9);
            buffer.writeUInt16BE(this.padding & 0x00FFFF, 10);

            this.timestamp1.copy(buffer, 12);
            this.timestamp2.copy(buffer, 20);
            this.timestamp3.copy(buffer, 28);

            /*
            buffer.writeUInt32BE(this.timestamp1[0], 12);
            buffer.writeUInt32BE(this.timestamp1[1], 16);
            buffer.writeUInt32BE(this.timestamp2[0], 20);
            buffer.writeUInt32BE(this.timestamp2[1], 24);
            buffer.writeUInt32BE(this.timestamp3[0], 28);
            buffer.writeUInt32BE(this.timestamp3[1], 32);
            */
            break;
        case 'receiver_feedback':
            buffer = new Buffer(12);
            buffer.writeUInt16BE(this.start, 0);
            buffer.writeUInt16BE(commandByte, 2);
            buffer.writeUInt32BE(this.ssrc, 4);
            buffer.writeUInt16BE(this.sequenceNumber, 8);
            break;
        default:
            assert.fail('Not a valid command: "' + this.command + '"');
            break;
    }
    this.buffer = buffer;
    return this;
};

module.exports = ControlMessage;

}).call(this,require("buffer").Buffer)
},{"./AbstractMessage":21,"assert":1,"buffer":4,"util":12}],23:[function(require,module,exports){
var util = require("util"),
    EventEmitter = require("events").EventEmitter;

function MTC() {
	EventEmitter.apply(this);
	this.hours = 0;
	this.minutes = 0;
	this.seconds = 0;
	this.frames = 0;
	this.type = 0;
  this.songPosition = 0;
};

util.inherits(MTC, EventEmitter);


MTC.prototype.setSource = function(sessionOrStream) {
	sessionOrStream.on('message', function(deltaTime, message) {
		if (message[0] === 0xf1) {
			this.applyQuarterTime(message);
		} else if (
      message[0] == 0xf0 &&
      message[1] == 0x7f &&
      message[3] == 0x01 &&
      message[4] == 0x01
    ) {
      this.applyFullTime(message)
    } else if (message[0] == 0xf2) {
      this.applySongPosition(message);
    }
	}.bind(this));
};


MTC.prototype.applySongPosition = function(message) {
  var before = this.songPosition;
  this.songPosition = message[2];
  this.songPosition <<= 7;
  this.songPosition |= message[1];
  if (this.songPosition !== before) {
    this.emit('change');
  }
};

MTC.prototype.applyFullTime = function(message) {
  var originalString = this.toString();

  this.type = (message[5] >> 5) & 0x3;

  this.hours = message[5] & 0x1f;
  this.minutes = message[6];
  this.seconds = message[7];
  this.frames = message[8];

  if (this.toString() !== originalString) {
    this.emit('change');
  }
};

// Build the MTC timestamp of 8 subsequent quarter time commands
// http://www.blitter.com/~russtopia/MIDI/~jglatt/tech/mtc.htm
MTC.prototype.applyQuarterTime = function(message) {

  var quarterTime = message[1],
      type = (quarterTime >> 4) & 0x7,
		  nibble = quarterTime & 0x0f,
		  operator;

	if (type % 2 === 0) {
		// Low nibble
		operator = 0xf0;		
	} else {
		// High nibble
		nibble = nibble << 4;
		operator = 0x0f;
	}

	switch(type) {
		case 0:
		case 1:
			this.frames = this.frames & operator | nibble;
			break;
		case 2:		
		case 3:
			this.seconds = this.seconds & operator | nibble;
			break;
		case 4:
		case 5:
			this.minutes = this.minutes & operator | nibble;
			break;
		case 6:
      this.hours = this.hours & operator | nibble;
      break;
		case 7:
      this.type = (nibble >> 5) & 0x3;
      nibble = nibble & 0x10;
      this.hours = this.hours & operator | nibble;
      this.emit('change');
			break;
	}
};

function pad(number) {
	if (number < 10) {
		return '0' + number;
	} else {
		return number.toString();
	}
}

MTC.prototype.getSMTPEString = function() {
	return pad(this.hours) + ':' + pad(this.minutes) + ':' + pad(this.seconds) + ':' + pad(this.frames);
}

module.exports = MTC;
},{"events":7,"util":12}],24:[function(require,module,exports){
(function (Buffer){
"use strict";

var util = require("util"),
    RTPMessage = require("./RTPMessage"),
    types_data_length = {

        // Channel Messages
        0x80: 2, // Note Off
        0x90: 2, // Note On
        0xa0: 2, // Polyphonic aftertouch
        0xb0: 2, // Control/Mode Change
        0xc0: 1, // Program Change
        0xd0: 1, // Channel Aftertouch
        0xe0: 2, // Pitch Wheel

        // System Common Messages
        /*
        0xf0: SysEx Start, length is determined by SysEx end byte
        */
        0xf1: 1, // Quarter time
        0xf2: 2, // Song Position Pointer
        0xf3: 1, // Song select
        /*
        0xf4: Undefined
        0xf5: Undefined
        */
        0xf6: 0, // Tune request (no data)
        /*
        0xf7: End of SysEx
        */

        // System Realtime Messages
        0xf8: 0, // Timing clock
        0xfa: 0, // Start
        0xfb: 0, // Continue
        0xfc: 0, // Stop
        /*
        0xfd: Undefined
        */
        0xfe: 0, // Active Sensing
        0xff: 0, // System Reset
    },
    flags = {
        systemMessage: 0xf0,
        maskDeltaTimeByte: 0xef,
        maskLengthInFirstByte: 0x0f,
        deltaTimeHasNext: 0x80,
        commandStart: 0x80,
        bigLength: 0x80,
        hasJournal: 0x40,
        firstHasDeltaTime: 0x20,
        p: 0x10
    };

function MidiMessage() {
    RTPMessage.apply(this);
    this.bigLength = false;
    this.hasJournal = false;
    this.firstHasDeltaTime = false;
    this.p = false;
    this.commands = [];
    this.isValid = true;
    this.payloadType = 0x61;
}

util.inherits(MidiMessage, RTPMessage);

MidiMessage.prototype.parseBuffer = function parseBuffer(buffer) {
    RTPMessage.prototype.parseBuffer.apply(this, arguments);
    var payload = this.payload,
        firstByte = payload.readUInt8(0),
        commandStartOffset,
        offset,
        statusByte,
        lastStatusByte = null,
        hasOwnStatusByte,
        data_length;

    this.bigLength = !!(firstByte & flags.bigLength);
    this.hasJournal = !!(firstByte & flags.hasJournal);
    this.firstHasDeltaTime = !!(firstByte & flags.firstHasDeltaTime);
    this.p = !!(firstByte & flags.p);

    this.length = (firstByte & flags.maskLengthInFirstByte);

    if (this.bigLength) {
        this.length = this.length << 8 + payload.readUInt8(1);
    }

    // Read the command section
    commandStartOffset = this.bigLength ? 2 : 1;
    offset = commandStartOffset;

    while (offset < this.length + commandStartOffset - 1) {
        var command = {
            deltaTime: 0
        };
        // Decode the delta time
        if (this.commands.length || this.firstHasDeltaTime) {
            for (var k = 0; k < 3; k++) {
                var currentOctet = payload.readUInt8(offset);
                offset++;
                command.deltaTime <<= 7;
                command.deltaTime += currentOctet & flags.maskDeltaTimeByte;
                if (!(currentOctet & flags.deltaTimeHasNext)) {
                    break;
                }
            }
        }

        statusByte = payload.readUInt8(offset);
        hasOwnStatusByte = (statusByte & 0x80) == 0x80;
        if (hasOwnStatusByte) {
            lastStatusByte = statusByte;
            offset++;
        } else if (lastStatusByte) {
            statusByte = lastStatusByte;
        }

        // Parse SysEx
        if (statusByte === 0xf0) {
            data_length = 0;
            while (payload.length > offset + data_length && payload.readUInt8(offset + data_length) !== 0xf7) {
                data_length++;
            }
            data_length++;

        } else {
            data_length = types_data_length[statusByte] || types_data_length[statusByte & 0xf0];
        }
        command.data = new Buffer(1 + data_length);
        command.data[0] = statusByte;
        if (payload.length < offset + data_length) {
            this.isValid = false;
            return;
        }
        if (data_length) {
            payload.copy(command.data, 1, offset, offset + data_length);
            offset += data_length;
        }
        this.commands.push(command);        
    }
    if (this.hasJournal) {        
        this.journal = this.parseJournal(this.payload.slice(offset));            
    }
    return this;
};

MidiMessage.prototype.parseJournal = function(payload) {
    var journal = journal = {};
    var journalHeader = payload[0];

    journal.singlePacketLoss = !!(journalHeader & 0x80);
    journal.hasSystemJournal = !!(journalHeader & 0x40);
    journal.hasChannelJournal = !!(journalHeader & 0x20);
    journal.enhancedEncoding = !!(journalHeader & 0x10);
    
    journal.checkPointPacketSequenceNumber = payload.readUInt16BE(1);
    journal.channelJournals = [];

    var journalOffset = 3;

    if (journal.hasSystemJournal) {
        var systemJournal = journal.systemJournal =  {};
        systemJournal.presentChapters = {};
        systemJournal.presentChapters.S = !!(payload[journalOffset] & 0x80);
        systemJournal.presentChapters.D = !!(payload[journalOffset] & 0x40);
        systemJournal.presentChapters.V = !!(payload[journalOffset] & 0x20);
        systemJournal.presentChapters.Q = !!(payload[journalOffset] & 0x10);
        systemJournal.presentChapters.F = !!(payload[journalOffset] & 0x08);
        systemJournal.presentChapters.X = !!(payload[journalOffset] & 0x04);
        systemJournal.length = ((payload[journalOffset] & 0x3) << 8) | payload[journalOffset + 1];
        journalOffset += systemJournal.length;
    }

    if (journal.hasChannelJournal) {
        var channel = 0,
            channelJournal;

        journal.totalChannels = (journalHeader & 0x0f) + 1;
        while (channel < journal.totalChannels && journalOffset < payload.length) {
            channelJournal = {};
            channelJournal.channel = (payload[journalOffset] >> 3) & 0x0f;
            channelJournal.s = !!(payload[journalOffset] & 0x80);
            channelJournal.h = !!(payload[journalOffset] & 0x01);
            channelJournal.length = ((payload[journalOffset] & 0x3) << 8) | payload[journalOffset + 1];
            channelJournal.presentChapters = {};
            channelJournal.presentChapters.P = !!(payload[journalOffset + 2] & 0x80);
            channelJournal.presentChapters.C = !!(payload[journalOffset + 2] & 0x40);
            channelJournal.presentChapters.M = !!(payload[journalOffset + 2] & 0x20);
            channelJournal.presentChapters.W = !!(payload[journalOffset + 2] & 0x10);
            channelJournal.presentChapters.N = !!(payload[journalOffset + 2] & 0x08);
            channelJournal.presentChapters.E = !!(payload[journalOffset + 2] & 0x04);
            channelJournal.presentChapters.T = !!(payload[journalOffset + 2] & 0x02);
            channelJournal.presentChapters.A = !!(payload[journalOffset + 2] & 0x01);

            journalOffset += channelJournal.length;

            journal.channelJournals.push(channelJournal);

            channel++;
        }
    }
    return journal;
}

MidiMessage.prototype.generateBuffer = function generateBuffer() {
    var payload = [],
        i,
        command,
        statusByte,
        lastStatusByte,
        bitmask,
        d,
        data_length;

    for (i = 0; i < this.commands.length; i++) {
        command = this.commands[i];
        if (i == 0 && command.deltaTime === 0) {
            this.firstHasDeltaTime = false;
        } else {
            d = command.deltaTime;

            if (d >= 0x7fffff) {
                payload.push((0x80 | d >> 21))
            }
            if (d >= 0x7fff) {
                payload.push((0x80 | d >> 14))
            }
            if (d >= 0x7f) {
                payload.push((0x80 | d >> 7))
            }
            payload.push(0xef & d);
        }
        statusByte = command.data[0];
        data_length = (types_data_length[statusByte & 0xf0] || 0);

        if (data_length + 1 !== command.data.length) {
            this.isValid = false;
            return this;
        }
        if (statusByte !== lastStatusByte) {
            lastStatusByte = statusByte;
            payload.push.apply(payload, command.data);
        } else {
            payload.push.apply(payload, command.data.slice(1));
        }
    }

    this.bigLength = payload.length > 15;

    bitmask = 0;
    bitmask |= this.bigLength ? (flags.bigLength | payload.length >> 8) : payload.length;
    bitmask |= this.hasJournal ? flags.hasJournal : 0;
    bitmask |= this.firstHasDeltaTime ? flags.firstHasDeltaTime : 0;
    bitmask |= this.p ? flags.p : 0;

    if (this.bigLength) {
        payload.unshift(0xff & payload.length, 1);
    }

    payload.unshift(bitmask);
    this.payload = new Buffer(payload);

    RTPMessage.prototype.generateBuffer.apply(this);
    return this;
};

MidiMessage.prototype.toJSON = function() {
    return {
        commands: this.commands.map(function(command) {
            return {
                deltaTime: command.deltaTime,
                data: Array.prototype.slice.apply(command.data)
            };
        })
    };
};

module.exports = MidiMessage;

}).call(this,require("buffer").Buffer)
},{"./RTPMessage":25,"buffer":4,"util":12}],25:[function(require,module,exports){
(function (Buffer){
"use strict";

var util = require("util"),
    assert = require('assert'),
    AbstractMessage = require("./AbstractMessage");

/**
 * This represents a RTP Protocol message.
 * @constructor
 */
function RTPMessage() {
    AbstractMessage.apply(this);
    this.csrcs = [];
}

util.inherits(RTPMessage, AbstractMessage);


RTPMessage.prototype.version = 2;
RTPMessage.prototype.padding = false;
RTPMessage.prototype.hasExtension = false;
RTPMessage.prototype.csrcCount = 0;
RTPMessage.prototype.marker = false;
RTPMessage.prototype.payloadType = 0;
RTPMessage.prototype.sequenceNumber = 0;
RTPMessage.prototype.timestamp = 0;
RTPMessage.prototype.ssrc = 0;
RTPMessage.prototype.payload = new Buffer(0);

/**
 * Parses a Buffer into this RTPMessage object
 * @param {Buffer} The buffer containing a RTP AbstractMessage
 * @returns {Buffer} self
 */
RTPMessage.prototype.parseBuffer = function parseBuffer(buffer) {
    var firstByte,
        secondByte,
        currentOffset,
        i;

    AbstractMessage.prototype.parseBuffer.apply(this, arguments);
    firstByte = buffer.readUInt8(0);

    this.version = firstByte >>> 6;
    this.padding = !!(firstByte >>> 5 & 1);
    this.hasExtension = !!(firstByte >>> 4 & 1);
    this.csrcCount = firstByte & 0xF;

    secondByte = buffer.readUInt8(1);
    this.marker = (secondByte & 0x80) == 0x80;
    this.payloadType = secondByte & 0x7f;

    this.sequenceNumber = buffer.readUInt16BE(2);
    this.timestamp = buffer.readUInt32BE(4);
    this.ssrc = buffer.readUInt32BE(8);
    currentOffset = 12;
    for (i = 0; i < this.csrcCount; i++) {
        this.csrcs.push(buffer.readUInt32BE(currentOffset));
        i++;
    }
    if (this.hasExtension) {
        this.extensionHeaderId = buffer.readUInt16BE(currentOffset);
        currentOffset += 2;
        this.extensionHeaderLength = buffer.readUInt16BE(currentOffset);
        currentOffset += 2;
        this.extension = buffer.slice(currentOffset, currentOffset += this.extensionHeaderLength / 32);
    }
    this.payload = buffer.slice(currentOffset);

    return this;
};

/**
 * Generates the buffer of the message. It is then available as the .buffer property.
 * @returns {RTPMessage} self
 */
RTPMessage.prototype.generateBuffer = function generateBuffer() {
    var bufferLength = 12,
        payLoadOffset,
        buffer,
        firstByte,
        secondByte,
        i,
        length;

    bufferLength += ((this.csrcs.length > 15 ? 15 : this.csrcs.length) * 15);
    if (this.hasExtension) {
        bufferLength += 4 * (this.extension.length + 1);
    }
    payLoadOffset = bufferLength;
    if (Buffer.isBuffer(this.payload)) {
        bufferLength += this.payload.length;
    }

    buffer = new Buffer(bufferLength);

    firstByte = 0;
    firstByte |= this.version << 6;
    firstByte |= this.padding ? 0x20 : 0;
    firstByte |= this.hasExtension ? 0x10 : 0;
    firstByte |= (this.csrcs.length > 15 ? 15 : this.csrcs.length);

    secondByte = this.payloadType | (this.marker ? 0x80 : 0);

    buffer.writeUInt8(firstByte, 0);
    buffer.writeUInt8(secondByte, 1);
    buffer.writeUInt16BE(this.sequenceNumber, 2);
    buffer.writeUInt32BE(this.timestamp << 0, 4);

    buffer.writeUInt32BE(this.ssrc, 8);

    for (i = 0; i < this.csrcs && i < 15; i++) {
        buffer.writeUInt32BE(this.csrcs[i], 12 + (4 * i));
    }

    if (this.hasExtension) {
        length = Math.ceil(this.extension.length / 32);
        buffer.writeUInt16BE(this.extensionHeaderId, 12 + (4 * i));
        buffer.writeUInt16BE(length, 14 + (4 * i));
        this.extension.copy(buffer, 16 + (4 * i));
    }

    if (Buffer.isBuffer(this.payload)) {
        this.payload.copy(buffer, payLoadOffset);
    }

    this.buffer = buffer;
    return this;
};

module.exports = RTPMessage;
}).call(this,require("buffer").Buffer)
},{"./AbstractMessage":21,"assert":1,"buffer":4,"util":12}],26:[function(require,module,exports){
(function (process,Buffer){
"use strict";

var util = require("util"),
    EventEmitter = require("events").EventEmitter,
    dgram = require("dgram"),
    ControlMessage = require("./ControlMessage"),
    MidiMessage = require("./MidiMessage"),
    MdnsService = require("./mdns"),
    Stream = require("./Stream");


function Session(port, localName, bonjourName, ssrc) {
    EventEmitter.apply(this);
    this.streams = [];
    this.localName = localName;
	this.bonjourName = bonjourName;
    this.port = port || 5004;
	this.ssrc = ssrc;
    this.readyState = 0;
    this.published = false;

    this.debug = false;


    this.streamConnected = this.streamConnected.bind(this);
    this.streamDisconnected = this.streamDisconnected.bind(this);
    this.deliverMessage = this.deliverMessage.bind(this);
}

util.inherits(Session, EventEmitter);

Session.prototype.start = function start() {
    try {
		this.controlChannel = dgram.createSocket("udp4");
		this.controlChannel.on("message", this.handleMessage.bind(this));
		this.controlChannel.on("listening", this.listening.bind(this));
		this.messageChannel = dgram.createSocket("udp4");
		this.messageChannel.on("message", this.handleMessage.bind(this));
		this.messageChannel.on("listening", this.listening.bind(this));
        this.controlChannel.bind(this.port);
        this.messageChannel.bind(this.port + 1);
    } catch (e) {
        this.emit('error', e);
    }
};

Session.prototype.end = function(callback) {

	var i = -1,
		next = function() {
			i++;
			var stream = this.streams[i];
			if (stream) {
				stream.end(next);
			} else {
				this.unpublish();
				this.controlChannel.close();
				this.messageChannel.close();
				this.readyState = 0;
				this.published = false;
				callback && callback();
			}
		}.bind(this);

	if (this.readyState === 2) {
		next();
	} else {
		callback && callback();
	}
};

Session.prototype.now = (function () {
  var rate = 10000,
      maxValue = Math.pow(2, 32),
      tickSource,
      start
    ;

  if (process.hrtime) {
    start = process.hrtime();
    tickSource = function() {
      var hrtime = process.hrtime(start);
      var now = hrtime[0] + hrtime[1] / (1000 * 1000 * 1000);
      return now;
    }
  } else {
    start = Date.now();
    tickSource = function() {
      return (Date.now() - start) / 1000;
    }
  }

  return function() {
    var now = Math.round(tickSource() * rate);
    return now % maxValue;
  }

})();

Session.prototype.log = function log() {
    if (this.debug) {
        console.log.apply(console, arguments);
    }
};

Session.prototype.listening = function listening() {
    this.readyState++;
    if (this.readyState == 2) {
        this.emit('ready');
    }
};

Session.prototype.handleMessage = function handleMessage(message, rinfo) {
    this.log("Incoming Message = ", message);
    var appleMidiMessage = new ControlMessage().parseBuffer(message),
        stream;
    if (appleMidiMessage.isValid) {
        stream = this.streams.filter(function (stream) {
            return stream.ssrc == appleMidiMessage.ssrc || stream.token == appleMidiMessage.token;
        }).pop();
        this.emit('controlMessage', appleMidiMessage);

        if (!stream && appleMidiMessage.command == 'invitation') {
            stream = new Stream(this);
            stream.handleControlMessage(appleMidiMessage, rinfo);
            this.addStream(stream);

        } else if (stream) {
            stream.handleControlMessage(appleMidiMessage, rinfo);
        }
    } else {
        var rtpMidiMessage = new MidiMessage().parseBuffer(message);
        stream = this.streams.filter(function (stream) {
            return stream.ssrc == rtpMidiMessage.ssrc;
        }).pop();
        if (stream) {
            stream.handleMidiMessage(rtpMidiMessage);
        }
        this.emit('midi', rtpMidiMessage);
    }
};

Session.prototype.sendControlMessage = function sendMessage(rinfo, message, callback) {
    message.generateBuffer();

    if (true || message instanceof MidiMessage) {
        //console.log(message);
    }

    if (message.isValid) {

        (rinfo.port % 2 == 0 ? this.controlChannel : this.messageChannel).send(message.buffer, 0, message.buffer.length, rinfo.port, rinfo.address, function () {
          this.log("Outgoing Message = ", message.buffer);
          callback && callback();
        }.bind(this));
    } else {
        this.log("Ignoring invalid message");
    }
};

Session.prototype.sendMessages = function(messages, ssrc) {
    var commands = messages.map(function(message) {
        return {deltaTime: 0, data: message};
    });
    if (ssrc) {
        var stream = this.getStream(ssrc);
        if (stream) {
            stream.sendMessage({
                commands: commands
            });
            return true;
        }
        return false;
    } else {
        var streams = this.getStreams();
        for (var i = 0; i < streams.length; i++) {
            streams[i].sendMessage({
                commands: commands
            });
        }
        return true;
    }
};

Session.prototype.sendMessage = function sendMessage(command, ssrc) {
    if (!Buffer.isBuffer(command)) {
        command = new Buffer(command);
    }
    this.sendMessages([command], ssrc);    
};

Session.prototype.connect = function connect(rinfo) {
    var stream = new Stream(this);
    this.addStream(stream);
    var counter = 0;
    var connectionInterval = setInterval(function () {
        if (counter < 40 && stream.ssrc === null) {
            stream.sendInvitation(rinfo);
            counter++;
        } else {
            clearInterval(connectionInterval);
            if (!stream.ssrc) {
                this.log("Server at " + rinfo.address + ':' + rinfo.port + ' did not respond.');
            }
        }
    }.bind(this), 1500);
};

Session.prototype.streamConnected = function streamConnected(event) {
    this.emit('streamAdded', {
        stream: event.stream
    });
};

Session.prototype.streamDisconnected = function streamDisconnected(event) {
    this.removeStream(event.stream);
    this.emit('streamRemoved', {
        stream: event.stream
    });
};

Session.prototype.addStream = function addStream(stream) {
    stream.on('connected', this.streamConnected);
    stream.on('disconnected', this.streamDisconnected);
    stream.on('message', this.deliverMessage);
    this.streams.push(stream);
};

Session.prototype.removeStream = function removeStream(stream) {
    stream.removeListener('connected', this.streamConnected);
    stream.removeListener('disconnected', this.streamDisconnected);
    stream.removeListener('message', this.deliverMessage);
    this.streams.splice(this.streams.indexOf(stream));
};

Session.prototype.deliverMessage = function(deltaTime, message) {
    this.emit('message', deltaTime, message);
};

Session.prototype.getStreams = function getStreams() {
    return this.streams.filter(function (item) {
        return item.isConnected;
    });
};

Session.prototype.getStream = function getStream(ssrc) {
    for (var i = 0; i < this.streams.length; i++) {
        if (this.streams[i].ssrc === ssrc) {
            return this.streams[i];
        }
    }
    return null;
};

Session.prototype.publish = function() {
    MdnsService.publish(this);
    this.published = true;
};

Session.prototype.unpublish = function() {
    MdnsService.unpublish(this);
    this.published = false;
};

Session.prototype.toJSON = function(includeStreams) {
    return {
        bonjourName: this.bonjourName,
		localName: this.localName,
		ssrc: this.ssrc,
        port: this.port,
        published: this.published,
        activated: this.readyState >=2,
        streams: includeStreams ? this.getStreams().map(function(stream) {
            return stream.toJSON();
        }) : undefined
    };
};

module.exports = Session;

}).call(this,require("/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),require("buffer").Buffer)
},{"./ControlMessage":22,"./MidiMessage":24,"./Stream":27,"./mdns":29,"/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":9,"buffer":4,"dgram":"+nV/x3","events":7,"util":12}],27:[function(require,module,exports){
(function (Buffer){
"use strict";

var util = require("util"),
    EventEmitter = require('events').EventEmitter,
    ControlMessage = require("./ControlMessage.js"),
    MidiMessage = require("./MidiMessage.js");

// Helper functions

function generateRandomInteger(octets) {
    return Math.round(Math.random() * Math.pow(2, 8 * octets));
}

function Stream(session) {
    EventEmitter.apply(this);
    this.session = session;
    this.token = null;
    this.ssrc = null;
    this.rinfo1 = null;
    this.rinfo2 = null;
    this.name = '';
    this.lastSentSequenceNr = Math.round(Math.random() * 0xffff);
    this.firstReceivedSequenceNumber = -1;
    this.lastReceivedSequenceNumber = -1;
    this.lostSequenceNumbers = [];
    this.latency = null;
    this.subscribers = [];
    this.isConnected = false;
    this.receiverFeedbackTimeout = null;
}

util.inherits(Stream, EventEmitter);

Stream.prototype.handleControlMessage = function handleControlMessage(message, rinfo) {
    var commandName = message.command;
    var handlerName = 'handle';
    handlerName += commandName.slice(0, 1).toUpperCase();
    handlerName += commandName.slice(1);
    if (this[handlerName]) {
        this[handlerName](message, rinfo);
    }
    this.emit('control-message', message);
};

Stream.prototype.handleMidiMessage = function handleMidiMessage(message) {
    if (this.firstReceivedSequenceNumber !== -1) {
        for (var i = this.lastReceivedSequenceNumber + 1; i < message.sequenceNumber; i++) {
            this.lostSequenceNumbers.push(i);
        }
    } else {
        this.firstReceivedSequenceNumber = message.sequenceNumber;
    }  
    

    this.lastReceivedSequenceNumber = message.sequenceNumber;

    message.commands.forEach(function(command) {
        this.emit('message', command.deltaTime, command.data);
    }.bind(this));

    clearTimeout(this.receiverFeedbackTimeout);
    this.receiverFeedbackTimeout = setTimeout(this.sendReceiverFeedback.bind(this), 1000);
};

Stream.prototype.handleInvitation_accepted = function handleInvitation_accepted(message, rinfo) {
    if (this.rinfo1 === null) {
        this.session.log("Invitation Accepted by " + message.name);
        this.name = message.name;
        this.ssrc = message.ssrc;
        this.rinfo1 = rinfo;
        this.sendInvitation({
            address: rinfo.address,
            port: rinfo.port + 1
        });
        this.isConnected = true;
        this.emit('connected', {
            stream: this
        });
    } else if (this.rinfo2 === null) {
        this.session.log("Data channel to " + this.name + " established");
        this.rinfo2 = rinfo;
        var count = 0;
        this.syncInterval = setInterval(function () {
            this.sendSynchronization();
            count++;
            if (count > 10) {
                clearInterval(this.syncInterval);
                this.syncInterval = setInterval(function () {
                    this.sendSynchronization();
                }.bind(this), 10000)
            }
        }.bind(this), 1500);
    }
};

Stream.prototype.handleInvitation = function handleInvitation(message, rinfo) {
    if (this.rinfo1 === null) {
        this.rinfo1 = rinfo;
        this.token = message.token;
        this.name = message.name;
        this.ssrc = message.ssrc;
        this.session.log("Got an invitation from " + message.name + " on channel 1");
    } else if (this.rinfo2 == null) {
        this.rinfo2 = rinfo;
        this.session.log("Got an invitation from " + message.name + " on channel 2");
        this.isConnected = true;
        this.emit('connected', {
            stream: this
        });
    }
    this.sendInvitationAccepted(rinfo);
};

Stream.prototype.handleSynchronization = function handleSynchronization(message, rinfo) {
    this.sendSynchronization(message);
};

Stream.prototype.handleEnd = function handleEndstream() {
    this.session.log(this.name + " ended the stream");
    clearInterval(this.syncInterval);
    this.isConnected = false;
    this.emit('disconnected', {
        stream: this
    });
};

Stream.prototype.handleReceiver_feedback = function(message, rinfo) {
  this.session.log('Got receiver feedback', 'SSRC ' + message.ssrc + ' is at ' + message.sequenceNumber + '. Current is ' + this.lastSentSequenceNr);
};

Stream.prototype.sendInvitation = function sendInvitation(rinfo) {
    if (!this.token) {
        this.token = generateRandomInteger(4);
    }
    this.session.sendControlMessage(rinfo, new ControlMessage().mixin({
        command: 'invitation',
        token: this.token,
        ssrc: this.session.ssrc,
        name: this.session.bonjourName
    }));
};

Stream.prototype.sendInvitationAccepted = function sendInvitationAccepted(rinfo) {
    this.session.sendControlMessage(rinfo, new ControlMessage().mixin({
        command: 'invitation_accepted',
        token: this.token,
        ssrc: this.session.ssrc,
        name: this.session.bonjourName
    }));
};

Stream.prototype.sendEndstream = function sendEndstream(callback) {
    this.session.sendControlMessage(this.rinfo1, new ControlMessage().mixin({
        command: 'end',
        token: this.token,
        ssrc: this.session.ssrc,
        name: this.name
    }), callback);
};

Stream.prototype.sendSynchronization = function sendSynchronization(incomingSyncMessage) {
    var count = incomingSyncMessage ? incomingSyncMessage.count : -1;
    var now = this.session.now();
    var answer = new ControlMessage();

    answer.command = 'synchronization';
    answer.timestamp1 = count !== -1 ? incomingSyncMessage.timestamp1 : new Buffer(8);
    answer.timestamp2 = count !== -1 ? incomingSyncMessage.timestamp2 : new Buffer(8);
    answer.timestamp3 = count !== -1 ? incomingSyncMessage.timestamp3 : new Buffer(8);
    answer.count = count + 1;
    answer.ssrc = this.session.ssrc;
    answer.token = this.token;
    var timestamp;
    switch (count) {
        case -1:
            timestamp = answer.timestamp1;
            break;
        case 0:
            timestamp = answer.timestamp2;
            break;
        case 1:
            timestamp = answer.timestamp3;
            this.latency = (now - incomingSyncMessage.timestamp1.readUInt32BE(4)) / 2;
            break;
        case 2:
            this.latency = (incomingSyncMessage.timestamp3.readUInt32BE(4) - incomingSyncMessage.timestamp1.readUInt32BE(4)) / 2;
            break;
    }

    if (timestamp) {
      timestamp.writeUInt32BE(0, 0);
      timestamp.writeUInt32BE(now, 4);
    }

    if (answer.count < 3) {
        this.session.sendControlMessage(this.rinfo2, answer);
    }
    this.session.log("Synchronizing. Latency: " + this.latency);
};

Stream.prototype.sendReceiverFeedback = function(callback) {
    if (this.lostSequenceNumbers.length) {
        this.session.log('Lost packages: ', this.lostSequenceNumbers);
    }
    this.session.sendControlMessage(this.rinfo1, new ControlMessage().mixin({
        command: 'receiver_feedback',
        ssrc: this.session.ssrc,
        sequenceNumber: this.lastReceivedSequenceNumber
    }), callback);
}

Stream.prototype.sendMessage = function sendMessage(message, callback) {
    var message = new MidiMessage().mixin(message)
    message.ssrc = this.session.ssrc;
    message.sequenceNumber = this.lastSentSequenceNr = (this.lastSentSequenceNr + 1) % 0xf0000;
    message.timestamp = this.session.now();
    this.session.sendControlMessage(this.rinfo2, message, callback);
};

Stream.prototype.end = function end(callback) {
    clearInterval(this.syncInterval);
	if (this.isConnected) {
		this.sendEndstream(function() {
			this.emit('disconnected', {
				stream: this
			});
			this.isConnected = false;
			callback && callback();
		}.bind(this));
	} else {
		callback && callback()
	}
};

Stream.prototype.toJSON = function() {
    return {
        address: this.rinfo1.address,
		ssrc: this.ssrc,
        port: this.rinfo1.port,
        name: this.name
    };
};

module.exports = Stream;

}).call(this,require("buffer").Buffer)
},{"./ControlMessage.js":22,"./MidiMessage.js":24,"buffer":4,"events":7,"util":12}],28:[function(require,module,exports){
(function (process){
'use strict';

var Session         = require('./Session'),
    MdnsService     = require('./mdns'),
    os              = require("os"),
    assert          = require("assert"),
    sessions        = [],
    EventEmitter    = require("events").EventEmitter,
    inMemoryStore   = {},
    storageHandler,
    manager = module.exports = new EventEmitter();

MdnsService.on('remoteSessionUp', function(remoteSession) {
    //if (isNotLocalSession(remoteSession)) {
        manager.emit('remoteSessionAdded', {remoteSession: remoteSession});
    //}

}.bind(this));

MdnsService.on('remoteSessionDown', function(remoteSession) {
    //if (isNotLocalSession(remoteSession)) {
        manager.emit('remoteSessionRemoved', {remoteSession: remoteSession});
    //}
}.bind(this));

function generateRandomInteger(octets) {
	return Math.round(Math.random() * Math.pow(2, 8 * octets));
}

function createSession(config, dontSave) {
    config = config || {};
    config.bonjourName = config.bonjourName || os.hostname() + (sessions.length ? ('-' + sessions.length) : '');
	  config.localName = config.localName || 'Session ' + (sessions.length + 1);
	  config.ssrc = config.ssrc || generateRandomInteger(4);
    config.port = config.port || 5006;
    config.activated = config.hasOwnProperty('activated') ? config.activated : true;
    config.published = config.hasOwnProperty('published') ? config.published : true;
    config.streams = config.streams || [];

    var session = new Session(config.port, config.localName, config.bonjourName, config.ssrc);

    sessions.push(session);

    if (config.published) {
        session.on('ready', function() {
            session.publish();
        });
    }
    if (config.activated) {
        session.start();
    }
    manager.emit('sessionAdded', {session: session});

    if (!dontSave) {
        storageHandler({method: 'write', sessions: [session.toJSON()]}, function() {});
    }
    return session;
}
function removeSession(session) {
	if (session) {
		session.end(function() {
			sessions.splice(sessions.indexOf(session));
			console.log(sessions);
			manager.emit('sessionRemoved', {session: session});
		}.bind(this));
	}
}

function changeSession(config) {
	var session = getSessionBySsrc(config.ssrc);
	if (session) {
		var restart = false, republish = false;

		if (config.hasOwnProperty('bonjourName')  && config.bonjourName !== session.bonjourName) {
			session.bonjourName = config.bonjourName;
			republish = true;
		}
		if (config.hasOwnProperty('localName') && config.localName !== session.localName) {
			session.localName = config.localName;
		}
		if (config.hasOwnProperty('port')  && config.port !== session.port) {
			session.port = config.port;
			restart = true;
			republish = true;
		}

		var cb = function() {
			session.removeListener('ready', cb);
			if (config.published !== false && republish) {
				session.publish();
			}
			this.emit('sessionChanged', {session: session});
		}.bind(this);


		if (config.published === false || republish || config.activated == false) {
			session.unpublish();
		}

		if ((config.hasOwnProperty('activated') && config.activated !== (session.readyState === 2)) || restart) {
			session.end(function() {
				this.emit('sessionChanged', {session: session});
				console.log(config, restart);
				if (config.activated !== false || restart) {
					session.on('ready', cb);
					session.start();
				}
			}.bind(this))
		} else {
			cb();
		}
	}
}

function getSessionConfiguration() {
    return sessions.map(function(session) {
        return session.toJSON(true);
    });
}

function isNotLocalSession(config) {
	for (var i = 0;i < sessions.length; i++) {
		var session = sessions[i];
        if (session.bonjourName == config.name && session.port == config.port) {
            return false;
        }
    }
    return true;
}

function getSessionByName(name) {
	for (var i = 0;i < sessions.length; i++) {
		var session = sessions[i];
        if (session.name === name) {
            return session;
        }
    }
    return null;
}

function getSessionByPort(port) {
	for (var i = 0;i < sessions.length; i++) {
		var session = sessions[i];
        if (session.port === port) {
            return session;
        }
    }
    return null;
}

function getSessionBySsrc(ssrc) {
	for (var i = 0;i < sessions.length; i++) {
		var session = sessions[i];
		if (session.ssrc == ssrc) {
			return session;
		}
	}
	return null;
}

process.on('SIGINT', function() {
	reset(function() {
		process.exit();
	})
});

function reset(callback) {
	var i = -1;
	function next() {
		i++;
		var session = sessions[i];
		if (session) {
			session.end(next);
		} else {
			callback && callback();
		}
	}
	next();
}

function startDiscovery() {
    MdnsService.start();
}

function stopDiscovery() {
    MdnsService.stop();
}

manager.createSession = createSession;
manager.removeSession = removeSession;
manager.changeSession = changeSession;
manager.getSessionByName = getSessionByName;
manager.getSessionBySsrc = getSessionBySsrc;
manager.getSessionByPort = getSessionByPort;
manager.startDiscovery = startDiscovery;
manager.stopDiscovery = stopDiscovery;
manager.stopDiscovery = stopDiscovery;
manager.reset = reset;
manager.getSessions = function() {
    return sessions.slice();
};
manager.getRemoteSessions = function() {
    return MdnsService.getRemoteSessions().slice(); //filter(isNotLocalSession);
};
manager.storageHandler = function(handler) {
    storageHandler = handler;
};
manager.storageHandler(function(config, callback) {
    switch(config.method) {
        case 'read':
            callback(null, JSON.parse(inMemoryStore['sessions'] || '[]'));
            break;
        case 'write':
            inMemoryStore['sessions'] = JSON.stringify(config.sessions || []);
            callback(null);
            break;
        default:
            callback({message: 'Wrong method.'});
    }
});

storageHandler({method: 'read'}, function(err, sessionConfig) {
    sessionConfig.forEach(function(config) {
        createSession(config, true);
    });
});
}).call(this,require("/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"./Session":26,"./mdns":29,"/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":9,"assert":1,"events":7,"os":10}],29:[function(require,module,exports){
(function (global){
'use strict';

var service;

if (global.MojoLoader) {
    console.log("Using webos mDNS service");
    service = require('./service-webos');
} else {
    service = require('./service-mdns');
}

module.exports = service;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./service-mdns":30,"./service-webos":31}],30:[function(require,module,exports){
'use strict';

var mdns = null,
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    service_id = '_apple-midi._udp',
    publishedSessions = [],
    advertisments = [],
    remoteSessions = {},
    browser = null;

try {
    mdns = require('mdns');
} catch (e) {
    console.log('mDNS discovery is not available.');
}



function sessionDetails(session) {
    return {
        name: session.name,
        port: session.port,
        address: session.addresses && session.addresses[0],
        host: session.host
    };
}

function MDnsService() {
    if (mdns) {
        browser = mdns.createBrowser(service_id);
        browser.on('serviceUp', function (service) {
            remoteSessions[service.name] = service;
            this.emit('remoteSessionUp', sessionDetails(service));
        }.bind(this));
        browser.on('serviceDown', function (service) {
            var srv = remoteSessions[service.name];
            delete(remoteSessions[service.name]);
            this.emit('remoteSessionDown', sessionDetails(srv));
        }.bind(this));

    }
}

util.inherits(MDnsService, EventEmitter);

MDnsService.prototype.start = function () {
    remoteSessions = {};
    if (mdns) {
        browser.start();
    } else {
        console.log('mDNS discovery is not available.')
    }
};

MDnsService.prototype.stop = function() {
    if (mdns && browser) {
        browser.stop();
    }
};

MDnsService.prototype.publish = function(session) {
    if (mdns) {
        if (publishedSessions.indexOf(session) !== -1) {
            return;
        }
        publishedSessions.push(session);
        var ad = mdns.createAdvertisement(service_id, session.port, {
            name: session.bonjourName
        });
        advertisments.push(ad);
        ad.start();
    }

};

MDnsService.prototype.unpublish = function(session) {
    if (mdns) {
        var index = publishedSessions.indexOf(session)
        if (index === -1) {
            return;
        }
        var ad = advertisments[index];
        ad.stop();
        publishedSessions.splice(index);
        advertisments.splice(index);
    }
};

MDnsService.prototype.getRemoteSessions = function() {
    var sessions = [];
    for (var name in remoteSessions) {
        sessions.push(sessionDetails(remoteSessions[name]));
    }
    return sessions;
};

module.exports = new MDnsService();

},{"events":7,"mdns":"IeR/1B","util":12}],31:[function(require,module,exports){
(function (process){
var util            = require('util'),
    EventEmitter    = require('events').EventEmitter

var api = {
    bonjour: function(method, params) {
        var parameters = {
            "regType":"_apple-midi._udp",
            "interfaceName":"eth0",
            "subscribe": true
        };
        for (var k in params) {
            parameters[k] = params[k];
        }
        return api.futureToEventEmitter(PalmCall.call('palm://com.palm.zeroconf', method, parameters));
    },
    browse: function() {
        return api.bonjour('browse')
    },
    resolve: function(instanceName) {
        return api.bonjour('resolve', {instanceName: instanceName});
    },
    register: function(instanceName, port) {
        return api.bonjour('register', {instanceName: instanceName, port: port});
    },
    openUdpPorts: function() {
        var rules = Array.prototype.slice.call(arguments).map(function(a) {
            return {protocol: "UDP", destinationPort: a};
        });
        return api.futureToEventEmitter(PalmCall.call('palm://com.palm.firewall/', 'control', {
            "subscribe":true,
            "rules": rules
        }));
    },
    publish: function(session) {
        api.openUdpPorts(session.port, session.port + 1).on('result', function(result) {
            if (result.returnValue) {
                publishedSessionsFutures[session.name] = api.register(session.name, session.port);
            }
        });
    },
    futureToEventEmitter: function(future) {
        var eventEmitter = new EventEmitter();
        eventEmitter.cancel = future.cancel.bind(future);
        var handler = function(future) {
            if (future.result.returnValue === false) {
                eventEmitter.emit('error', future.result);
            } else {
                if (future.result.eventType) {
                    eventEmitter.emit(future.result.eventType, future.result);
                }
                eventEmitter.emit('result', future.result);
            }
            future.then(handler);
        };
        future.then(handler);
        return eventEmitter;
    }
};




function startBrowsing() {
    browsingFuture = api.browse()
        .on('Add', function(result) {
            api.bonjour('resolve', result).on('result', function(resolved) {
                if (resolved.IPv4Address) {
                    remoteSessions[result.instanceName] = sessionDetails(result, resolved)
                    this.emit('remoteSessionUp', remoteSessions[result.instanceName]);
                }
            }.bind(this));
        }.bind(this))
        .on('Rmv', function(result) {
            if (remoteSessions[result.instanceName]) {
                this.emit('remoteSessionDown', remoteSessions[result.instanceName]);
                delete(remoteSessions[result.instanceName]);
            }
        }.bind(this));
}

function sessionDetails(result, resolved) {
    return {
        name: result.instanceName,
        port: resolved.port,
        address: resolved.IPv4Address,
        host: resolved.targetName
    };
}

var publishedSessionsFutures = {},
    remoteSessions = {};

function MDnsService() {}

util.inherits(MDnsService, EventEmitter);

MDnsService.prototype.publish = function(session) {
    process.nextTick(api.publish.bind(api, session));
};

var browsingFuture = null;

MDnsService.prototype.start = function () {
    if (browsingFuture === null) {
        browsingFuture = true;
        process.nextTick(startBrowsing.bind(this));
    }
};

MDnsService.prototype.stop = function() {
    if (browsingFuture && browsingFuture.cancel) {
        browsingFuture.cancel();
    }
};

MDnsService.prototype.stop = function() {

};

MDnsService.prototype.unpublish = function(session) {
    if (publishedSessionsFutures[session.name]) {
        publishedSessionsFutures[session.name].cancel();
    }
};

MDnsService.prototype.getRemoteSessions = function() {
    var sessions = [];
    for (var k in remoteSessions) {
        if (remoteSessions.hasOwnProperty(k)) {
            sessions.push(remoteSessions[k]);
        }
    }
    return sessions;
};

module.exports = new MDnsService();


}).call(this,require("/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/Volumes/HD/dev/repositories/rtpmidi-chrome/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":9,"events":7,"util":12}]},{},[20])