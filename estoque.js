import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listarProdutos() {
    const { data, error } = await supabase.from('estoque').select('*').order('nome');
    if (error) { console.error("Erro ao listar estoque:", error); return; }

    const tbody = document.querySelector('#tabelaEstoque tbody');
    tbody.innerHTML = '';
    data.forEach(prod => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${prod.nome}</td><td>${prod.descricao}</td><td>${prod.quantidade}</td><td>${prod.unidade}</td>`;
        tbody.appendChild(tr);
    });
}

async function cadastrarProduto() {
    const nome = document.getElementById('nome').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const quantidade = parseFloat(document.getElementById('quantidade').value);
    const unidade = document.getElementById('unidade').value.trim();

    if (!nome || !descricao || !quantidade || !unidade) {
        alert("Preencha todos os campos!");
        return;
    }

    const { data, error } = await supabase.from('estoque').insert([{ nome, descricao, quantidade, unidade }]);
    if (error) alert("Erro ao adicionar produto: " + error.message);
    else {
        alert("Produto adicionado!");
        document.getElementById('nome').value = '';
        document.getElementById('descricao').value = '';
        document.getElementById('quantidade').value = '';
        document.getElementById('unidade').value = '';
        listarProdutos();
    }
}

document.getElementById('btnCadastrar').addEventListener('click', cadastrarProduto);
window.addEventListener('load', listarProdutos);
