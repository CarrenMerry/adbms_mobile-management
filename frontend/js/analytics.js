// SQL Analytics Frontend Controller - ADBMS Concepts Demonstration

let allDemos = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    await loadAnalytics();
});

async function loadAnalytics() {
    const container = document.getElementById('analyticsCardsContainer');
    container.innerHTML = `
        <div class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm text-success me-2"></div>
            Executing ADBMS queries against MySQL database...
        </div>
    `;

    try {
        const res = await api.get('/analytics/all');
        if (res.success && res.data) {
            allDemos = res.data;
            renderDemos();
        }
    } catch (err) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i> Failed to execute analytics queries: ${escapeHtml(err.message)}
            </div>
        `;
    }
}

function filterCategory(btn, category) {
    document.querySelectorAll('#categoryFilterContainer button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = category;
    renderDemos();
}

function renderDemos() {
    const container = document.getElementById('analyticsCardsContainer');
    const filtered = (activeCategory === 'all') 
        ? allDemos 
        : allDemos.filter(d => d.category === activeCategory);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-4 bg-white rounded border text-center text-muted">No demonstration queries found for this category.</div>`;
        return;
    }

    container.innerHTML = filtered.map((demo, idx) => {
        // Build table from result data
        let tableHtml = '';
        if (Array.isArray(demo.data) && demo.data.length > 0) {
            const columns = Object.keys(demo.data[0]);
            const headerThs = columns.map(c => `<th>${escapeHtml(c)}</th>`).join('');
            const rowTds = demo.data.map(row => {
                const cells = columns.map(c => {
                    let val = row[c];
                    if (val === null || val === undefined) val = '<span class="text-muted">NULL</span>';
                    else if (typeof val === 'number' && (c.includes('price') || c.includes('amount') || c.includes('revenue') || c.includes('total') || c.includes('spent'))) {
                        val = formatCurrency(val);
                    } else if (c.includes('date')) {
                        val = formatDate(val);
                    }
                    return `<td>${val}</td>`;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');

            tableHtml = `
                <div class="table-responsive-custom mt-3">
                    <table class="table-custom">
                        <thead><tr>${headerThs}</tr></thead>
                        <tbody>${rowTds}</tbody>
                    </table>
                </div>
            `;
        } else {
            tableHtml = `<div class="p-3 bg-light rounded text-muted small mt-2">Zero records returned for this query.</div>`;
        }

        return `
            <div class="content-card mb-4">
                <div class="card-header-custom">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge bg-light text-primary border" style="font-size: 0.72rem;">${escapeHtml(demo.category)}</span>
                            <span class="badge bg-light text-dark border" style="font-size: 0.72rem;">
                                <i class="bi bi-cpu me-1 text-success"></i> Concept: ${escapeHtml(demo.concept)}
                            </span>
                        </div>
                        <h5 class="fw-bold mb-0 text-dark">${escapeHtml(demo.title)}</h5>
                    </div>
                    <div>
                        <span class="badge bg-light text-success border border-success-subtle font-monospace py-2 px-3">
                            <i class="bi bi-stopwatch me-1"></i> ${demo.execution_time_ms} ms
                        </span>
                    </div>
                </div>

                <div class="card-body-custom">
                    <p class="text-muted-custom small mb-2">${escapeHtml(demo.explanation)}</p>

                    <!-- SQL Code Box -->
                    <div class="sql-box">
                        <span class="sql-badge">MySQL DML / DQL</span>
                        <pre class="m-0 text-light" style="white-space: pre-wrap; word-break: break-all;"><code>${escapeHtml(demo.sql_query)}</code></pre>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-3 mb-1">
                        <h6 class="fw-bold mb-0 small text-dark"><i class="bi bi-table me-1 text-primary"></i> Live Query Output (Executed on Server)</h6>
                        <small class="text-muted">${Array.isArray(demo.data) ? demo.data.length : 0} rows retrieved</small>
                    </div>

                    ${tableHtml}
                </div>
            </div>
        `;
    }).join('');
}
