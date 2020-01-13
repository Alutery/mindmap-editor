import ParseAttributes from "./parseAttributes";

export {readTextFile, arrayMapping, arrayToJSON, XMLToArray}; // список экспортируемых переменных

/**
 * Reads and returns content of the input file.
 * @constructor
 * @param {string} file - Path to XML/JSON file.
 * @return {string}
 */
function readTextFile(file)
{
    let allText = '';
    let rawFile = new XMLHttpRequest();
    rawFile.open('GET', file, false);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status === 0) {
                allText = rawFile.responseText;
            }
        }
    };
    rawFile.send(null);
    return allText;
}

/**
 * Parses and processes all the information inside the array with input contents.
 * @param {array} tagArray - Array of nodes' tags.
 * @param {array} impNodes - List of nodes that should be shown on the second level.
 * @param {boolean} isAttributes - Whether to show or not all additional attributes.
 */
function arrayMapping(tagArray, impNodes, isAttributes)
{
    let mapArray = attrTrans(tagArray, isAttributes);
    let noMoreChildren;
    let newRootChildren;
    if (impNodes.length) {
        let extra = {};
        extra.children = [];
        extra.depth = 1;
        extra.id = tagArray.length + 1;
        extra.parent = 1;
        extra.type = 'Extra';
        tagArray.push(extra);
        noMoreChildren = [];
        let ifChild = false;
        for (let i = 0; i < tagArray.length - 1; i++) {  // length - 1 because we want to exclude newly added tag 'Extra'
            if (tagArray[i].depth === 1) {
                ifChild = false;
                for (let j = 0; j < impNodes.length; j++) {
                    if (tagArray[i].type === impNodes[j]) {
                        ifChild = true;
                        break;
                    }
                }
                if (!ifChild) {
                    tagArray[i].parent = extra.id;
                    tagArray[tagArray.length - 1].children.push(tagArray[i].id);
                    noMoreChildren.push(tagArray[i].id);
                }
            }
        }
        newRootChildren = [];
        for (let i = 0; i < tagArray[0].children.length; i++) {
            let ifEqual = false;
            for (let j = 0; j < noMoreChildren.length; j++) {
                if (tagArray[0].children[i] === noMoreChildren[j]) {
                    ifEqual = true;
                    break;
                }
            }
            if (!ifEqual) {
                newRootChildren.push(tagArray[0].children[i]);
            }
        }
        tagArray[0].children = newRootChildren;
        tagArray[0].children.push(extra.id);
    }
    return mapArray;
}

/**
 * Converts an object to JSON.
 * @param {array} tagArray - Array of nodes' tags.
 * @param {array} id - id of the node.
 * @param {array} parent - id of node's parent.
 */
function objToJSON(tagArray, id, parent)
{

    let node = {};  // we create an empty object and save there all the relevant information about the node
    node.value = tagArray[id].attr;
    node.name = tagArray[id].attr['TEXT'];
    node.extra = tagArray[id].extra;
    node.type = tagArray[id].type;
    node.attr = tagArray[id].attr;
    if (parent === false) {
        node.parent = 'null'
    } else {
        node.parent = parent.name;
    }
    node.children = [];
    for (let i = 0; i < tagArray[id].children.length; i++) {  // for all children of the node we do the same
        if (tagArray[tagArray[id].children[i] - 1].type === 'node' || node.parent === "null") {
            node.children.push(objToJSON(tagArray, tagArray[id].children[i] - 1, node));
        } else {
            // парсинг атрибутов
        }
    }
    return node;
}


/**
 * Creates a final structure of an object to draw.
 * @param {array} tagArray - Array of nodes' tags.
 * @param {boolean} isAttributes - Whether to show or not all additional attributes.
 */
function attrTrans(tagArray, isAttributes)
{  // dealing with attributes of the objects
    for (let i = 0; i < tagArray.length; i++) {
        let tagString = tagArray[i].tag;
        let firstWord = tagString.substr(0, tagString.indexOf(" "));
        tagString = tagString.substr(tagString.indexOf(" ") + 1);

        let nodeAttributes = ParseAttributes(tagString);
        tagArray[i].type = firstWord;
        tagArray[i].attr = nodeAttributes;
        // for (var j = 0; j < nodeAttributes.length; j++) {
        // 	if (j === 0) {
        // 		tagArray[i].type = nodeAttributes[j];
        // 	} else if (isAttributes) {
        // 		tagArray[i].attr.push(nodeAttributes[j]);
        // 	}
        // }
    }
    return tagArray;
}

/**
 * Converts an array to JSON.
 * @param {array} tagArray - Array of nodes' tags.
 */
function arrayToJSON(tagArray)
{  // converting array to json type
    let JSONText = [];
    let root = {};
    root = objToJSON(tagArray, 0, false);
    JSONText.push(root);
    return JSONText;
}


