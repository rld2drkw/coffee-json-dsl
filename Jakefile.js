"use strict";

watchTask(['test'], function() {
  this.watchFiles.include([
    'src/**/*.js',
    'spec/**/*.js',
    'spec/fixtures/**/*'
  ]);
});

task('test', function() {
  jake.exec('jasmine', {
    printStdout: true,
    printStderr: true,
    breakOnError: false
  });
});
