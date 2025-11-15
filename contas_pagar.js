import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://nfdinjmjofvqmjnfquiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGluam1qb2Z2cW1qbmZxdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODI1NjEsImV4cCI6MjA3ODc1ODU2MX0.K6dojizNG0oFZaGU9DHZkcbqC8yH--wFDEoaOJGbVYE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listarContasPagar() {
    const { data } = await supabase.from('contas_pagar').select('*');
    const tbody = document.getElementById('tbodyContasPagar');
    tbody.innerHTML = '';
    data.forEach(c => {
        tbody.innerHTML += `<tr>
            <td>${c.id}</td>
            <td>${c.fornecedor}</td>
            <td>${c.descricao}</td>
            <td>${c.valor}</td>
            <td>${c.vencimento}</td>
            <td>${c.status}</td>
        </tr>`;
    });
}

async function adicionarConta() {
    const fornecedor = document.getElementById('fornecedor').value;
    const descricao = document.getElementById('descricao').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const vencimento = document.getElementById('vencimento').value;

    await supabase.from('contas_pagar').insert([{ fornecedor, descricao, valor, vencimento }]);
    listarContasPagar();
}

window.onload = listarContasPagar;
document.getElementById('btnAddConta').onclick = adicionarConta;
