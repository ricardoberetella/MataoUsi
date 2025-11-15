import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://nfdinjmjofvqmjnfquiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGluam1qb2Z2cW1qbmZxdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODI1NjEsImV4cCI6MjA3ODc1ODU2MX0.K6dojizNG0oFZaGU9DHZkcbqC8yH--wFDEoaOJGbVYE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listarPecas() {
    const { data } = await supabase.from('pecas').select('*');
    const tbody = document.getElementById('tbodyPecas');
    tbody.innerHTML = '';
    data.forEach(p => {
        tbody.innerHTML += `<tr>
            <td>${p.id}</td>
            <td>${p.nome}</td>
            <td>${p.quantidade}</td>
        </tr>`;
    });
}

async function adicionarPeca() {
    const nome = document.getElementById('nome').value;
    const quantidade = parseInt(document.getElementById('quantidade').value);

    await supabase.from('pecas').insert([{ nome, quantidade }]);
    listarPecas();
}

window.onload = listarPecas;
document.getElementById('btnAddPeca').onclick = adicionarPeca;
