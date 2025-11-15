import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://nfdinjmjofvqmjnfquiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGluam1qb2Z2cW1qbmZxdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODI1NjEsImV4cCI6MjA3ODc1ODU2MX0.K6dojizNG0oFZaGU9DHZkcbqC8yH--wFDEoaOJGbVYE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listarPedidos() {
    const { data } = await supabase.from('pedidos').select('*, clientes(nome), pecas(nome)');
    const tbody = document.getElementById('tbodyPedidos');
    tbody.innerHTML = '';
    data.forEach(p => {
        tbody.innerHTML += `<tr>
            <td>${p.id}</td>
            <td>${p.clientes.nome}</td>
            <td>${p.pecas.nome}</td>
            <td>${p.quantidade}</td>
        </tr>`;
    });
}

async function adicionarPedido() {
    const cliente_id = parseInt(document.getElementById('cliente_id').value);
    const peca_id = parseInt(document.getElementById('peca_id').value);
    const quantidade = parseInt(document.getElementById('quantidade').value);

    await supabase.from('pedidos').insert([{ cliente_id, peca_id, quantidade }]);
    listarPedidos();
}

window.onload = listarPedidos;
document.getElementById('btnAddPedido').onclick = adicionarPedido;
