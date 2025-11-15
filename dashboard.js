import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://nfdinjmjofvqmjnfquiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGluam1qb2Z2cW1qbmZxdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODI1NjEsImV4cCI6MjA3ODc1ODU2MX0.K6dojizNG0oFZaGU9DHZkcbqC8yH--wFDEoaOJGbVYE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function entrar() {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        alert('Erro: ' + error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
}

document.getElementById('btnLogin').onclick = entrar;
