module.exports = {
    apps: [
        {
            name: "pm2-app",
            script: "./node_modules/vite/bin/vite.js",
            args: "preview --host",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
