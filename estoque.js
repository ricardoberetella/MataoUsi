import { supabase } from './supabaseClient.js';

const operatorName = document.getElementById('operatorName');
const logoutBtn = document.getElementById('logoutBtn');
const listEl = document.getElementById('list');
const btnNew = document.getElementById('btnNew');
const search = document.getElementById('search');
const dialog = document.getElementById('productDialog');
const form = document.getElementById('productForm');
const cancelDialog = document.getElementById('cancelDialog');
let editingId = null;

const operator = JSON.parse(localStorage.getItem('operator') || 'null');
if(!operator){
  window.location.href = 'login.html';
} else {
  operatorName.textContent = operator.fullname || operator.username;
}

logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('operator');
  window.location.href = 'login.html';
});

btnNew.addEventListener('click', ()=>{
  editingId = null;
  dialog.showModal();
  form.reset();
  document.getElementById('dialogTitle').textContent = 'Novo Produto';
});

cancelDialog.addEventListener('click', ()=> dialog.close());

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  // Convert numeric fields
  payload.preco_custo = payload.preco_custo ? parseFloat(payload.preco_custo) : null;
  payload.preco_venda = payload.preco_venda ? parseFloat(payload.preco_venda) : null;
  payload.quantidade = payload.quantidade ? parseInt(payload.quantidade) : 0;

  if(editingId){
    const { error } = await supabase.from('products').update(payload).eq('id', editingId);
    if(error){ alert('Erro ao atualizar'); return; }
  } else {
    const { error } = await supabase.from('products').insert(payload);
    if(error){ alert('Erro ao inserir'); return; }
  }
  dialog.close();
  loadProducts();
});

search.addEventListener('input', ()=> loadProducts(search.value));

async function loadProducts(q=''){
  listEl.innerHTML = '<p>Carregando...</p>';
  let query = supabase.from('products').select('*').order('id', { ascending: false });
  if(q){
    query = query.ilike('nome', `%${q}%`);
  }
  const { data, error } = await query;
  if(error){ listEl.innerHTML = '<p>Erro ao carregar</p>'; return; }
  if(!data || data.length===0){ listEl.innerHTML = '<p>Nenhum produto.</p>'; return; }
  listEl.innerHTML = '';
  data.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
      <strong>${p.nome}</strong>
      <div>SKU: ${p.sku || ''}</div>
      <div>Qtd: ${p.quantidade || 0} | R$ ${p.preco_venda ?? ''}</div>
      <div class="actions">
        <button data-id="${p.id}" class="edit">Editar</button>
        <button data-id="${p.id}" class="del">Excluir</button>
      </div>
    `;
    listEl.appendChild(div);
  });

  // attach events
  document.querySelectorAll('.edit').forEach(b=> b.addEventListener('click', async (ev)=>{
    const id = ev.target.dataset.id;
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    if(data){
      editingId = data.id;
      form.sku.value = data.sku || '';
      form.nome.value = data.nome || '';
      form.descricao.value = data.descricao || '';
      form.unidade.value = data.unidade || '';
      form.preco_custo.value = data.preco_custo ?? '';
      form.preco_venda.value = data.preco_venda ?? '';
      form.quantidade.value = data.quantidade ?? 0;
      document.getElementById('dialogTitle').textContent = 'Editar Produto';
      dialog.showModal();
    }
  }));

  document.querySelectorAll('.del').forEach(b=> b.addEventListener('click', async (ev)=>{
    const id = ev.target.dataset.id;
    if(confirm('Excluir este produto?')){
      await supabase.from('products').delete().eq('id', id);
      loadProducts();
    }
  }));
}

loadProducts();
