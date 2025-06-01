// script.js

// --- Dados Iniciais ---
const PRODUCTS = [
    { id: 'brigadeiro-tradicional', nome: 'Brigadeiro Tradicional', preco: 2.50, imagem: 'a.jpg' }
];

let currentSale = []; // Produtos na venda atual
let completedSales = []; // Histórico de vendas finalizadas

// --- Seletores DOM ---
const DOM = {
    produtosDiv: document.getElementById('produtos'),
    formSale: document.getElementById('form-venda'),
    compradoresTabela: document.getElementById('compradores'),
    vendaAtualDiv: document.getElementById('venda-atual'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    graficoVendasCtx: document.getElementById('grafico-vendas')?.getContext('2d'),
    filterClientInput: document.getElementById('filtro-cliente'),
    filterDateStartInput: document.getElementById('filtro-data-inicio'),
    filterDateEndInput: document.getElementById('filtro-data-fim'),
    filterStatusSelect: document.getElementById('filtro-status'),
    filterProductInput: document.getElementById('filtro-produto'),
    // REMOVIDO: applyFiltersButton: document.getElementById('aplicar-filtros'),
    inputDate: document.getElementById('data')
};

let salesChartInstance; // Variável para a instância do Chart.js

// --- Funções de Utilitário ---
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Erro ao salvar dados no localStorage para a chave "${key}":`, error);
    }
}

function loadFromLocalStorage(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error(`Erro ao carregar dados do localStorage para a chave "${key}":`, error);
        return defaultValue;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// --- Funções de UI (User Interface) ---
function renderProducts() {
    DOM.produtosDiv.innerHTML = '';
    PRODUCTS.forEach(product => {
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.setAttribute('data-id', product.id);
        card.innerHTML = `
            <img src="${product.imagem}" alt="${product.nome}" loading="lazy" />
            <h3>${product.nome}</h3>
            <p>R$ ${product.preco.toFixed(2)}</p>
        `;
        card.addEventListener('click', () => handleAddProductToCurrentSale(product));
        DOM.produtosDiv.appendChild(card);
    });
}

function renderCurrentSaleDisplay() {
    if (currentSale.length === 0) {
        DOM.vendaAtualDiv.innerHTML = '<p>Nenhum produto selecionado. Clique nos doces ao lado para adicionar!</p>';
        return;
    }

    DOM.vendaAtualDiv.innerHTML = currentSale.map((p, i) =>
        `<div class="venda-item">
            <span>${p.qtd}x ${p.nome} — R$ ${p.total.toFixed(2)}</span>
            <button class="remover-btn" data-index="${i}" aria-label="Remover ${p.nome}">Remover</button>
        </div>`
    ).join('');

    DOM.vendaAtualDiv.querySelectorAll('.remover-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            handleRemoveProductFromCurrentSale(idx);
        });
    });
}

function updateSalesTable(salesData = completedSales) {
    DOM.compradoresTabela.innerHTML = '';
    if (salesData.length === 0) {
        const tr = document.createElement('tr');
        // Ajustado colspan para 9 para incluir a coluna "Remover"
        tr.innerHTML = `<td colspan="9" style="text-align: center; padding: 20px; color: var(--text-dark);">Nenhuma venda registrada ainda.</td>`;
        DOM.compradoresTabela.appendChild(tr);
        return;
    }

    salesData.forEach((sale, index) => {
        const tr = document.createElement('tr');
        if (!sale.pago) tr.classList.add('devedor');
        tr.innerHTML = `
            <td>${sale.nome}</td>
            <td>${sale.telefone || 'N/A'}</td>
            <td>${sale.produto}</td>
            <td>${sale.qtd}</td>
            <td>R$ ${sale.total.toFixed(2)}</td>
            <td>${formatDate(sale.data)}</td>
            <td class="${sale.pago ? 'status-pago' : 'status-nao-pago'}">${sale.pago ? 'Pago' : 'Não Pago'}</td>
            <td>
                <button class="botao-pagar" data-index="${index}">
                    ${sale.pago ? 'Desmarcar' : 'Marcar Pago'}
                </button>
            </td>
            <td>
                <button class="botao-remover-cliente" data-index="${index}" aria-label="Remover cliente ${sale.nome}">Remover</button>
            </td>
        `;
        DOM.compradoresTabela.appendChild(tr);
    });

    // Event listeners para o botão de pagar/desmarcar
    DOM.compradoresTabela.querySelectorAll('.botao-pagar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            handleTogglePaymentStatus(idx);
        });
    });

    // Event listeners para o novo botão de remover cliente
    DOM.compradoresTabela.querySelectorAll('.botao-remover-cliente').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            handleRemoveClient(idx);
        });
    });

    updateSalesChart(salesData);
}

function activateTab(tabId) {
    DOM.tabs.forEach(b => b.classList.remove('active'));
    DOM.tabContents.forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function updateSalesChart(salesData = completedSales) {
    if (!DOM.graficoVendasCtx) return;

    const monthlyRevenue = {};
    salesData.forEach(sale => {
        const month = sale.data.slice(0, 7); //YYYY-MM
        if (!monthlyRevenue[month]) monthlyRevenue[month] = 0;
        monthlyRevenue[month] += sale.total;
    });

    const labels = Object.keys(monthlyRevenue).sort();
    const data = labels.map(m => monthlyRevenue[m]);

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(DOM.graficoVendasCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Receita por Mês',
                data: data,
                backgroundColor: 'rgba(130, 105, 135, 0.6)',
                borderColor: 'rgba(130, 105, 135, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': R$ ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// --- Funções de Lógica de Negócio (Handlers de Eventos) ---
function handleAddProductToCurrentSale(product) {
    const item = currentSale.find(p => p.id === product.id);
    if (item) {
        item.qtd += 1;
        item.total = item.qtd * item.preco;
    } else {
        currentSale.push({ ...product, qtd: 1, total: product.preco });
    }
    renderCurrentSaleDisplay();
    activateTab('venda');
}

function handleRemoveProductFromCurrentSale(index) {
    if (index > -1) {
        currentSale.splice(index, 1);
    }
    renderCurrentSaleDisplay();
}

function handleFinalizeSale(e) {
    e.preventDefault();

    if (currentSale.length === 0) {
        alert('Por favor, adicione pelo menos um doce à venda.');
        return;
    }

    const clientName = DOM.formSale.querySelector('#nome').value.trim();
    const clientPhone = DOM.formSale.querySelector('#telefone').value.trim();
    const saleDate = DOM.formSale.querySelector('#data').value;

    if (!clientName || !saleDate) {
        alert('Nome do comprador e data são obrigatórios.');
        return;
    }

    currentSale.forEach(item => {
        completedSales.push({
            nome: clientName,
            telefone: clientPhone || 'Não Informado',
            produto: item.nome,
            qtd: item.qtd,
            total: item.total,
            data: saleDate,
            pago: false
        });
    });

    saveToLocalStorage('compradores', completedSales);
    currentSale = []; // Limpa a venda atual
    renderCurrentSaleDisplay(); // Atualiza o display da venda atual para vazio
    DOM.formSale.reset(); // Limpa o formulário
    activateTab('controle'); // Leva para a aba de controle após finalizar
    updateSalesTable(); // Garante que a tabela de vendas esteja atualizada
    alert('Venda finalizada com sucesso!');
}

function handleTogglePaymentStatus(index) {
    if (index > -1 && completedSales[index]) {
        completedSales[index].pago = !completedSales[index].pago;
        saveToLocalStorage('compradores', completedSales);
        updateSalesTable(); // Atualiza a tabela e o gráfico
    }
}

function handleRemoveClient(index) {
    if (index > -1 && completedSales[index]) {
        const confirmRemoval = confirm(`Tem certeza que deseja remover a venda de ${completedSales[index].nome} referente a ${completedSales[index].produto}?`);
        if (confirmRemoval) {
            completedSales.splice(index, 1);
            saveToLocalStorage('compradores', completedSales);
            updateSalesTable(); // Atualiza a tabela e o gráfico
            alert('Venda removida com sucesso!');
        }
    }
}

function handleApplyFilters() {
    const filters = {
        cliente: DOM.filterClientInput.value,
        dataInicio: DOM.filterDateStartInput.value,
        dataFim: DOM.filterDateEndInput.value,
        status: DOM.filterStatusSelect.value,
        produto: DOM.filterProductInput.value
    };

    const filteredSales = completedSales.filter(sale => {
        const clientMatch = !filters.cliente || sale.nome.toLowerCase().includes(filters.cliente.toLowerCase());
        const productMatch = !filters.produto || sale.produto.toLowerCase().includes(filters.produto.toLowerCase());
        const statusMatch = !filters.status || (sale.pago ? 'pago' : 'nao-pago') === filters.status;
        const dateStartMatch = !filters.dataInicio || sale.data >= filters.dataInicio;
        const dateEndMatch = !filters.dataFim || sale.data <= filters.dataFim;

        return clientMatch && productMatch && statusMatch && dateStartMatch && dateEndMatch;
    });

    updateSalesTable(filteredSales);
}

// --- Inicialização e Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Carrega os dados salvos
    completedSales = loadFromLocalStorage('compradores');

    // Renderiza a UI inicial
    renderProducts();
    renderCurrentSaleDisplay();
    updateSalesTable(); // Exibe todas as vendas ao carregar
    activateTab('venda'); // Inicia na aba de nova venda

    // Define a data atual como valor padrão no campo de data
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    DOM.inputDate.value = `${yyyy}-${mm}-${dd}`;

    // Adiciona Event Listeners
    DOM.formSale.addEventListener('submit', handleFinalizeSale);

    DOM.tabs.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            activateTab(tabId);
            if (tabId === 'controle') {
                updateSalesTable(); // Garante que a tabela esteja atualizada ao mudar para a aba de controle
            }
        });
    });

   

    
    DOM.filterClientInput.addEventListener('input', handleApplyFilters);
    DOM.filterDateStartInput.addEventListener('change', handleApplyFilters);
    DOM.filterDateEndInput.addEventListener('change', handleApplyFilters);
    DOM.filterStatusSelect.addEventListener('change', handleApplyFilters);
    DOM.filterProductInput.addEventListener('input', handleApplyFilters);
});
