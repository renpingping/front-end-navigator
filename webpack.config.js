//font字体问题http://stackoverflow.com/questions/34133808/webpack-ots-parsing-error-loading-fonts
//https://github.com/babel/babel-loader/issues/392  parseQuery() will be replaced with getOptions() in the next major version of loader-utils
//http://xwartz.xyz/blog/2016/06/electron-with-hmr/   hot-update.json无法更新模块，其实就是路径问题
const fs = require("fs")
const os = require("os")
const path = require('path')
const open = require("child_process");
const webpack = require('webpack')
const glob = require('glob')  //允许使用*等符号匹配对应规则的文件.
const HappyPack = require('happypack')
const happyThreadPool = HappyPack.ThreadPool({ size: os.cpus().length })
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin')
//https://github.com/nuysoft/Mock/wiki/Getting-Started
const Mock = require('mockjs')

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const staticToBuild = require('./lib/staticToBuild')
const ImageminPlugin = require('imagemin-webpack-plugin').default
const UglifyJsParallelPlugin = require('webpack-uglify-parallel')
const CompressionPlugin = require("compression-webpack-plugin")

console.log(__dirname)

process.traceDeprecation = true

function getLocalIP() {
  try{
    var ifaces = os.networkInterfaces();
    var reg = /^(10\.)|(172\.)|(192\.).+$/gi;
    for (var dev in ifaces) {
      var ip = ifaces[dev][1].address;
      if(reg.test(ip)) {
         return ip;
      }
    }    
  }catch(err){
    return "localhost"
  }  
}


process.traceDeprecation = true 
//配置启动项目
const APP_NAME = "doc"

//项目静态资源路径
const APP_PATH = path.join(__dirname, 'app', APP_NAME)
const APP_IMAGES = path.join(__dirname, 'app', APP_NAME, 'images')
const APP_FONTS = path.join(__dirname, 'app', APP_NAME, 'fonts')
const APP_SASS = path.join(__dirname, 'app', APP_NAME, 'sass')
const APP_COMPONENT = path.join(__dirname, 'app', APP_NAME, 'components')
const APP_MOCK = path.join(__dirname, 'app', APP_NAME, 'mock')

function getEntries(globPath) {
  let files = [];
  if (Object.prototype.toString.call(globPath) === '[object Array]') {
    globPath.forEach( (o, i) => {
      files = files.concat(glob.sync(o))
    })
  } else {
    files = glob.sync(globPath);
  }
  let _entries = {},
    entry, dirname, basename;
  for (let i = 0; i < files.length; i++) {
    entry = files[i];
    dirname = path.dirname(entry)
    basename = path.basename(entry, '.js');

    // _entries[entry.replace(__dirname+'/', '').replace(/\.js/, '')] = entry
    // 不推荐用路径做entry名字，会导致生成模版、图片、字体、样式路径不好确定
    _entries[basename] = entry
  }
  return _entries;
}

const entries = getEntries([APP_PATH+'/*.js'])

