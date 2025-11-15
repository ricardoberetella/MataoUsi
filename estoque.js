import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Checa se usuário está logado
async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) window.location.href = "index.html";
}

// Cadastrar peça
async function cadastrarPeca() {
  const nome = document.getElementById("nome").value;
  const quantidade = parseInt(document.getElementById("quantidade").value || 0);

  if (!nome || quantidade < 0) {
    alert("Informe o nome da peça e quantidade válida!");
    return;
  }

  const { data, error } = await supabase.from('pecas').insert([
    { nome, quantidade }
  ]);

  if (error) {
    alert("Erro: " + error.message);
  } else {
    alert("Peça cadastrada com sucesso!");
    document.getElementById("nome").value = '';
    document.getElementById("quantidade").value = '';
    listarPecas();
  }
}

// Listar peças
async function listarPecas() {
  const { data, error } = await supabase.from('pecas').select('*').order('nome', { ascending: true });

  if (error) {
    alert("Erro: " + error.message);
    return;
  }

  const tbody = document.querySelector("#tabelaPecas tbody");
  tbody.innerHTML = '';
  data.forEach(peca => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${peca.nome}</td>
      <td>${peca.quantidade}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Eventos
document.getElementById("btnCadastrar").onclick = cadastrarPeca;

// Inicialização
checkUser();
listarPecas();
