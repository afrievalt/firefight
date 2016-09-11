module.exports = {
    //context: './src',
    entry: ['./src/jQuery-extend.js','./src/ko-binding-handlers.js','./src/polyfill.js','./src/core.js'],
    output: {        
        path: './public/js',
        publicPath: './public/js',
        filename: 'firefight-bundle.js'        
    },
    watch: true,
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            query: {
                presets: ['es2015']
            }
        }]
    }
};