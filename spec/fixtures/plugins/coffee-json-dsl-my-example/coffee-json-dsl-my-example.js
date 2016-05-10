// use Symbol to define property to avoid conflicts with other plugins.
const Lambdas = Symbol();
const Value = Symbol();

module.exports = function(options) {
  return {
    DSL: {
      examplePluginMethod: function() {
        if (this[Value]) return this[Value];
        return 100;
      }
    },
    DOCUMENT: {
      Resources: {}
    },
    HOOK: {
      init: function(document) {
        this[Value] = options.value;
      },
      beforeEach: function(section) {},
      afterEach: function(section) {},
      finish: function(document) {
        delete this[Value];
      }
    }
  };
};