module.exports = {
  entry: entries,
  "cache": true,
  "context": __dirname,

  output: {
    path: path.resolve(__dirname, 'dist/'),
    publicPath: 'http://' + getLocalIP() + ':9999/',
    // publicPath: 'http://localhost:9999/',
    // publicPath: '/',
    filename: '[name].js',     //name，对应entry名称
    chunkFilename: "[name].[chunkhash:8].js"
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",  //module.preLoaders的替代方案
        loader: "happypack/loader?id=eslint", //https://github.com/MoOx/eslint-loader
        include: [
          APP_PATH
        ]            
      },    
      {
          "test": /\.vue$/,   // ExtractTextPlugin https://github.com/vuejs/vue-loader/issues/622
          "loader": "vue-loader",
          "options": {
              "loaders": {
                      // "scss": ExtractTextPlugin.extract({
                      //   "use": "css-loader!sass-loader",
                      //   "fallback": "vue-style-loader"
                      // }),
                      // "sass": ExtractTextPlugin.extract({
                      //   "use": "css-loader!sass-loader?indentedSyntax",
                      //   "fallback": "vue-style-loader"
                      // })                

                  "css": [
                      "vue-style-loader",
                      {
                          "loader": "css-loader",
                          "options": {
                              "minimize": false,
                              "sourceMap": false
                          }
                      }
                  ],
                  "postcss": [
                      "vue-style-loader",
                      {
                          "loader": "css-loader",
                          "options": {
                              "minimize": false,
                              "sourceMap": false
                          }
                      }
                  ],
                  "less": [
                      "vue-style-loader",
                      {
                          "loader": "css-loader",
                          "options": {
                              "minimize": false,
                              "sourceMap": false
                          }
                      },
                      {
                          "loader": "less-loader",
                          "options": {
                              "sourceMap": false
                          }
                      }
                  ],
                  "sass": [
                      "vue-style-loader",
                      {
                          "loader": "css-loader",
                          "options": {
                              "minimize": false,
                              "sourceMap": false
                          }
                      },
                      {
                          "loader": "sass-loader",
                          "options": {
                              "indentedSyntax": true,
                              "sourceMap": false
                          }
                      }
                  ],
                  "scss": [
                      "vue-style-loader",
                      {
                          "loader": "css-loader",
                          "options": {
                              "minimize": false,
                              "sourceMap": false
                          }
                      },
                      {
                          "loader": "sass-loader",
                          "options": {
                              "sourceMap": false
                          }
                      }
                  ]
              }
          },
          // include: [
          //   APP_COMPONENT
          // ],
          exclude: /node_modules/          
      },  
      {
        test: /\.js$/,
        exclude: /node_modules/,  //排除node_modules文件夹
        use: {
          loader: 'happypack/loader?id=js'
          // options: {
          //   presets: ['es2015','stage-2']
          // }
        },  
        include: [
          APP_PATH
        ]        
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },                   
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'file-loader',
        options: {
          limit: 10000,
          name: './images/[name].[hash:8].[ext]'   //devServer预览都是相对dist输出目录
        },
        include: [
          APP_IMAGES
        ]
      },    
      {
        test: /\.(woff2?|eot|ttf|otf|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 8192,
          name: './fonts/[name].[hash].[ext]'
          // name: '/fonts/[name].[hash].[ext]'
          // name: './fonts/[name].[ext]'
        },
        include: [
          APP_FONTS
        ]
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        options: {
          name: '[name].[ext]?[hash]'
        },
        include: [
          APP_PATH
        ]
      }   

    ]
   },

   //页面已经cdn加载，则不需要打包到chunk
   externals: {
     "av": "AV"
   },

   resolve: {
    alias: {
      'vue': 'vue/dist/vue.common.js',
      '@font': "",
      '@img': "../images"
    },
    modules: [path.resolve(__dirname, "node_modules")]
   },

  performance: {
    "maxAssetSize": 250000,
    "maxEntrypointSize": 250000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false
  },

   plugins: [
      // 开启全局的模块热替换(HMR)
      new webpack.HotModuleReplacementPlugin(),
      
      // 当模块热替换(HMR)时在浏览器控制台输出对用户更友好的模块名字信息
      new webpack.NamedModulesPlugin(),

      new webpack.optimize.ModuleConcatenationPlugin(), //Scope Hoisting 作用域提升 减少模块闭包函数数量从而加快JS的执行速度

      new ImageminPlugin({
        disable: process.env.NODE_ENV !== 'production', // Disable during development
        pngquant: {
          quality: '95-100'
        }
      }),      

      //https://github.com/webpack/webpack/tree/master/examples/multiple-commons-chunks#webpackconfigjs
      new webpack.optimize.CommonsChunkPlugin({
          name: 'vendors', // 将公共模块提取，生成名为`vendors`的chunk
          chunks: Object.keys(entries),
          // minChunks: Infinity
          minChunks: Object.keys(entries).length // 提取所有entry共同依赖的模块
      }),

      new HappyPack({
        id: 'js',
        loaders: [ 'babel-loader?cacheDirectory=true&presets[]=es2015&presets[]=stage-2' ],
        threadPool: happyThreadPool,
        cache: true,
        verbose: true        
      }),

      new HappyPack({
        id: 'eslint',
        loaders: [ 'eslint-loader' ],
        threadPool: happyThreadPool,
        cache: true,
        verbose: true        
      }),

      new webpack.DllReferencePlugin({
        context: __dirname,
        manifest: require(path.join(APP_PATH, 'manifest.json'))
      }),

      new SWPrecacheWebpackPlugin(
        {
          cacheId: 'APP_NAME',
          dontCacheBustUrlsMatching: /\.\w{8}\./,
          filename: 'service-worker.js',
          minify: true,
          staticFileGlobsIgnorePatterns: [
            /\.html$/,
            /\.map$/
          ]
        }
      ),

      new BundleAnalyzerPlugin({
        // Can be `server`, `static` or `disabled`.
        // In `server` mode analyzer will start HTTP server to show bundle report.
        // In `static` mode single HTML file with bundle report will be generated.
        // In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
        analyzerMode: 'server',
        // Host that will be used in `server` mode to start HTTP server.
        analyzerHost: '127.0.0.1',
        // Port that will be used in `server` mode to start HTTP server.
        analyzerPort: 8888,
        // Path to bundle report file that will be generated in `static` mode.
        // Relative to bundles output directory.
        reportFilename: 'report.html',
        // Module sizes to show in report by default.
        // Should be one of `stat`, `parsed` or `gzip`.
        // See "Definitions" section for more information.
        defaultSizes: 'parsed',
        // Automatically open report in default browser
        openAnalyzer: true,
        // If `true`, Webpack Stats JSON file will be generated in bundles output directory
        generateStatsFile: false,
        // Name of Webpack Stats JSON file that will be generated if `generateStatsFile` is `true`.
        // Relative to bundles output directory.
        statsFilename: 'stats.json',
        // Options for `stats.toJson()` method.
        // For example you can exclude sources of your modules from stats file with `source: false` option.
        // See more options here: https://github.com/webpack/webpack/blob/webpack-1/lib/Stats.js#L21
        statsOptions: null,
        // Log level. Can be 'info', 'warn', 'error' or 'silent'.
        logLevel: 'info'
      })                    

      // new webpack.optimize.CommonsChunkPlugin({
      //     name: 'manifest' //But since there are no more common modules between them we end up with just the runtime code included in the manifest file
      // })
   
      
      // //静态资源分割存储
      // new staticToBuild({
      //   dir: '/app/doc',
      //   regex: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf|css)(\?.*)?$/i
      // })
   ],
   devServer: {
    contentBase: path.resolve(__dirname, 'dist/'),  //访问localhost:xxx 浏览器能看到的目录
    host: getLocalIP(),
    port: 9999,
    noInfo: false,
    quiet: false,
    //inline: true, //内联模式(inline mode)有两种方式：命令行方式和Node.js API
    historyApiFallback: true, //当使用 HTML5 History API 时，任意的 404 响应都可能需要被替代为 index.html
    open: true,
    hot: true,  //Hot Module Replacement, 启用 webpack 的模块热替换特性，结合插件 new webpack.HotModuleReplacementPlugin()
    compress: true,
    // stats: "errors-only",
    // hotOnly: true,
    setup: function (app){
 
      app.get(['*.shtml', '*.html'], (req, res, next) => {
        console.log('req.path', req.path)
        let targetPath = path.join(APP_PATH, req.path);

        if (!fs.existsSync(targetPath)) {
          return next();
        }

        // //targetJSPath 是预览相对于/dist/输出路径
        // let targetJSPath = targetPath.replace(__dirname, '').replace(path.extname(targetPath), '.js')
        let targetJSPath = req.path.replace(/\.(shtml|html)/, '.js')

        res.set('Content-Type', 'text/html')
        let content = fs.readFileSync(targetPath, 'utf8')+'<script src="./vendors.js"></script><script src=".' + targetJSPath + '"></script>'
        res.send(content);

      })  

      let data = Mock.mock({
          // 属性 list 的值是一个数组，其中含有 1 到 10 个元素
          'list|10': [{
            'cateTitle': '@name',
            'data|5': [{
              'title': '@title(5)',
              'detail': '@cparagraph(8)',
              'link': '@url',
              'image': '@image'
            }]         
          }]

      })

      app.get('/api/index', (req, res, next) => {
        // res.send(data);
        let data = fs.readFileSync(path.join(APP_MOCK, 'data.json'), 'utf8')
        res.send( {'list': JSON.parse(data)} );
      })

    }
   }   
};


