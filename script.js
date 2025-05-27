require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.39.0/min/vs' }});

let editor;
let tabs = [];
let currentTabId = null;
let tabCounter = 1;

const tabBar = document.getElementById('tab-bar');
const addTabBtn = document.getElementById('add-tab-btn');
const contextMenu = document.getElementById('context-menu');
const renameOption = document.getElementById('rename-tab');
const saveOption = document.getElementById('save-tab');

function createTab(name, content = '') {
  const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tab = { id, name, content };
  tabs.push(tab);
  return tab;
}

function saveTabsToLocal() {
  localStorage.setItem('monaco-tabs', JSON.stringify(tabs));
}

function loadTabsFromLocal() {
  const saved = localStorage.getItem('monaco-tabs');
  if (saved) {
    try {
      const loadedTabs = JSON.parse(saved);
      if (Array.isArray(loadedTabs) && loadedTabs.length) {
        tabs = loadedTabs;
        tabCounter = tabs.length + 1;
        return true;
      }
    } catch {
      // ignore JSON errors
    }
  }
  return false;
}

function renderTabs() {
  // Remove all tabs except add button
  [...tabBar.querySelectorAll('.tab')].forEach(t => t.remove());

  tabs.forEach((tab, i) => {
    const tabEl = document.createElement('div');
    tabEl.classList.add('tab');
    tabEl.textContent = tab.name;
    tabEl.dataset.id = tab.id;
    tabEl.title = tab.name;

    // Add active class
    if (tab.id === currentTabId) tabEl.classList.add('active');

    // Close button (skip for first tab)
    if (i > 0) {
      const closeBtn = document.createElement('span');
      closeBtn.classList.add('close-btn');
      closeBtn.textContent = '×';
      closeBtn.title = 'Close Tab';
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closeTab(tab.id);
      });
      tabEl.appendChild(closeBtn);
    }

    // Left click to switch tab
    tabEl.addEventListener('click', () => switchTab(tab.id));

    // Right click context menu
    tabEl.addEventListener('contextmenu', e => {
      e.preventDefault();
      openContextMenu(e.pageX, e.pageY, tab.id);
    });

    tabBar.insertBefore(tabEl, addTabBtn);
  });
}

function switchTab(id) {
  if (id === currentTabId) return;
  saveCurrentTabContent();
  currentTabId = id;
  const tab = tabs.find(t => t.id === id);
  if (tab) {
    editor.setValue(tab.content);
    renderTabs();
  }
}

function closeTab(id) {
  if (tabs.length <= 1) return; // always keep at least one tab
  if (id === tabs[0].id) return; // can't close first tab

  const index = tabs.findIndex(t => t.id === id);
  if (index !== -1) {
    tabs.splice(index, 1);
    if (currentTabId === id) {
      const nextTab = tabs[index] || tabs[index - 1];
      currentTabId = nextTab.id;
      editor.setValue(nextTab.content);
    }
    renderTabs();
    saveTabsToLocal();
  }
}

function saveCurrentTabContent() {
  const tab = tabs.find(t => t.id === currentTabId);
  if (tab) {
    tab.content = editor.getValue();
    saveTabsToLocal();
  }
}

function addNewTab() {
  saveCurrentTabContent();
  const name = `Script #${tabCounter++}`;
  const tab = createTab(name, '');
  currentTabId = tab.id;
  renderTabs();
  editor.setValue('');
  saveTabsToLocal();
}

function openContextMenu(x, y, tabId) {
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove('hidden');
  contextMenu.dataset.tabId = tabId;
}

function closeContextMenu() {
  contextMenu.classList.add('hidden');
  contextMenu.dataset.tabId = '';
}

renameOption.addEventListener('click', () => {
  closeContextMenu();
  const tabId = contextMenu.dataset.tabId;
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  // Prompt rename
  const newName = prompt('Rename Tab', tab.name);
  if (newName && newName.trim()) {
    tab.name = newName.trim();
    renderTabs();
    saveTabsToLocal();
  }
});

saveOption.addEventListener('click', () => {
  closeContextMenu();
  const tabId = contextMenu.dataset.tabId;
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  // Save tab content as a file locally using file system API or fallback to download
  saveTabToFile(tab);
});

document.addEventListener('click', e => {
  if (!contextMenu.contains(e.target)) {
    closeContextMenu();
  }
});

addTabBtn.addEventListener('click', () => {
  addNewTab();
});

// Save tab content as file (simulate folder by prefixing with folder name)
function saveTabToFile(tab) {
  const folderName = 'MonacoScripts';
  const fileName = `${tab.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.js`;
  const fullPath = `${folderName}/${fileName}`;

  // Create folder & save file logic: In browser, we simulate by creating a downloadable file with folder in filename.
  const content = tab.content;
  const blob = new Blob([content], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fullPath;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  alert(`Saved "${tab.name}" as "${fullPath}"`);
}

// Initialize Monaco and tabs
require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('editor-container'), {
    value: '',
    language: 'javascript',
    theme: 'customBlue',
    automaticLayout: true,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    minimap: { enabled: false },
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  });

  // Custom blue theme with subtle multiple shades
  monaco.editor.defineTheme('customBlue', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '7AA6FF', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: '6394FF', fontStyle: 'bold' },
      { token: 'identifier', foreground: 'A0BFFF' },
      { token: 'number', foreground: '82B1FF' },
      { token: 'string', foreground: '5C90FF' },
      { token: 'comment', foreground: '3D5AFF', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'C3D1F7' },
      { token: 'type', foreground: '9AB8FF' },
      { token: 'function', foreground: '82AFFF' },
      { token: 'variable', foreground: 'AAC8FF' },
    ],
    colors: {
      'editor.background': '#0b1624',
      'editor.foreground': '#c3d1f7',
      'editorCursor.foreground': '#7AA6FF',
      'editor.lineHighlightBackground': '#11203a',
      'editorLineNumber.foreground': '#4964b0',
      'editor.selectionBackground': '#2b65f7aa',
      'editor.inactiveSelectionBackground': '#2b65f744',
    },
  });

  // Load saved tabs or create default tab
  if (!loadTabsFromLocal()) {
    const defaultTab = createTab(`Script #${tabCounter++}`, '// Start coding here...\n');
    currentTabId = defaultTab.id;
  } else {
    currentTabId = tabs[0].id;
  }

  renderTabs();
  switchTab(currentTabId);

  // Save content on editor changes
  editor.onDidChangeModelContent(() => {
    saveCurrentTabContent();
  });
});