/**
 * Creates an array out of XML.
 * @param {string} text - XML text with input contents.
 */
function XMLToArray(text)
{
    let head = '';
    let currentString = '';
    let documentType = '';
    let ifCurrentStringIsHead = false;
    let ifCurrentStringIsComment = false;
    let ifCurrentStringIsTag = false;
    let ifCurrentStringIsDocumentType = false;
    let newTag = {};
    let tagArray = [];
    let tagStack = [];
    let id = 0;
    for (let i = 0; i < text.length; i++) {  // for all symbols in the text
        if (text[i] === '<' && !ifCurrentStringIsComment) {  // if we found an open tag and we are not writing a comment at the moment
            if (text[i + 1] === '?') {  // if that's a headline
                ifCurrentStringIsHead = true;
            } else if (text[i + 1] === '!' && text[i + 2] === '-' && text[i + 3] === '-') {  // if that's an end of a comment
                ifCurrentStringIsComment = true;
            } else if (text[i + 1] === '!') {
                ifCurrentStringIsDocumentType = true;
            } else {
                if (tagStack.length) { // if tagStack is not empty
                    while (currentString[currentString.length - 1] === ' ') {
                        currentString = currentString.substring(0, currentString.length - 1);
                    }
                    tagArray[tagStack[tagStack.length - 1].id - 1].value = currentString;  // add the information that's outside tags
                    currentString = '';
                }
                ifCurrentStringIsTag = true;  // start the next tag
            }
        } else if (text[i] === '>') {  // if we found a close tag
            if (ifCurrentStringIsHead) {  // if we are writing a headline
                if (text[i - 1] === '?') {
                    ifCurrentStringIsHead = false;
                } else {
                    //
                }
            } else if (ifCurrentStringIsComment) {  // if we are writing a comment
                if (text[i - 1] === '-' && text[i - 2] === '-') {  // and that's the end of the comment
                    ifCurrentStringIsComment = false;
                }
            } else if (ifCurrentStringIsDocumentType) {  // if we are writing the document type
                ifCurrentStringIsDocumentType = false;
            } else if (ifCurrentStringIsTag) {  // if we are writing the information that's inside tags
                if (text[i - 1] === '/') {  // if the tag is closed inside itself
                    newTag.tag = currentString.substring(0, currentString.length - 1);  // isolating the information inside the tag
                    currentString = '';
                    id += 1;
                    newTag.id = id;
                    newTag.children = [];
                    newTag.depth = tagStack.length;  // adding the depth level of the tag
                    if (tagStack.length) {  // if there is smth in the stack
                        newTag.parent = tagStack[tagStack.length - 1].id;  // we save the last element of stack as current tag's parent
                        tagArray[tagStack[tagStack.length - 1].id - 1].children.push(newTag.id);  // we add a current tag as a child to the last element
                    } else {
                        newTag.parent = 0;
                    }
                    tagArray.push(newTag);
                } else {
                    if (currentString[0] === '/') {  // if it is a closing tag
                        currentString = '';
                        tagStack.pop();  // delete this tag from the stack
                    } else {
                        newTag.tag = currentString;
                        currentString = '';
                        id += 1;
                        newTag.id = id;
                        newTag.children = [];
                        newTag.depth = tagStack.length;  // adding the depth level of the tag
                        if (tagStack.length) {  // if there is smth in the stack
                            newTag.parent = tagStack[tagStack.length - 1].id;  // we save the last element of stack as current tag's parent
                            tagArray[tagStack[tagStack.length - 1].id - 1].children.push(newTag.id);  // we add a current tag as a child to the last element
                        } else {
                            newTag.parent = 0;
                        }
                        tagArray.push(newTag);
                        tagStack.push(newTag);
                    }
                }
                ifCurrentStringIsTag = false;
                newTag = {};
            }
        } else if (ifCurrentStringIsHead) {
            if (text[i] !== '?' && !(text[i] === '?' && text[i + 1] === '>') && !(text[i] === '?' && text[i - 1] === '<')) {
                head += text[i];
            } else {
                //
            }
        } else if (ifCurrentStringIsComment) {
            //
        } else if (ifCurrentStringIsTag) {
            currentString += text[i];
        } else if (ifCurrentStringIsDocumentType) {
            documentType += text[i];
        } else {  // avoid all the irrelevant symbols inside and outside the tags
            if (text[i] !== '\n' && text[i] !== '\r' && text[i] !== '\t' && !(text[i] === ' ' && !currentString.length)) {
                currentString += text[i];
            } else {
                //
            }
        }
    }
    if (tagStack.length) {  // if after the end of the process, the stack is not empty - means number of opening tags is bigger than closing
        console.error('XML file is not correct!');
    }
    return tagArray;
}
