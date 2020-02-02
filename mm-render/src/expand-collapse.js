export function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach((d) => this.collapse(d));
        d.children = null;
    }
}

export function expand(d) {
    if (d._children) {
        d.children = d._children;
        d.children.forEach((d) => this.expand(d));
        d._children = null;
    }
}

export function expandAll() {
    this.expand(this.root);
    this.update(this.root);
    this.centerNode(this.root);
}

export function collapseAll() {
    if (!this.root.children) {
        return;
    }

    let root = this.root;
    root.children.forEach(() => this.collapse);
    this.collapse(root);
    this.update(root);
    this.centerNode(root);
}
