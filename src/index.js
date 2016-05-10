"use strict";

const fs = require('fs');
const path = require('path');

// define private instance property
const CoffeeTemplates = Symbol();
const Plugins = Symbol();

class Kahlua {
  constructor() {
    this[CoffeeTemplates] = [];
    this[Plugins] = [];
  }

  use(plugin, options) {
    if (!options) options = {};
    if (typeof plugin === 'string') {
      let pluginName = resolvePluginName(plugin);
      plugin = require(pluginName).call(this, options);
      plugin.name = path.parse(pluginName).name;
    } else {
      plugin.name = '(anonymous)';
    }
    this[Plugins].push(plugin);
  }

  get plugins() {
    return this[Plugins].map(plugin => plugin.name);
  }

  load(templateFile) {
    let templateString = fs.readFileSync(templateFile, {
      encoding: 'utf-8'
    });
    this.add(templateString);
  }

  add(templateString) {
    this[CoffeeTemplates].push(templateString);
  }

  generate() {
    let context = {};
    this._bindDslCommands(context);

    let document = this._initDocumentRoot()
    this._invokePluginEvent('init', context, document);

    const cs = require('coffee-script');
    for (let template of this[CoffeeTemplates]) {
      let page = {};
      for (let key in document) {
        page[key] = {};
      }
      page.$ = context;
      this._invokePluginEvent('beforeEach', context, page);
      cs.eval(template, {
        sandbox: page
      });
      this._invokePluginEvent('afterEach', context, page);

      for (let key in document) {
        Object.assign(document[key], page[key]);
      }
    }
    this._invokePluginEvent('finish', context, document);
    // Now, we can access Template definition as a variable
    return JSON.stringify(document, null, 2);
  }

  _initDocumentRoot() {
    let document = {};
    for (let plugin of this[Plugins]) {
      if (plugin.DOCUMENT) {
        Object.assign(document, plugin.DOCUMENT);
      }
    }
    return document;
  }

  _bindDslCommands(context) {
    for (let plugin of this[Plugins]) {
      for (let dslCommand in plugin.DSL) {
        context[dslCommand] = function(args) {
          return plugin.DSL[dslCommand].apply(context, arguments);
        }
      }
    }
  }

  _invokePluginEvent(eventName, context, document) {
    for (let plugin of this[Plugins]) {
      let eventHandler = getHandler(plugin, eventName);
      if (eventHandler) {
        eventHandler.call(context, document);
      }
    }
  }
};

function getHandler(plugin, eventName) {
  if (plugin.HOOK && typeof plugin.HOOK[eventName] === 'function') return plugin.HOOK[eventName];
  else return null;
}

function resolvePluginName(pluginName) {
  let pluginPathParts = pluginName.split('/')
  let pluginBaseName = pluginPathParts.pop();

  if (!pluginBaseName.startsWith('coffee-json-dsl-')) {
    pluginBaseName = `coffee-json-dsl-${pluginBaseName}`;
  }
  pluginPathParts.push(pluginBaseName);
  let pluginId = pluginPathParts.join('/');
  return pluginId;
}

module.exports = Kahlua;
