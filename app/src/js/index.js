import '../css/style.css';
import '../css/menu-style.css';
import '../css/context-menu-style.css';
import '../../favicon.ico';
import * as $ from 'jquery';
import { saveAs } from "file-saver";

import MindMapRender from 'mm-render/src/mm-render';

const mmRender = new MindMapRender();

const btnNew = document.getElementById('new');
const btnOpen = document.getElementById('open');
const btnSaveJSON = document.getElementById('saveAsJSON');
const btnSaveXML = document.getElementById('saveAsXML');
const btnExpandAll = document.getElementById('expandAll');
const btnCollapseAll = document.getElementById('collapseAll');
const btnFocusRoot = document.getElementById('focusRoot');
const fileInput = document.getElementById('fileInput');
const btnRemoveTested = document.getElementById('removeTested');
const btnRemoveBug = document.getElementById('removeBug');
const btnShowAttributes = document.getElementById('showAttributes');

let isOpen = false;

function submitClosing() {
    if (isOpen) {
        if (!confirm('You will close the current file! Proceed?')) {
            return false;
        }
    }
    return true;
}

btnNew.addEventListener('click', () => {
    if (submitClosing()) {
        mmRender.open();
        toggleOpen();
    }
});

btnSaveJSON.addEventListener('click', () => {
    if (isOpen) {
        saveAsJson();
    } else {
        alert('No thing to save!');
    }
});

btnSaveXML.addEventListener('click', () => {
    if (isOpen) {
        // not implemented
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

fileInput.onclick = function (e) {
    if (!submitClosing()) {
        e.preventDefault();
    }
};

btnOpen.addEventListener('change', () => {
    let selectedFile = fileInput.files[0];
    try {
        mmRender.open(selectedFile);
        toggleOpen();
    } catch (e) {
        alert(e.message);
    }
});

$(".drop").mouseover(function () {
    $(this).children('.dropdown').show();

});

$(".drop").mouseleave(function () {
    $(this).children('.dropdown').hide();
});

function toggleOpen() {
    isOpen = true;

    document.querySelectorAll('.toggle').forEach((elem) => {
        elem.style.display = 'block';
    });
}

function saveAsJson() {
    let blob = new Blob([mmRender.getTreeData()], {type: "application/json"});
    saveAs(blob, `${mmRender.fileName}.json`);
}

btnRemoveTested.addEventListener('click', () => {
    mmRender.removeFlags('isTested');
});

btnRemoveBug.addEventListener('click', () => {
    mmRender.removeFlags('isBug');
});

btnShowAttributes.addEventListener('click', () => {
    mmRender.toggleAttributes();
});
