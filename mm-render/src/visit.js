/**
 * A recursive helper function for performing some setup by walking through all nodes.
 * @param parent
 * @param visitFn
 * @param childrenFn
 */
export default function visit(parent, visitFn, childrenFn) {
    if (!parent) return;

    visitFn(parent);

    let children = childrenFn(parent);
    if (children) {
        let count = children.length;
        for (let i = 0; i < count; i++) {
            this.visit(children[i], visitFn, childrenFn);
        }
    }
}
