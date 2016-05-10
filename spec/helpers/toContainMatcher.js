"use strict";

module.exports = {
  toContain: function(util, customEqualityTesters) {
    return {
      compare: function(testeeArray, expectedElement) {
        var result = {
          message: `Expected ${testeeArray} to contain ${expectedElement}`
        };
        result.pass = testeeArray.some((item) => util.equals(item, expectedElement));
        if (!result.pass) result.message += ' but it was not found';
        return result;
      }
    };
  }
}
