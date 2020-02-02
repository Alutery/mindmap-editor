export default function updateMaxLabelLength() {
    this.maxLabelLength = 0;
    this.visit(this.treeData, (d) => {
        this.totalNodes++;
        this.maxLabelLength = Math.max(d.name.length, this.maxLabelLength);
    }, (d) => {
        return d.children && d.children.length > 0 ? d.children : null;
    });
}
