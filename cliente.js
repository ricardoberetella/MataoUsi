import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para cadastrar cliente
async function cadastrarCliente() {
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const telefone = document.getElementById('telefone').value;

    if (!nome || !email || !telefone) {
        alert("Preencha todos os campos!");
        return;
    }

    const { data, error } = await supabase.from('clientes').insert([
        { nome, email, telefone }
    ]);

    if (error) {
        console.error(error);
        alert("Erro ao cadastrar cliente: " + error.message);
    } else {
        alert("Cliente cadastrado com sucesso!");
        document.getElementById('nome').value = '';
        document.getElementById('email').value = '';
        document.getElementById('telefone').value = '';
        listarClientes(); // Atualiza a tabela
    }
}

// Função para listar clientes na tabela
async function listarClientes() {
    const { data, error } = await supabase.from('clientes').select('*');

    if (error) {
        console.error(error);
        return;
    }

    const tbody = document.querySelector('#tabelaClientes tbody');
    tbody.innerHTML = '';

    data.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cliente.nome}</td>
            <td>${cliente.email}</td>
            <td>${cliente.telefone}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Evento do botão cadastrar
document.getElementById('btnCadastrar').addEventListener('click', cadastrarCliente);

// Lista clientes ao carregar a página
window.addEventListener('load', listarClientes);
