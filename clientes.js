import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://nfdinjmjofvqmjnfquiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGluam1qb2Z2cW1qbmZxdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODI1NjEsImV4cCI6MjA3ODc1ODU2MX0.K6dojizNG0oFZaGU9DHZkcbqC8yH--wFDEoaOJGbVYE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listarClientes() {
    const { data } = await supabase.from('clientes').select('*');
    const tbody = document.querySelector('#tabelaClientes tbody');
    tbody.innerHTML = '';
    data.forEach(c => tbody.innerHTML += `<tr><td>${c.nome}</td><td>${c.email}</td><td>${c.telefone}</td></tr>`);
}

async function cadastrarCliente() {
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();

    if (!nome || !email || !telefone) { alert("Preencha todos os campos!"); return; }

    const { error } = await supabase.from('clientes').insert([{ nome, email, telefone }]);
    if (error) alert("Erro ao cadastrar cliente: " + error.message);
    else {
        alert("Cliente cadastrado!");
        document.getElementById('nome').value = '';
        document.getElementById('email').value = '';
        document.getElementById('telefone').value = '';
        listarClientes();
    }
}

document.getElementById('btnCadastrar').addEventListener('click', cadastrarCliente);
window.addEventListener('load', listarClientes);
