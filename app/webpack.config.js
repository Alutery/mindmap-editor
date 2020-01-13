const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: './src/js/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    "css-loader"
                ]
            },
            {
                test: /favicon\.ico$/,
                use: {
                    loader: 'url-loader',
                    query: {
                        limit: 1,
                        name: '[name].[ext]',
                    },
                },
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: `components/[name].css`
        })
    ]
};
