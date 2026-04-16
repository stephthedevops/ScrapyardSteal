module.exports = {
  apps: [
    {
      name: "scrapyard-steal",
      script: "build/index.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
