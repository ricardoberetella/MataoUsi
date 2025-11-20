import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const lista = document.getElementById("listaPedidos");
const modal = document.getElementById("modalPedido");
const clienteSelect = document.getElementById("clienteId");

document.getElementById("btnNovoPedido").onclick = () => abrirModal();
document.getElementById("btnCancelarPedido").onclick = () => fecharModal();
document.getElementById("btnSalvarPedido").onclick = () => salvarPedido();

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  carregarPedidos();
});

async function carregarClientes() {
  const { data } = await supabase.from("clientes").select("*").order("nome");
  clienteSelect.innerHTML = "";

  data.forEach(c => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = c.nome;
    clienteSelect.appendChild(op);
  });
}

async function carregarPedidos() {
  const { data } = await supabase
    .from("pedidos")
    .select("*, clientes(nome)")
    .order("id", { ascending: false });

  lista.innerHTML = "";

  data.forEach(p => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div>
        <strong>Pedido #${p.id}</strong><br>
        Cliente: ${p.clientes?.nome ?? "—"}<br>
        Total: R$ ${Number(p.total).toFixed(2)}
      </div>
      <button class="btn-acao" onclick="window.location.href='pedido_itens.html?pedido=${p.id}'">Abrir</button>
    `;
    lista.appendChild(div);
  });
}

function abrirModal() {
  modal.classList.remove("hidden");
}

function fecharModal() {
  modal.classList.add("hidden");
}

async function salvarPedido() {
  const cliente_id = clienteSelect.value.trim();
  const observacoes = document.getElementById("observacoes").value.trim();

  const { data, error } = await supabase.from("pedidos").insert({
    cliente_id,
    observacoes,
    total: 0,
    status: "aberto"
  }).select().single();

  if (error) {
    alert("Erro: " + error.message);
    return;
  }

  fecharModal();
  carregarPedidos();
}
