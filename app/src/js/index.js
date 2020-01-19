import '../css/style.css';
import '../css/menu-style.css';
import '../css/context-menu-style.css';
import '../../favicon.ico';
import * as $ from 'jquery';

import MindMapRender from 'mm-render/src/mm-render';

const mmRender = new MindMapRender();

const btnNew = document.getElementById('new');
const btnOpen = document.getElementById('open');
const btnSave = document.getElementById('save');
const btnExpandAll = document.getElementById('expandAll');
const btnCollapseAll = document.getElementById('collapseAll');
const btnFocusRoot = document.getElementById('focusRoot');

let isOpen = false;

btnNew.addEventListener('click', () => {
    mmRender.open();
    toggleOpen();
});

btnSave.addEventListener('click', () => {
    if (isOpen) {
        mmRender.saveJson();
    } else {
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
    try {
        mmRender.open(selectedFile);
        toggleOpen();
    } catch (e) {
        alert(e.message);
    }
});

$(".drop").mouseover(function () {
    $(".dropdown").show(300);
});

$(".drop").mouseleave(function () {
    $(".dropdown").hide(300);
});

function toggleOpen() {
    isOpen = true;

    document.querySelectorAll('.toggle').forEach((elem) => {
        elem.style.display = 'block';
    });
}
