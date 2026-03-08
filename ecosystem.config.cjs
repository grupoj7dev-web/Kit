module.exports = {
  apps: [
    {
      name: 'kit-web',
      cwd: 'C:/Users/danil/OneDrive/Área de Trabalho/Jheferson/kit/root/novokit09',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -p 3333',
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
