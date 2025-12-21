/* ============================================================
      MÁSCARA CPF / CNPJ
   ============================================================ */
function mascaraCpfCnpj(input) {
    let v = input.value.replace(/\D/g, "");

    // 🔒 Limite máximo de dígitos (CNPJ = 14)
    if (v.length > 14) v = v.slice(0, 14);

    if (v.length <= 11) {
        // CPF → 000.000.000-00
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        // CNPJ → 00.000.000/0000-00
        v = v.replace(/(\d{2})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1/$2");
        v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }

    input.value = v;
}

/* ============================================================
      MÁSCARA TELEFONE (corrigida)
      Suporta:
      • (11) 1234-5678
      • (11) 91234-5678
   ============================================================ */
function mascaraTelefone(input) {
    let v = input.value.replace(/\D/g, "");

    // 🔒 Limite máximo de 11 dígitos
    if (v.length > 11) v = v.slice(0, 11);

    if (v.length <= 10) {
        // TELEFONE FIXO
        v = v.replace(/(\d{2})(\d)/, "($1) $2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        // CELULAR
        v = v.replace(/(\d{2})(\d)/, "($1) $2");
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }

    input.value = v;
}

/* ============================================================
      COMO USAR (HTML EXEMPLO)
      <input type="text" oninput="mascaraCpfCnpj(this)">
      <input type="text" oninput="mascaraTelefone(this)">
   ============================================================ */
