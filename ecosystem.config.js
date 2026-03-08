module.exports = {
  apps: [
    {
      name: 'kit-web',
      cwd: 'C:/Users/danil/OneDrive/Área de Trabalho/Jheferson/kit/root/novokit09',
      script: 'npm.cmd',
      args: 'run dev -- -p 3333',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_restarts: 10
    },
    {
      name: 'kit-tunnel',
      script: 'cloudflared',
      args: 'tunnel --config C:/Users/danil/.cloudflared/config-kit-iasolar.yml run kit-iasolar',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_restarts: 10
    }
  ]
};
