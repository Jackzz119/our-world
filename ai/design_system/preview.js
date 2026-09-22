// Show the real media registered in maintained Markdown; never copy design values into this viewer.
const catalogs = {
    world: [
        ['整体实景', 'design-system.md'],
        ['三时辰场景原画', 'scene.md'],
        ['双角色与表情素材', 'character.md'],
        ['物件与已有动态', 'props.md'],
        ['环境效果来源', 'effects.md']
    ],
    ui: [
        ['UI 在场景中的关系', 'uiux/uiux.md'],
        ['当前主题：导航、功能界面与日记', 'uiux/cinnaglass/ui-system.md'],
        ['手机版：竖屏、横屏与输入', 'uiux/mobile.md']
    ]
};
let revision = 0;

// Build elements with textContent so Markdown descriptions cannot become injected markup.
function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
}

// Resolve registered local images against their source document; GIFs play only on demand.
async function domain(title, file) {
    const url = new URL(file, location.href);
    const section = element('section', '', 'domain');
    const header = element('header');
    header.append(element('h2', title));
    const source = element('a', '规范与来源 ↗');
    source.href = url.href;
    header.append(source);
    section.append(header);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Source unavailable');
        const markdown = (await response.text()).replace(/```[\s\S]*?```/g, '');
        const images = [...markdown.matchAll(/!\[([^\]]*)\]\((?:<([^>]+)>|([^\s)]+))\)/g)];
        const gallery = element('div', '', 'gallery');
        const seen = new Set();
        for (const [, description, bracketed, plain] of images) {
            const assetUrl = new URL(bracketed || plain, url);
            if (assetUrl.origin !== location.origin || seen.has(assetUrl.href)) continue;
            seen.add(assetUrl.href);
            const figure = element('figure');
            const holder = element('div', '', 'asset');
            const image = element('img');
            image.alt = description;
            image.loading = 'lazy';
            image.addEventListener('error', () =>
                holder.replaceChildren(element('p', '素材暂时无法加载，请从规范检查来源。'))
            );
            const link = element('a');
            link.href = assetUrl.href;
            link.target = '_blank';
            link.rel = 'noopener';
            link.append(image);
            if (/\.gif$/i.test(assetUrl.pathname)) {
                const play = element('button', '播放已登记动图', 'play');
                play.addEventListener('click', () => {
                    image.src = assetUrl.href;
                    holder.replaceChildren(link);
                    const stop = element('button', '停止动图', 'play');
                    stop.addEventListener('click', () => {
                        image.removeAttribute('src');
                        holder.replaceChildren(play);
                        play.focus();
                    });
                    holder.append(stop);
                    stop.focus();
                });
                holder.append(play);
            } else {
                image.src = assetUrl.href;
                holder.append(link);
            }
            figure.append(holder, element('figcaption', description));
            gallery.append(figure);
        }
        section.append(seen.size ? gallery : element('p', '此规范尚未登记图片，请打开源文档查看。', 'empty'));
    } catch {
        section.append(element('p', '资料暂时无法读取；请通过项目开发服务打开此页。', 'empty'));
    }
    return section;
}

// Ignore stale requests when switching between overall art and UI views quickly.
async function show(view) {
    const current = ++revision;
    document.getElementById('catalog').dataset.view = view;
    const buttons = document.querySelectorAll('[data-view]');
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    const source = document.getElementById('source');
    source.href = view === 'ui' ? 'uiux/uiux.md' : 'design-system.md';
    source.textContent = view === 'ui' ? '阅读 UI / UX 规范 ↗' : '阅读整体规范 ↗';
    document.getElementById('status').textContent = '正在读取常驻设计资料…';
    const sections = await Promise.all(catalogs[view].map(([title, file]) => domain(title, file)));
    if (current !== revision) return;
    document.getElementById('catalog').replaceChildren(...sections);
    document.getElementById('status').textContent =
        view === 'ui'
            ? '当前登记的 UI 素材与实景；交互、状态和实现范围请沿卡片链接查看。'
            : '原画、角色、物件与环境效果共享同一份常驻资料。';
}

for (const button of document.querySelectorAll('[data-view]')) {
    button.addEventListener('click', () => {
        location.hash = button.dataset.view;
    });
}
window.addEventListener('hashchange', () => show(location.hash === '#ui' ? 'ui' : 'world'));
show(location.hash === '#ui' ? 'ui' : 'world');
