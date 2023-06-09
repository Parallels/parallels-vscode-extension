var gulp = require("gulp");

gulp.task("copy-images", function () {
  return gulp.src("media/**/*").pipe(gulp.dest("dist/images"));
});
