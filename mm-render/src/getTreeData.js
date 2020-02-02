export default function getTreeData() {
    const getCircularReplacer = (deletePorperties) => {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (deletePorperties) {
                    //delete all properties you don't want in your json (not very convenient but a good temporary solution)
                    delete value.id;
                    delete value.x0;
                    delete value.y0;
                    delete value.y;
                    delete value.x;
                    delete value.depth;
                }
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }
            return value;
        };
    };

    let root = JSON.stringify(this.root, getCircularReplacer(false)); //Stringify a first time to clone the root object (it's allow you to delete properties you don't want to save)
    let rootCopy = JSON.parse(root);
    rootCopy = JSON.stringify(rootCopy, getCircularReplacer(true), 2); //Stringify a second time to delete the propeties you don't need

    return rootCopy;
}
