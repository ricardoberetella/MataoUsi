
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

// Cadastrar conta a receber
async function cadastrarConta() {
  const cliente_id = document.getElementById('cliente').value;
  const descricao = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value || 0);
  const vencimento = document.getElementById('vencimento').value;

  if (!cliente_id || !descricao || valor <= 0 || !vencimento) {
    return alert("Preencha todos os campos corretamente!");
  }

  const { error } = await supabase.from('contas_receber').insert([
    { cliente_id, descricao, valor, vencimento, status: 'pendente' }
  ]);

  if (error) return alert("Erro: " + error.message);

  alert("Conta a receber cadastrada!");
  listarContas();
  document.getElementById('descricao').value = '';
  document.getElementById('valor').value = '';
  document.getElementById('vencimento').value = '';
}

// Listar contas
async function listarContas() {
  const { data, error } = await supabase.from('contas_receber')
    .select('id, descricao, valor, vencimento, status, clientes(nome)')
    .order('vencimento', { ascending: true });
  if (error) return alert("Erro ao listar contas: " + error.message);

  const tbody = document.querySelector("#tabelaReceber tbody");
  tbody.innerHTML = '';
  data.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.clientes.nome}</td>
      <td>${c.descricao}</td>
      <td>R$ ${c.valor.toFixed(2)}</td>
      <td>${c.vencimento}</td>
      <td>${c.status}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Eventos
document.getElementById('btnCadastrar').onclick = cadastrarConta;

// Inicialização
checkUser();
carregarClientes();
listarContas();
