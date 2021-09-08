const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "main.bundle.js",
    path: path.join(__dirname, "dist"),
    publicPath: "/dist/",
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 8080,
  },
};
