export default function removeFlags(flag) {
    if (!this.treeData.hasOwnProperty(flag) || typeof this.treeData[flag] !== "boolean") {
        throw new Error('Flag not exist.');
    }
    this.visit(this.treeData, (d) => {
        d[flag] = false;
    }, (d) => {
        return d.children && d.children.length > 0 ? d.children : null;
    });
    this.update(this.root);
}