if (process.env.NODE_ENV === 'production') {
  delete  module.exports.output.publicPath   //publicPath会影响打包路径

  // module.exports.module.rules =  (module.exports.module.rules || []).concat([
  //     //ExtractTextPlugin 与预览输出css不能同时存在
  //     {
  //       test: /\.(css|scss)$/,
  //       //https://github.com/webpack-contrib/extract-text-webpack-plugin
  //       use: ExtractTextPlugin.extract({
  //            fallback: 'style-loader',
  //            use: ['css-loader', "postcss-loader", "sass-loader"]
  //       })        
  //       ,
  //       include: [
  //         APP_SASS
  //       ]        
  //     }
  // ])
  module.exports.output.filename = '[name].[hash:8].js'
  module.exports.module.rules =  (module.exports.module.rules || []).concat([
      {
        test: /\.(css|scss)$/,
        use: [    
          {
            loader: 'style-loader',
            options: {
              name: './css/[name].[ext]?[hash]'   //devServer预览都是相对dist输出目录
            }              
          },
          "css-loader?minimize",
          "postcss-loader",
          "sass-loader"
        ],
        include: [
          APP_SASS
        ]        
      }
  ])

  module.exports.devtool = '#source-map'
  // http://vue-loader.vuejs.org/en/workflow/production.html
  module.exports.plugins = (module.exports.plugins || []).concat([
    // new webpack.DefinePlugin({
    //   'process.env': {
    //     NODE_ENV: '"production"'
    //   }
    // }),
    // 
    // [name]将会和entry中的chunk的名字一致
    // new ExtractTextPlugin( './css/[name].[contenthash].css'),
    // new ExtractTextPlugin( './css/[name].css'),

    // new webpack.optimize.UglifyJsPlugin({
    //   compress: false,
    //   beautify: true,
    //   sourceMap: false,
    //   compress: {
    //     warnings: false
    //   }
    // })   
    
    //多线程压缩 
    new UglifyJsParallelPlugin({
      workers: os.cpus().length,
      mangle: true,
      comments: false,
      compressor: {
        warnings: false,
        drop_console: true,
        drop_debugger: true
       }
    }),

    // new CompressionPlugin({
    //   asset: "[path].gz[query]",
    //   algorithm: "gzip",
    //   test: /\.(js|html)$/,
    //   threshold: 10240,
    //   minRatio: 0.8
    // })

  ])
}else{

  module.exports.module.rules =  (module.exports.module.rules || []).concat([
      {
        test: /\.(css|scss)$/,
        use: [    
          {
            loader: 'style-loader',
            options: {
              name: './css/[name].[ext]?[hash]'   //devServer预览都是相对dist输出目录
            }              
          },
          "css-loader?minimize",
          "postcss-loader",
          "sass-loader"
        ],
        include: [
          APP_SASS
        ]        
      }
  ])

}


Object.keys(entries).map( (name) => {
  var plugin = new HtmlWebpackPlugin({
        filename: name + '.html',
        template: path.join(APP_PATH, name+'.html'),
        inject: true,
        chunks: ["vendors", name],
        showErrors: true,
        cache: true,
        minify: {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true
          // more options:
          // https://github.com/kangax/html-minifier#options-quick-reference
        }
      })   

  module.exports.plugins.push(plugin);
} )

//静态资源是相对于output路径， js路径是相对入口路径
