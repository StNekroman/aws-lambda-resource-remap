/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  rootDir: "./test",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
};
