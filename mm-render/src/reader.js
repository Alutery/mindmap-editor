import * as path from "path";
import * as Xml2Tree from "./xml2Tree";

export default class Reader {

    constructor(isAttributes = true) {
        this.fileName = 'New map';
        this.secondLevelNodes = [];
        this.isAttributes = isAttributes;
    }

    /**
     * Get data from file (.mm or .json).
     * @returns {*}
     * @param file
     */
    getData(file) {
        let filePath = URL.createObjectURL(file);
        let extension = path.extname(file.name);
        this.fileName = path.basename(file.name, extension);

        switch (extension) {
            case ".mm":
                return this.readMM(filePath);
            case ".json":
                return this.readJson(filePath);
            default:
                throw new Error('Wrong format: please, choose .mm or .json');
        }
    }

    readMM(flePath) {
        let XMLText = Xml2Tree.readTextFile(flePath);
        let tagArray = Xml2Tree.XMLToArray(XMLText);  // returns an array of all nodes with related info
        let mapArray = Xml2Tree.arrayMapping(tagArray, this.secondLevelNodes, this.isAttributes);
        let treeData = Xml2Tree.arrayToJSON(mapArray);  // converts array into a JSON file

        return treeData[0]['children'][0];
    }

    readJson(flePath) {
        let JSONText = Xml2Tree.readTextFile(flePath);
        return JSON.parse(JSONText);
    }
}
