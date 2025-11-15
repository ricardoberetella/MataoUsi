import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Checa usuário logado
async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) window.location.href = "index.html";
}

// Carregar clientes no select
async function carregarClientes() {
  const { data, error } = await supabase.from('clientes').select('*').order('nome', { ascending: true });
  if (error) return alert("Erro ao carregar clientes: " + error.message);

  const select = document.getElementById('cliente');
  select.innerHTML = '';
  data.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.nome;
    select.appendChild(option);
  });
}

// Carregar peças no select
async function carregarPecas() {
  const { data, error } = await supabase.from('pecas').select('*').order('nome', { ascending: true });
  if (error) return alert("Erro ao carregar peças: " + error.message);

  const select = document.getElementById('peca');
  select.innerHTML = '';
  data.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.nome} (estoque: ${p.quantidade})`;
    select.appendChild(option);
  });
}

// Registrar pedido
async function registrarPedido() {
  const clienteId = document.getElementById('cliente').value;
  const pecaId = document.getElementById('peca').value;
  const quantidade = parseInt(document.getElementById('quantidade').value || 0);

  if (!clienteId || !pecaId || quantidade <= 0) {
    return alert("Informe cliente, peça e quantidade válida!");
  }

  // Pegar estoque atual
  const { data: pecaData, error: pecaError } = await supabase.from('pecas').select('*').eq('id', pecaId).single();
  if (pecaError) return alert("Erro: " + pecaError.message);

  if (pecaData.quantidade < quantidade) {
    return alert(`Estoque insuficiente! Estoque atual: ${pecaData.quantidade}`);
  }

  // Inserir pedido
  const { error: pedidoError } = await supabase.from('pedidos').insert([
    { cliente_id: clienteId, peca_id: pecaId, quantidade }
  ]);
  if (pedidoError) return alert("Erro ao registrar pedido: " + pedidoError.message);

  // Atualizar estoque
  const { error: estoqueError } = await supabase.from('pecas').update({ quantidade: pecaData.quantidade - quantidade }).eq('id', pecaId);
  if (estoqueError) return alert("Erro ao atualizar estoque: " + estoqueError.message);

  alert("Pedido registrado com sucesso!");
  document.getElementById('quantidade').value = 1;
  carregarPecas();
  listarPedidos();
}

// Listar pedidos
async function listarPedidos() {
  const { data, error } = await supabase.from('pedidos')
    .select('id, quantidade, criado_em, clientes(nome), pecas(nome)')
    .order('criado_em', { ascending: false });
  if (error) return alert("Erro ao listar pedidos: " + error.message);

  const tbody = document.querySelector("#tabelaPedidos tbody");
  tbody.innerHTML = '';
  data.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.clientes.nome}</td>
      <td>${p.pecas.nome}</td>
      <td>${p.quantidade}</td>
      <td>${new Date(p.criado_em).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Eventos
document.getElementById('btnCadastrar').onclick = registrarPedido;

// Inicialização
checkUser();
carregarClientes();
carregarPecas();
listarPedidos();
