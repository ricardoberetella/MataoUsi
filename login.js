import { supabase } from './supabaseClient.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const username = form.username.value.trim();
  const password = form.password.value.trim();

  if(!username || !password){
    msg.textContent = 'Preencha usuário e senha';
    return;
  }

  // Busca na tabela operators
  const { data, error } = await supabase
    .from('operators')
    .select('id, username, fullname')
    .eq('username', username)
    .eq('password', password)
    .limit(1)
    .single();

  if(error || !data){
    msg.textContent = 'Usuário ou senha inválidos';
    return;
  }

  // Guarda info no localStorage e redireciona
  localStorage.setItem('operator', JSON.stringify({ id: data.id, username: data.username, fullname: data.fullname }));
  window.location.href = 'estoque.html';
});
