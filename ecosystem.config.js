module.exports = {
  apps: [
    {
      name: "scrapyard-steal",
      script: "build/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      // Let @colyseus/tools handle the port binding
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
