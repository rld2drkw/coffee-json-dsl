"use strict";

const Cfn = require('..');
const toContainMatcher = require('./helpers/toContainMatcher');

describe('core', function() {
  let cfn = null;
  beforeEach(function() {
    cfn = new Cfn();
  });
  beforeEach(function() {
    jasmine.addMatchers(toContainMatcher);
  });
  describe('plugins', function() {
    describe('use', function() {
      it('accepts a plugin name prefixed by coffee-json-dsl-', function() {
        cfn.use('coffee-json-dsl-my-example');
        expect(cfn.plugins).toContain('coffee-json-dsl-my-example');
      });
      it('accepts a plugin name without coffee-json-dsl- prefix', function() {
        cfn.use('my-example');
        expect(cfn.plugins).toContain('coffee-json-dsl-my-example');
      });
      it('accepts a file path without coffee-json-dsl- prefix', function() {
        cfn.use(`${__dirname}/fixtures/plugins/coffee-json-dsl-my-example/coffee-json-dsl-my-example.js`);
        expect(cfn.plugins).toContain('coffee-json-dsl-my-example');
      });
      it('accepts a file path with coffee-json-dsl- prefix', function() {
        cfn.use(`${__dirname}/fixtures/plugins/coffee-json-dsl-my-example`);
        expect(cfn.plugins).toContain('coffee-json-dsl-my-example');
      });
      it('accepts a plugin object', function() {
        cfn.use({
          DOCUMENT: {
            Resources: {},
          },
          DSL: {
            repeat: function(n, obj) {
              let result = [];
              for (let i = 0; i < n; i++) {
                result.push(obj);
              }
              return result;
            }
          }
        });
        cfn.add('Resources.Test = $.repeat(10, {a:1})');
        let templateString = cfn.generate();
        let templateObj = JSON.parse(templateString);
        expect(templateObj.Resources.Test).toEqual(
          [{
            a: 1
          }, {
            a: 1
          }, {
            a: 1
          }, {
            a: 1
          }, {
            a: 1
          }, {
            a: 1
          }, {
            a: 1
          }, {
            a: 1
          }, {
            a: 1
          }, {
            a: 1
          }]);
      });
      it('takes options as the second argument', function() {
        cfn.use('my-example', {
          value: 10
        });
        expect(cfn.plugins).toContain('coffee-json-dsl-my-example');
      });
    });
  });
  describe('DSL', function() {
    it('can be coffee-script object notation', function() {
      cfn.use({
        DOCUMENT: {
          Resources: {}
        }
      });
      cfn.add(`
Resources.MyResource =
  Value: 100
      `);
      let templateString = cfn.generate();
      expect(templateString)
        .toMatch(/{\s*"Resources": {\s*"MyResource": {\s*"Value": 100\s*}\s*}\s*}/)
    });
    it('shares "this" context with HOOK methods', function() {
      // initialize plugin with {value: 1000}
      cfn.use(`${__dirname}/fixtures/plugins/my-example`, {
        value: 1000
      });
      cfn.load(`${__dirname}/fixtures/templates/examplePluginUsage.coffee`)

      let templateString = cfn.generate();
      let templateObj = JSON.parse(templateString);

      expect(templateObj.Resources.Example.Properties.Value).toBe(1000);
    });
  });
});
