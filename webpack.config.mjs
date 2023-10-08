
const path = await import('path');
const { fileURLToPath } = await import('url');
const { readFileSync } = await import('fs');
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodeExternals = require('webpack-node-externals');
// import * as nodeExternals from 'webpack-node-externals';
// import * as WebpackObfuscator from 'webpack-obfuscator';

const dirname = path.dirname(fileURLToPath(import.meta.url))
/**
 * https://gist.github.com/nerdyman/2f97b24ab826623bff9202750013f99e
 * Resolve tsconfig.json paths to Webpack aliases
 * @param  {string} tsconfigPath           - Path to tsconfig
 * @param  {string} webpackConfigBasePath  - Path from tsconfig to Webpack config to create absolute aliases
 * @return {object}                        - Webpack alias config
 */
function resolveTsconfigPathsToAlias(
  tsconfigPath) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tsconfig = JSON.parse(
      readFileSync(
        new URL(tsconfigPath, import.meta.url)
      )
    );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { paths, baseUrl } = tsconfig.compilerOptions;

  return Object.fromEntries(Object.entries(paths)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .filter(([, pathValues]) => pathValues.length > 0)
    .map(([pathKey, pathValues]) => {
      const key = pathKey.replace('/*', '');
      const value = path.resolve(path.dirname(tsconfigPath),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        baseUrl, pathValues[0].replace('/*', ''));
      return [key, value];
    }));
};

const config = (_env) => {
  return {
  mode: "production",
  target: "node",
  module: {
    rules: [
      {
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.webpack.json",
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  entry: "./src/server/prodServer.ts",
  externals: [nodeExternals({
    allowlist: ["amqplib", "https-browserify"]
  })], // Ignore node_modules
  output: {
    path: path.resolve(dirname, ".server"),
    filename: "server.bundle.js",
  },
  resolve: {
    fallback: {
      "http": require.resolve("stream-http"),
      "stream": require.resolve("stream-browserify"),
      "https": require.resolve("https-browserify"),
      "url": require.resolve("url")
    },
    extensions: [".js", ".ts"],
    alias: resolveTsconfigPathsToAlias( "./tsconfig.webpack.json")
  },
  // plugins: [
  //   // Obfuscate the code
  //   new WebpackObfuscator({
  //     rotateStringArray: true,
  //   }),
  // ],
}};

export default config;