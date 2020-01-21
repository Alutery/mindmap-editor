export default class Node {
    constructor(name, parent) {
        this.name = name;
        this.type = 'node';
        this.children = [];
        this.parent = parent;
        this.depth = parent ? parent.depth + 1 : 1;
        this.icons = [];
        this.attributes = [];
        this.isTested = true;
        this.isBug = true;
    }
}
