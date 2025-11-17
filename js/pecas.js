import { supabase } from "./config.js";

export function carregarFormularioPecas() {
  const conteudo = document.getElementById("conteudo");

  conteudo.innerHTML = `
    <h1>Cadastro de Peças</h1>

    <form id="formPeca" style="max-width:450px; display:flex; flex-direction:column; gap:10px;">
      
      <label>Código da Peça:</label>
      <input type="text" id="codigo" required>

      <label>Descrição da Peça:</label>
      <input type="text" id="descricao" required>

      <label>Peso (KG):</label>
      <input type="number" id="kg" step="0.01" required>

      <label>Tratamento:</label>
      <select id="tratamento" required>
        <option value="">Selecione</option>
        <option value="Zincada">Zincada</option>
        <option value="Tratada">Tratada</option>
      </select>

      <label>Comprimento (mm):</label>
      <input type="number" id="comprimento" required>

      <button type="submit" style="margin-top:15px; padding:10px;">Salvar Peça</button>
    </form>

    <p id="msg" style="margin-top:15px; font-weight:bold;"></p>
  `;

  document.getElementById("formPeca").addEventListener("submit", salvarPeca);
}

async function salvarPeca(e) {
  e.preventDefault();

  const codigo = document.getElementById("codigo").value;
  const descricao = document.getElementById("descricao").value;
  const kg = document.getElementById("kg").value;
  const tratamento = document.getElementById("tratamento").value;
  const comprimento = document.getElementById("comprimento").value;

  const msg = document.getElementById("msg");
  msg.innerText = "Salvando...";

  const { data, error } = await supabase
    .from("pecas")
    .insert([
      {
        codigo,
        descricao,
        kg,
        tratamento,
        comprimento
      }
    ]);

  if (error) {
    msg.style.color = "red";
    msg.innerText = "Erro ao salvar: " + error.message;
    console.error(error);
  } else {
    msg.style.color = "green";
    msg.innerText = "Peça salva com sucesso!";
    
    // Limpar formulário
    document.getElementById("formPeca").reset();
  }
}
