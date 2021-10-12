const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "main.bundle.js",
    path: path.join(__dirname, "dist"),
    // publicPath: "/dist/",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: ["/node_modules/"],
      },
      { test: /\.ts$/, exclude: /node_modules/, loader: "ts-loader" },
      {
        test: /\.txt$/i,
        use: "raw-loader",
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 8080,
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
};
