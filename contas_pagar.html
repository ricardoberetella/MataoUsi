<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extrato Financeiro - Matão Usinagem</title>
    <link rel="stylesheet" href="css/estilo.css">
    <style>
        body { background-color: #0f172a; color: white; font-family: sans-serif; margin: 0; padding: 15px; }
        .container { max-width: 1000px; margin: auto; }
        
        /* Dashboard com cards de tamanho real */
        .dashboard { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); 
            gap: 12px; 
            margin-bottom: 20px; 
        }
        .card { 
            background: #1e293b; 
            padding: 15px; 
            border-radius: 10px; 
            text-align: center; 
            border: 1px solid #334155;
        }
        .valor { font-size: 1.2rem; font-weight: bold; margin-top: 5px; }

        /* Botões centrais e grandes para Tablet */
        .area-botoes {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
        }
        .btn-principal {
            flex: 1;
            max-width: 200px;
            padding: 15px;
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        }

        /* Modal Ajustado (nem muito pequeno, nem gigante) */
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); }
        .modal-content { 
            background: #1e293b; 
            margin: 10% auto; 
            padding: 25px; 
            width: 85%; 
            max-width: 450px; 
            border-radius: 15px; 
            border: 1px solid #38bdf8; 
        }
        input, select { width: 100%; padding: 12px; margin: 10px 0; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; }
        
        table { width: 100%; border-collapse: collapse; background: #1e293b; margin-top: 10px; border-radius: 8px; overflow: hidden; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    </style>
</head>
<body>
    <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h1 style="color: #38bdf8; margin: 0;">Extrato Financeiro</h1>
            <a href="dashboard.html" style="color: #38bdf8; text-decoration: none; border: 1px solid #38bdf8; padding: 8px 15px; border-radius: 6px;">← Voltar</a>
        </div>

        <div class="dashboard">
            <div class="card"><small>PREVISÃO RECEBER</small><div id="resumoReceber" class="valor" style="color: #22c55e;">R$ 0,00</div></div>
            <div class="card"><small>CONTAS A PAGAR</small><div id="resumoPagar" class="valor" style="color: #ef4444;">R$ 0,00</div></div>
            <div class="card"><small>SICOOB</small><div id="resumoSicoob" class="valor">R$ 0,00</div></div>
            <div class="card"><small>CAIXA FEDERAL</small><div id="resumoCaixa" class="valor">R$ 0,00</div></div>
            <div class="card"><small>APLICAÇÃO</small><div id="resumoAplicacao" class="valor" style="color: #a855f7;">R$ 0,00</div></div>
        </div>

        <div class="area-botoes">
            <button onclick="abrirModal('DEBITO')" class="btn-principal" style="background: #ef4444;">- Débito</button>
            <button onclick="abrirModal('CREDITO')" class="btn-principal" style="background: #22c55e;">+ Crédito</button>
            <button onclick="abrirModal('TRANSFERENCIA')" class="btn-principal" style="background: #a855f7;">Transferência</button>
        </div>

        <table>
            <thead>
                <tr>
                    <th>DATA</th><th>BANCO</th><th>DESCRIÇÃO</th><th>VALOR</th><th style="text-align: center;">AÇÕES</th>
                </tr>
            </thead>
            <tbody id="listaFinanceiro"></tbody>
        </table>
    </div>

    <div id="modalFinanceiro" class="modal">
        <div class="modal-content">
            <h2 id="modalTitulo" style="color: #38bdf8; margin-top: 0;">Lançar Débito</h2>
            <input type="hidden" id="editId">
            <label>Data</label><input type="date" id="campoData">
            <label>Banco</label><select id="campoBanco"></select>
            <label>Descrição</label><input type="text" id="campoDescricao" placeholder="Ex: Pagamento Boleto">
            <label>Valor (R$)</label><input type="number" step="0.01" id="campoValor" placeholder="0,00">
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="salvarLancamento()" style="flex: 2; padding: 15px; background: #38bdf8; border: none; font-weight: bold; border-radius: 8px; cursor: pointer;">SALVAR</button>
                <button onclick="fecharModal()" style="flex: 1; padding: 15px; background: #475569; border: none; color: white; border-radius: 8px; cursor: pointer;">Sair</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="js/contas_pagar.js"></script>
</body>
</html>
