import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listarPedidos() {
    const { data, error } = await supabase.from('pedidos').select('*').order('data');
    if (error) { console.error("Erro ao listar pedidos:", error); return; }

    const tbody = document.querySelector('#tabelaPedidos tbody');
    tbody.innerHTML = '';
    data.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.cliente}</td><td>${p.produto}</td><td>${p.quantidade}</td><td>${p.data}</td>`;
        tbody.appendChild(tr);
    });
}

async function cadastrarPedido() {
    const cliente = document.getElementById('cliente').value.trim();
    const produto = document.getElementById('produto').value.trim();
    const quantidade = parseFloat(document.getElementById('quantidade').value);
    const data = document.getElementById('data').value;

    if (!cliente || !produto || !quantidade || !data) {
        alert("Preencha todos os campos!");
        return;
    }

    const { data: res, error } = await supabase.from('pedidos').insert([{ cliente, produto, quantidade, data }]);
    if (error) alert("Erro ao cadastrar pedido: " + error.message);
    else {
        alert("Pedido cadastrado!");
        document.getElementById('cliente').value = '';
        document.getElementById('produto').value = '';
        document.getElementById('quantidade').value = '';
        document.getElementById('data').value = '';
        listarPedidos();
    }
}

document.getElementById('btnCadastrar').addEventListener('click', cadastrarPedido);
window.addEventListener('load', listarPedidos);
