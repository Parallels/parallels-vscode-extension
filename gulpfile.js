var gulp = require("gulp");

gulp.task("copy-images", function () {
  return gulp.src("media/**/*").pipe(gulp.dest("dist/images"));
});

gulp.task("copy-images-out", function () {
  return gulp.src("media/**/*").pipe(gulp.dest("out/images"));
});
