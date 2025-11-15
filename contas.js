import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://nfdinjmjofvqmjnfquiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGluam1qb2Z2cW1qbmZxdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODI1NjEsImV4cCI6MjA3ODc1ODU2MX0.K6dojizNG0oFZaGU9DHZkcbqC8yH--wFDEoaOJGbVYE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listarContas() {
    const { data, error } = await supabase.from('contas').select('*').order('vencimento');
    if (error) { console.error(error); return; }

    const tbody = document.querySelector('#tabelaContas tbody');
    tbody.innerHTML = '';
    data.forEach(c => {
        tbody.innerHTML += `<tr>
        <td>${c.tipo}</td><td>${c.descricao}</td><td>${c.valor}</td><td>${c.vencimento}</td>
        </tr>`;
    });
}

async function cadastrarConta() {
    const tipo = document.getElementById('tipo').value;
    const descricao = document.getElementById('descricao').value.trim();
    const valor = parseFloat(document.getElementById('valor').value);
    const vencimento = document.getElementById('vencimento').value;

    if (!descricao || !valor || !vencimento) { alert("Preencha todos os campos!"); return; }

    const { error } = await supabase.from('contas').insert([{ tipo, descricao, valor, vencimento }]);
    if (error) alert("Erro ao cadastrar conta: " + error.message);
    else {
        alert("Conta cadastrada!");
        document.getElementById('descricao').value = '';
        document.getElementById('valor').value = '';
        document.getElementById('vencimento').value = '';
        listarContas();
    }
}

document.getElementById('btnCadastrar').addEventListener('click', cadastrarConta);
window.addEventListener('load', listarContas);
