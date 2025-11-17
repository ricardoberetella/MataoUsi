export function carregarFormularioPecas() {
  const conteudo = document.getElementById("conteudo");

  conteudo.innerHTML = `
    <h1>Cadastro de Peças</h1>

    <form id="formPeca" style="max-width:450px">
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

      <label>Comprimento da Peça (mm):</label>
      <input type="number" id="comprimento" required>

      <button type="submit" style="margin-top:15px">Salvar Peça</button>
    </form>
  `;

  document.getElementById("formPeca").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Peça salva com sucesso! (Vamos conectar ao Supabase na próxima etapa)");
  });
}
