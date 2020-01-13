import '../css/style.css';
import '../css/menu-style.css';
import '../css/context-menu-style.css';
import '../../favicon.ico';

import MindMapRender from 'mm-render/src/mm-render';

const mmRender = new MindMapRender();

const btnOpen = document.getElementById('open');
const btnSave = document.getElementById('save');
const btnExpandAll = document.getElementById('expandAll');
const btnCollapseAll = document.getElementById('collapseAll');
const btnFocusRoot = document.getElementById('focusRoot');

let isOpen = false;

btnSave.addEventListener('click', () => {
    if(isOpen) {
        mmRender.saveJson();
    }
    else {
        alert('No thing to save!');
    }
});

btnExpandAll.addEventListener('click', () => {
    mmRender.expandAll();
});

btnCollapseAll.addEventListener('click', () => {
    mmRender.collapseAll();
});

btnFocusRoot.addEventListener('click', () => {
    mmRender.focusRoot();
});

btnOpen.addEventListener('change', () => {
    let selectedFile = document.getElementById('fileInput').files[0];
    mmRender.open(selectedFile);
    isOpen = true;

    document.querySelectorAll('.toggle').forEach((elem) => {
        elem.style.display = 'block';
    });
});
