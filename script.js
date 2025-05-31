// O código JavaScript permanece o mesmo do exemplo anterior.
// Por favor, copie e cole o conteúdo do script.js fornecido anteriormente.

const produtos = [
    { id: 'brigadeiro-tradicional', nome: 'Brigadeiro Tradicional', preco: 2.50, imagem: 'Brigadeiro.jpg' }
   // { id: 'beijinho', nome: 'Beijinho de Coco', preco: 2.50, imagem: 'beijinho.jpg' },
   // { id: 'cajuzinho', nome: 'Cajuzinho', preco: 2.75, imagem: 'cajuzinho.jpg' },
   // { id: 'ninho-nutella', nome: 'Ninho com Nutella', preco: 3.50, imagem: 'ninho_nutella.jpg' },
   // { id: 'morango', nome: 'Brigadeiro de Morango', preco: 3.00, imagem: 'brigadeiro_morango.jpg' },
  //  { id: 'churros', nome: 'Brigadeiro de Churros', preco: 3.25, imagem: 'brigadeiro_churros.jpg' }
    // Adicione mais produtos conforme necessário
];

const produtosDiv = document.getElementById('produtos');
const form = document.getElementById('form-venda');
const compradoresTabela = document.getElementById('compradores');
const vendaAtualDiv = document.getElementById('venda-atual');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

let vendaAtual = [];
let compradores = JSON.parse(localStorage.getItem('compradores')) || []; // Carrega dados do LocalStorage

// --- Funções de Renderização ---

function renderizarProdutos() {
    produtosDiv.innerHTML = ''; // Limpa antes de renderizar
    produtos.forEach(produto => {
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.setAttribute('data-id', produto.id); // Adiciona um ID para o produto
        card.innerHTML = `
            <img src="${produto.imagem}" alt="${produto.nome}" loading="lazy" />
            <h3>${produto.nome}</h3>
            <p>R$ ${produto.preco.toFixed(2)}</p>
        `;
        card.addEventListener('click', () => adicionarProduto(produto));
        produtosDiv.appendChild(card);
    });
}

function renderizarVendaAtual() {
    if (vendaAtual.length === 0) {
        vendaAtualDiv.innerHTML = '<p>Nenhum produto selecionado. Clique nos doces ao lado para adicionar!</p>';
        return;
    }

    vendaAtualDiv.innerHTML = vendaAtual.map((p, i) =>
        `<div class="venda-item">
            <span>${p.qtd}x ${p.nome} — R$ ${p.total.toFixed(2)}</span>
            <button class="remover-btn" data-index="${i}" aria-label="Remover ${p.nome}">Remover</button>
        </div>`
    ).join('');

    // Adiciona evento de remover nos botões
    vendaAtualDiv.querySelectorAll('.remover-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            removerProduto(idx);
        });
    });
}

function atualizarTabela() {
    compradoresTabela.innerHTML = '';
    if (compradores.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" style="text-align: center; padding: 20px; color: var(--text-dark);">Nenhuma venda registrada ainda.</td>`;
        compradoresTabela.appendChild(tr);
        return;
    }

    compradores.forEach((c, i) => {
        const tr = document.createElement('tr');
        if (!c.pago) tr.classList.add('devedor');
        tr.innerHTML = `
            <td>${c.nome}</td>
            <td>${c.telefone || 'N/A'}</td>
            <td>${c.produto}</td>
            <td>${c.qtd}</td>
            <td>R$ ${c.total}</td>
            <td>${formatarData(c.data)}</td>
            <td class="${c.pago ? 'status-pago' : 'status-nao-pago'}">${c.pago ? 'Pago' : 'Não Pago'}</td>
            <td>
                <button class="botao-pagar" data-index="${i}">
                    ${c.pago ? 'Desmarcar' : 'Marcar Pago'}
                </button>
            </td>
        `;
        compradoresTabela.appendChild(tr);
    });

    // Eventos para marcar/desmarcar pagamento
    compradoresTabela.querySelectorAll('.botao-pagar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            togglePagamento(idx);
        });
    });

    salvarDados(); // Salva no LocalStorage após atualizar a tabela
}

// --- Funções de Lógica de Negócio ---

function adicionarProduto(produto) {
    const item = vendaAtual.find(p => p.id === produto.id); // Usa ID para encontrar o produto
    if (item) {
        item.qtd += 1;
        item.total = item.qtd * item.preco;
    } else {
        vendaAtual.push({ ...produto, qtd: 1, total: produto.preco });
    }
    renderizarVendaAtual();
    ativarAba('venda'); // Garante que a aba de venda esteja ativa
}

function removerProduto(index) {
    if (index > -1) {
        vendaAtual.splice(index, 1);
        renderizarVendaAtual();
    }
}

function finalizarVenda(e) {
    e.preventDefault();

    if (vendaAtual.length === 0) {
        alert('Por favor, adicione pelo menos um doce à venda.');
        return;
    }

    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const data = document.getElementById('data').value;

    if (!nome || !data) {
        alert('Nome do comprador e data são obrigatórios.');
        return;
    }

    vendaAtual.forEach(item => {
        compradores.push({
            nome,
            telefone: telefone || 'Não Informado', // Define como 'Não Informado' se vazio
            produto: item.nome,
            qtd: item.qtd,
            total: item.total, // Manter como número para cálculos, formatar na exibição
            data,
            pago: false // Inicia como não pago
        });
    });

    atualizarTabela();
    form.reset();
    vendaAtual = []; // Limpa a venda atual
    renderizarVendaAtual();
    ativarAba('controle'); // Leva para a aba de controle após finalizar
    alert('Venda finalizada com sucesso!');
}

function togglePagamento(index) {
    if (index > -1 && compradores[index]) {
        compradores[index].pago = !compradores[index].pago;
        atualizarTabela();
    }
}

// --- Funções de UI e Utilidade ---

function ativarAba(tabId) {
    tabs.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function formatarData(dataString) {
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
}

function salvarDados() {
    localStorage.setItem('compradores', JSON.stringify(compradores));
}

// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    renderizarProdutos();
    renderizarVendaAtual();
    atualizarTabela();
    ativarAba('venda'); // Define a aba de venda como padrão ao carregar
    
    // Define a data atual como valor padrão no campo de data
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Mês é base 0
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('data').value = `${yyyy}-${mm}-${dd}`;
});

// --- Event Listeners ---
form.addEventListener('submit', finalizarVenda);

tabs.forEach(botao => {
    botao.addEventListener('click', () => {
        const tab = botao.dataset.tab;
        ativarAba(tab);
    });
});