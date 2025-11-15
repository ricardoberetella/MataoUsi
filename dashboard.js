<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Mini ERP</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f1f5f9; color: #0f172a; }
    header { background: #3b82f6; color: #fff; padding: 15px; text-align: center; font-size: 24px; }
    nav { width: 200px; background: #e2e8f0; height: 100vh; float: left; padding-top: 20px; }
    nav a { display: block; padding: 10px 15px; color: #0f172a; text-decoration: none; margin-bottom: 5px; border-radius: 5px; }
    nav a:hover { background: #3b82f6; color: #fff; }
    main { margin-left: 200px; padding: 20px; }
    h1 { margin-top: 0; }
  </style>
</head>
<body>

  <header>Mini ERP - Dashboard</header>

  <nav>
    <a href="dashboard.html">Dashboard</a>
    <a href="clientes.html">Clientes</a>
    <a href="login.html">Logout</a>
  </nav>

  <main>
    <h1>Bem-vindo ao Mini ERP</h1>
    <p>Use o menu à esquerda para acessar os módulos do sistema.</p>

    <div id="estatisticas">
      <h3>Estatísticas rápidas</h3>
      <ul>
        <li>Clientes cadastrados: <span id="totalClientes">0</span></li>
        <!-- Você pode adicionar mais estatísticas depois -->
      </ul>
    </div>
  </main>

  <script type="module">
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
    import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    async function carregarEstatisticas() {
      const { data, error } = await supabase.from('clientes').select('id');
      if (!error) {
        document.getElementById('totalClientes').textContent = data.length;
      }
    }

    window.addEventListener('load', carregarEstatisticas);
  </script>

</body>
</html>
