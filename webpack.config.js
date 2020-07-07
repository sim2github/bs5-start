const webpack = require('webpack')
const path = require('path')
const glob = require('glob')
const csso = require('postcss-csso')
const autoprefixer = require('autoprefixer')
const smqueries = require('postcss-sort-media-queries')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ImageminWebpWebpackPlugin = require('imagemin-webp-webpack-plugin')
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin')
const TerserPlugin = require('terser-webpack-plugin')

const CONF = {
  mobileFirst: true,
  entry: {
    main: 'main.js'
  },
  src: 'src',
  dist: 'dist',
  clean: 'dist',
  pages: 'src/pages/*.liquid',
  partials: 'src/pages/partials/',
  data: 'src/pages/data.json',
  copy: [
    // {
    //   from: 'images',
    //   to: 'images',
    //   type: 'dir'
    // },
    // {
    //   from: 'fonts',
    //   to: 'fonts',
    //   type: 'dir'
    // },
    {
      from: '.nojekyll',
      to: '',
      type: 'file'
    }
    // {
    //   from: 'favicon.ico',
    //   to: 'favicon.ico',
    //   type: 'file'
    // }
  ]
}

module.exports = (__ = {}, argv) => {
  const isDEV =
    process.env.NODE_ENV === 'development' || argv.mode === 'development'

  const config = {
    mode: isDEV ? 'development' : 'production',
    devtool: isDEV ? 'inline-cheap-source-map' : 'none',
    context: path.join(__dirname, CONF.src),
    entry: CONF.entry,
    output: {
      path: path.join(__dirname, CONF.dist),
      filename: isDEV ? '[name].js' : '[name].[chunkhash].js'
    },
    watch: isDEV,
    devServer: {
      host: '0.0.0.0',
      port: 9090,
      overlay: true
    },
    resolve: {
      extensions: ['.js', '.json'],
      modules: [
        path.join(__dirname, 'node_modules'),
        path.join(__dirname, CONF.src)
      ]
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          shared: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            enforce: true,
            chunks: 'all'
          }
        }
      },
      minimize: !isDEV,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            ecma: 6
          }
        })
      ]
    },
    plugins: (() => {
      const common = [
        new webpack.NamedModulesPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        new CopyWebpackPlugin(CONF.copy),
        new ImageminWebpWebpackPlugin(),
        new SpriteLoaderPlugin()
      ]

      for (const file of glob.sync(path.join(__dirname, CONF.pages))) {
        common.push(
          new HtmlWebpackPlugin({
            template: file,
            filename: path.join(
              __dirname,
              CONF.dist,
              `${path.parse(file).name}.html`
            ),
            inject: 'head',
            minify: !isDEV
          })
        )
      }

      const production = [
        new MiniCssExtractPlugin({
          path: CONF.dist,
          filename: isDEV ? '[name].css' : '[name].[contenthash].css',
          chunkFilename: isDEV
            ? '[name].[id].css'
            : '[name].[id].[contenthash].css'
        }),
        new CleanWebpackPlugin(CONF.clean)
      ]

      const development = []

      return isDEV ? common.concat(development) : common.concat(production)
    })(),

    module: {
      rules: [
        {
          test: /\.liquid$/,
          use: [
            {
              loader: 'html-loader',
              options: {
                minimize: !isDEV
              }
            },
            {
              loader: path.resolve('./liquid-loader'),
              options: {
                root: path.join(__dirname, CONF.partials),
                data: require(path.join(__dirname, CONF.data)),
                dev: isDEV
              }
            }
          ]
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          query: {
            cacheDirectory: true
          }
        },
        {
          test: /\.s?css$/,
          use: [
            isDEV ? 'style-loader?sourceMap=true' : MiniCssExtractPlugin.loader,
            `css-loader?sourceMap=${isDEV}`,
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: isDEV,
                plugins() {
                  return [
                    csso,
                    autoprefixer,
                    smqueries({
                      sort: CONF.mobileFirst ? 'mobile-first' : 'desktop-first'
                    })
                  ]
                }
              }
            },
            `sass-loader?sourceMap=${isDEV}`
          ]
        },
        {
          test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?(\?[\s\S]+)?$/,
          use:
            'file-loader?name=[name].[ext]&outputPath=fonts/&publicPath=/fonts/'
        },
        {
          test: /\.(jpe?g|png|gif)$/i,
          use: [
            'file-loader?name=images/[name].[ext]',
            {
              loader: 'image-webpack-loader',
              options: {
                bypassOnDebug: true,
                mozjpeg: {
                  progressive: true,
                  quality: 65
                },
                optipng: {
                  enabled: true
                },
                pngquant: {
                  quality: '65-90',
                  speed: 4
                },
                gifsicle: {
                  interlaced: false
                }
              }
            }
          ]
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: 'svg-sprite-loader',
              options: {
                extract: true,
                spriteFilename: 'sprite.svg'
              }
            },
            'svgo-loader'
          ]
        }
      ]
    }
  }

  return config
}
