module.exports = {
  apps: [
    {
      name: "scrapyard-steal",
      script: "dist-server/index.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
