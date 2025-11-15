import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Checa usuário logado
async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) window.location.href = "index.html";
}

// Cadastrar conta a pagar
async function cadastrarConta() {
  const fornecedor = document.getElementById('fornecedor').value;
  const descricao = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value || 0);
  const vencimento = document.getElementById('vencimento').value;

  if (!fornecedor || !descricao || valor <= 0 || !vencimento) {
    return alert("Preencha todos os campos corretamente!");
  }

  const { error } = await supabase.from('contas_pagar').insert([
    { fornecedor, descricao, valor, vencimento, status: 'pendente' }
  ]);

  if (error) return alert("Erro: " + error.message);

  alert("Conta a pagar cadastrada!");
  listarContas();
  document.getElementById('fornecedor').value = '';
  document.getElementById('descricao').value = '';
  document.getElementById('valor').value = '';
  document.getElementById('vencimento').value = '';
}

// Listar contas
async function listarContas() {
  const { data, error } = await supabase.from('contas_pagar').select('*').order('vencimento', { ascending: true });
  if (error) return alert("Erro ao listar contas: " + error.message);

  const tbody = document.querySelector("#tabelaPagar tbody");
  tbody.innerHTML = '';
  data.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.fornecedor}</td>
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
listarContas();
