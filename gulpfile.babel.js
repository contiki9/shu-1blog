import gulp from 'gulp'

//scss
import sass from 'gulp-sass';
import sassGlob from 'gulp-sass-glob';
import pleeease from 'gulp-pleeease';
import plumber from 'gulp-plumber';

//pug
import pug from 'gulp-pug';
import fs from 'fs';
import data from 'gulp-data';
import path from 'path';


//画像圧縮
import imagemin from 'gulp-imagemin';
import pngquant from 'imagemin-pngquant';

//JS圧縮
import uglify from 'gulp-uglify';

//browserSync
import browserSync from 'browser-sync';

//htmlCheck
import htmlhint from 'gulp-htmlhint';

// Utility
import notify from 'gulp-notify';
import watch from 'gulp-watch';
import runSequence from 'run-sequence';
import del from 'del';
import rename from 'gulp-rename';

// workbox
import workboxBuild from 'workbox-build';

////////////
// config
///////////

//開発用ディレクトリ
const develop = {
    'root': './src/',
    'assets': './src/assets/'
};

//コンパイル先
const release = {
    'root': './dist/',
    'css': './dist/css/',
    'assets': './dist/assets/'
};

// Defining base pathes
const paths = {
    node: './node_modules/',
};

// browser-sync watched files
// automatically reloads the page when files changed
const browserSyncWatchFiles = [
    develop.root + './**/*.pug',
    develop.assets + '**/scss/*.scss',
    release.root + '**/css/*.css',
    release.root + '**/js/*.js',
    release.root + '**/*.php',
    release.root + './*.html',
    release.root + '**/*.html'
];


// browser-sync options
// see: https://www.browsersync.io/docs/options/
const browserSyncOptions = {
    //proxy: "localhost/wordpress/",
    notify: false,
    server: {
        baseDir: release.root,
        index: 'index.html'
       },
    open:false//オプション
};

const AUTOPREFIXER_BROWSERS = [
    // @see https://github.com/ai/browserslist#browsers
    // Major Browsers（主要なブラウザの指定）
    'last 2 version', // （Major Browsersの）最新2バージョン
    // 'Chrome >= 34', // Google Chrome34以上
    // 'Firefox >= 30', // Firefox30以上
    'ie >= 9', // IE9以上
    // 'Edge >= 12', // Edge12以上
    'iOS >= 7', // iOS7以上
    // 'Opera >= 23', // Opera23以上
    // 'Safari >= 7', // Safari7以上

    // Other（Androidなどのマイナーなデバイスの指定）
    'Android >= 4.0' // Android4.0以上
];

//////////////////
// gulp setting
//////////////////

// sass
gulp.task('sass', function () {
    console.log('--------- sass task ----------');
    return gulp.src([
        develop.assets + 'scss/**/*.scss',
        '!' + develop.assets + 'scss/vendor/**/*.scss'
    ]).pipe(sassGlob())
        .pipe(plumber({
            errorHandler: function (err) {
                console.log(err.messageFormatted);
                this.emit('end');
            }
        }))
        .pipe(sass())
        .pipe(pleeease({
            autoprefixer: {"browsers": AUTOPREFIXER_BROWSERS},
            minifier: true,
        }))
        .pipe(gulp.dest(release.css));
});


gulp.task('pug', function () {
    // JSONファイルの読み込み。
    const locals = {
        'site': JSON.parse(fs.readFileSync(develop.root + '_data/' + 'site.json')),
        'data': JSON.parse(fs.readFileSync(develop.root + '_data/' + 'data.json'))
    }
    return gulp.src([develop.root + '**/*.pug', '!' + develop.root + '**/_*.pug'])
        .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
        .pipe(data(function (file) {
            // 各ページごとの`/`を除いたルート相対パスを取得します。
            locals.relativePath = path.relative(file.base, file.path.replace(/.pug$/, '.html'));
            return locals;
        }))
        .pipe(pug({
            // JSONファイルをPugに渡します。
            locals: locals,
            // Pugファイルのルートディレクトリを指定します。
            // `/assets/pug/_layout`のようにルート相対パスを使います。
            basedir: 'src',
            // Pugファイルの整形。
            pretty: true
        }))
        .pipe(gulp.dest(release.root))
});


//画像を圧縮
gulp.task('image-min', function () {
    console.log('--------- image-min task ----------');
    return gulp.src(develop.assets + 'images/**/*.+(jpg|jpeg|png|gif|svg)')
        .pipe(imagemin({
            interlaced: true,
            progressive: true,
            use: [pngquant({quality: '65-80', speed: 1})]
        }))
        .pipe(gulp.dest(release.assets+'images/'));
});

// jsを圧縮
gulp.task('uglify', function () {
    console.log('--------- uglify task ----------')
    return gulp.src(develop.assets + '**/*.js')
        .pipe( uglify({
            output:{
                comments: /^!/
            }
        }))
        .pipe(gulp.dest(release.assets));
});

