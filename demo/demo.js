// Демо ИмпортКонтроля: показывает результат настоящей программы на вымышленных документах (demo/data.json).
// Ничего не загружается и не отправляется: все данные лежат рядом со страницей.
const root = document.querySelector('[data-demo]');
if (root) init(root);

async function init(root) {
  const run = root.querySelector('[data-demo-run]');
  const list = root.querySelector('[data-demo-list]');
  const status = root.querySelector('[data-demo-status]');
  const view = root.querySelector('[data-demo-view]');
  const cap = root.querySelector('[data-demo-cap]');
  const tabs = [...root.querySelectorAll('[data-demo-side]')];
  let data = null, current = null, side = 1;

  try {
    data = await (await fetch('demo/data.json')).json();
  } catch {
    status.textContent = 'Не удалось загрузить пример. Обновите страницу.';
    run.disabled = true;
    return;
  }
  const docs = Object.fromEntries(data.docs.map(d => [d.id, d]));
  // до проверки окно не пустое: первый документ, как его увидит бухгалтер
  current = data.items.find(i => i.sev === 'error');
  draw();
  cap.innerHTML = 'Так программа показывает место расхождения. Нажмите «Проверить пример», чтобы увидеть все.';

  run.addEventListener('click', () => {
    run.disabled = true;
    status.textContent = 'Проверяю 3 документа…';
    setTimeout(() => {
      const shown = data.items.filter(i => i.sev !== 'ok');
      const ok = data.items.length - shown.length;
      status.textContent = `${data.status}: ошибок ${shown.filter(i => i.sev === 'error').length}, предупреждений ${shown.filter(i => i.sev === 'warn').length}, совпадений ${ok}.`;
      list.innerHTML = '';
      shown.forEach((it, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'demo__item';
        b.dataset.sev = it.sev;
        b.innerHTML = `<span class="demo__sev">${it.sev === 'error' ? '✖ Ошибка' : '⚠ Предупреждение'} · ${esc(it.cat)}</span>` +
          `<span class="demo__vals">${esc(it.v1)} → ${esc(it.v2)}</span>` +
          (it.diff ? `<span class="demo__diff">Разница ${esc(it.diff)}</span>` : '');
        b.addEventListener('click', () => select(it, b));
        list.appendChild(b);
        if (k === 0) select(it, b);
      });
      run.textContent = 'Проверить ещё раз';
      run.disabled = false;
    }, 700);
  });

  tabs.forEach(t => t.addEventListener('click', () => { side = +t.dataset.demoSide; draw(); }));

  function select(it, btn) {
    current = it; side = 1;
    list.querySelectorAll('.demo__item').forEach(x => x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'));
    draw();
  }

  function draw() {
    if (!current) return;
    tabs.forEach(t => {
      const s = current['s' + t.dataset.demoSide];
      t.disabled = !s;
      t.setAttribute('aria-pressed', +t.dataset.demoSide === side ? 'true' : 'false');
      t.textContent = s ? docs[s.doc].name : 'нет источника';
    });
    const s = current['s' + side];
    const short = String(current.reason).split(/(?<=[^.]{12}\.)\s(?=[А-ЯЁA-Z])/)[0];   // первая фраза: что не совпало
    cap.innerHTML = `<b>${esc(current.title)}.</b> ${esc(short)}<br><span class="muted">Где: ${esc(s ? s.where : '—')}</span>`;
    view.innerHTML = '';
    if (!s) return;
    const d = docs[s.doc];
    if (s.bbox && d.image) {
      const wrap = document.createElement('div');
      wrap.className = 'demo__page';
      wrap.innerHTML = `<img src="demo/${d.image}" alt="Страница 1 документа ${esc(d.name)}">`;
      const [x0, y0, x1, y1] = s.bbox, pad = 3;
      const hl = document.createElement('span');
      hl.className = 'demo__hl';
      Object.assign(hl.style, {
        left: ((x0 - pad) / d.width * 100) + '%', top: ((y0 - pad) / d.height * 100) + '%',
        width: ((x1 - x0 + 2 * pad) / d.width * 100) + '%', height: ((y1 - y0 + 2 * pad) / d.height * 100) + '%',
      });
      wrap.appendChild(hl);
      view.appendChild(wrap);
      // показать подсвеченное место в середине окна
      requestAnimationFrame(() => {
        const r = (y0 / d.height) * wrap.offsetHeight;
        view.scrollTop = Math.max(0, r - view.clientHeight / 2);
      });
    } else if (s.sheet) {
      const sh = d.sheets.find(x => x.name === s.sheet);
      const from = Math.max(1, s.row - 6), to = Math.min(sh.rows, s.row + 4);
      const cols = sh.cols;
      let h = `<p class="demo__sheet">Лист «${esc(sh.name)}»</p><table class="demo__table"><thead><tr><th></th>`;
      for (let c = 1; c <= cols; c++) h += `<th>${String.fromCharCode(64 + c)}</th>`;
      h += '</tr></thead><tbody>';
      for (let r = from; r <= to; r++) {
        h += `<tr${r === s.row ? ' class="is-row"' : ''}><th>${r}</th>`;
        for (let c = 1; c <= cols; c++) {
          const v = sh.cells[`${r},${c}`] || '';
          h += `<td${r === s.row && c === s.col ? ' class="is-cell"' : ''}>${esc(v)}</td>`;
        }
        h += '</tr>';
      }
      view.innerHTML = h + '</tbody></table>';
      const cell = view.querySelector('.is-cell');
      requestAnimationFrame(() => {   // нужная ячейка — в середине окна, даже если таблица шире
        view.scrollLeft = Math.max(0, cell.offsetLeft - view.clientWidth / 2 + cell.offsetWidth / 2);
        view.scrollTop = Math.max(0, cell.offsetTop - view.clientHeight / 2);
      });
    }
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
