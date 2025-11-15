import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para listar contas
async function listarContas() {
    const { data, error } = await supabase.from('contas').select('*').order('vencimento', { ascending: true });
    if (error) { console.error("Erro ao listar contas:", error); return; }

    const tbody = document.querySelector('#tabelaContas tbody');
    tbody.innerHTML = '';

    data.forEach(conta => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${conta.tipo}</td>
            <td>${conta.descricao}</td>
            <td>${conta.valor}</td>
            <td>${conta.vencimento}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para cadastrar conta
async function cadastrarConta() {
    const tipo = document.getElementById('tipo').value;
    const descricao = document.getElementById('descricao').value.trim();
    const valor = parseFloat(document.getElementById('valor').value);
    const vencimento = document.getElementById('vencimento').value;

    if (!descricao || !valor || !vencimento) {
        alert("Preencha todos os campos!");
        return;
    }

    const { data, error } = await supabase.from('contas').insert([{ tipo, descricao, valor, vencimento }]);
    if (error) {
        alert("Erro ao cadastrar conta: " + error.message);
    } else {
        alert("Conta cadastrada com sucesso!");
        document.getElementById('descricao').value = '';
        document.getElementById('valor').value = '';
        document.getElementById('vencimento').value = '';
        listarContas();
    }
}

document.getElementById('btnCadastrar').addEventListener('click', cadastrarConta);
window.addEventListener('load', listarContas);