//開発環境のコンパイル
gulp.task('copy', function () {
    console.log('--------- output task ----------');
    gulp.src(
        [develop.root + '**',
            '!' + develop.root + '**/*.pug',
            '!' + develop.root + '**/_include/*',
            '!' + develop.root + '**/_include',
            '!' + develop.root + '**/_data/*',
            '!' + develop.root + '**/_data',
            '!' + develop.assets + '**/scss/*',
            '!' + develop.assets + '**/scss/',
            develop.assets + '**/*.html',
            develop.assets + '**/*.css'
        ],
            //develop.assets + '**/js/*.js',
            //develop.assets + '**/fonts/*.{eot,oft,ttf,woff,woff2}',
            //develop.assets + '**/images/*.{png,jpg,gif,svg}',
        {base: develop.root}
    )
        .pipe(gulp.dest(release.root));

    //assets用
    gulp.src(
        [develop.assets + '**',
            '!' + develop.assets + '**/scss/**',
            '!' + develop.assets + '**/scss/'
        ],
        {base: develop.root}
    )
        .pipe(gulp.dest(release.root));

});


// browserSync
gulp.task('browser-sync', function () {
    browserSync.init(browserSyncWatchFiles, browserSyncOptions);
});

gulp.task('bs-reload', function () {
    console.log('--------- bs-reload task ----------');
    browserSync.reload();
});


////////////////////////////////////////////////
//venderのコピー
////////////////////////////////////////////////
gulp.task('copy-vendor', function () {
    console.log('--------- copy-vender task ----------');

    // Copy Skeleton
    gulp.src(paths.node + 'skeleton-scss/scss/**/*.scss')
        .pipe(gulp.dest(develop.assets + '/scss/vendor/skeleton-scss'));

    // Copy dlex
    gulp.src(paths.node + 'dlex/src/scss/**/_dlex.scss')
        .pipe(gulp.dest(develop.assets + '/scss/vendor/dlex'));
    gulp.src(paths.node + 'dlex/src/scss/**/_mixin.scss')
        .pipe(gulp.dest(develop.assets + '/scss/vendor/dlex'));
    return stream;
});

///////////////////////////////////////////////
//HTMLの文法チェック
////////////////////////////////////////////////
gulp.task('check-html', function () {
    console.log('--------- check-html task ----------');
    //opstion ルール
    //https://github.com/yaniswang/HTMLHint/wiki/Rules
    gulp.src(release.root + '/**/*.html')
        .pipe(htmlhint(
            {
                "alt-require": true,
                "attr-lowercase": true,
                "attr-value-double-quotes": true,
                "doctype-first": false,
                "tag-pair": true,
                "tag-self-close": false,
                "spec-char-escape": true,
                "id-unique": true,
                "src-not-empty": true,
                "attr-no-duplication": true,
                "title-require": true,
                "doctype-html5": true,
            }
        ))
        .pipe(htmlhint.reporter());
});

///////////////////////////////////////////////
//その他
////////////////////////////////////////////////
gulp.task('re-sass', function (callback) {
    return runSequence(
        'sass',
        'bs-reload',
        callback
    );
});
gulp.task('re-pug', function (callback) {
    return runSequence(
        'pug',
        'check-html',
        'bs-reload',
        callback
    );
});


// リリースフォルダ内のファイル削除
gulp.task('release-clean', function () {
    console.log('--------- clean task ----------');
    return del(release.root + '**/*', '!.gitkeep');
});
gulp.task('output', function (callback) {
    return runSequence(
        'release-clean',
        'copy',
        ['pug', 'sass', 'image-min', 'uglify'],
        'sw',
        'check-html',
        'bs-reload',
        callback
    );
});

//herokuへのコンパイル
gulp.task('heroku', function(callback) {
    return runSequence(
        'copy',
        ['pug', 'sass', 'image-min', 'uglify'],
        callback
    );
});

// service worker
gulp.task('sw', () => {
  console.log('--------- update service worker ----------');
  return workboxBuild.injectManifest({
    swSrc: 'src/sw.js',
    swDest: 'dist/sw.js',
    globDirectory: 'dist',
    globPatterns: [
      '**\/*.{js,css,html,png,ttf,svg}',
    ]
  });
});


// gulpのデフォルト
gulp.task('default', ['output','browser-sync'], function () {
    gulp.watch(develop.root + '**/*.pug', ['re-pug']);
    gulp.watch(develop.assets + 'scss/**/*.scss', ['re-sass']);
    gulp.watch(develop.assets + 'images/**/*', ['image-min']);
    gulp.watch(develop.assets + 'js/**/*', ['uglify']);
    gulp.watch(develop.assets + 'sw.js', ['sw']);
    gulp.watch('./**/*.html', ['bs-reload']);
});
// gulpのデフォルト
gulp.task('sync', ['sw', 'browser-sync'], function () {
    gulp.watch(develop.root + '**/*.pug', ['re-pug']);
    gulp.watch(develop.assets + 'scss/**/*.scss', ['re-sass']);
    gulp.watch(develop.assets + 'images/**/*', ['image-min']);
    gulp.watch(develop.assets + 'js/**/*', ['uglify']);
    gulp.watch(develop.assets + 'sw.js', ['sw']);
    gulp.watch('./**/*.html', ['bs-reload']);
});
