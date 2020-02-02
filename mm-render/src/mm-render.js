import * as $ from 'jquery';
import Node from './node';
import IconsMap from './iconsMap';
import * as d3 from 'd3';
import Reader from "./reader";
import getTreeData from "./getTreeData";
import update from "./update";
import {expand, collapse, expandAll, collapseAll} from "./expand-collapse";
import {initiateDrag, dragStart, dragEnd, dragged, endDrag} from "./drag";
import updateTempConnector from './updateTempConnector.js';
import tableCreate from './tableCreate.js';
import visit from "./visit";
import centerNode from "./centerNode";
import removeFlags from "./removeFlags";
import updateMaxLabelLength from "./updateMaxLabelLength";

/**
 * Default config.
 * @type {{duration: number, panSpeed: number, panBoundary: number}}
 */
const defaults = {
    // panning variables
    panSpeed: 200,
    panBoundary: 20, // Within 20px from edges will pan when dragging.

    duration: 750,
};


class MindMapRender {

    constructor(config = []) {
        this.setConfig(config);
        this.defaultRoot = new Node('New node', null);
        this.reader = new Reader();
    }

    open(file = null) {
        try {
            if (file) {
                this.treeData = this.reader.getData(file);
            } else {
                this.treeData = this.defaultRoot;
            }
            this.init();
        } catch (e) {
            throw e;
        }
    }

    /**
     * Set configuration.
     */
    setConfig(config) {
        Object.assign(this, defaults, config);
    }

    /**
     * Initialize the tree.
     */
    init() {
        // Calculate total nodes, max label length
        this.totalNodes = 0;
        this.maxLabelLength = 0;
        this.showAttributes = false;

        // variables for drag/drop
        this.selectedNode = null;
        this.draggingNode = null;

        this.i = 0;

        // size of the diagram
        this.viewerWidth = $(document).width();
        this.viewerHeight = $(document).height();

        this.tree = d3.layout.tree()
            .separation(function (d) {
                return 5;
            })
            .size([this.viewerHeight, this.viewerWidth]);

        // Define the root
        this.root = this.treeData;
        this.root.x0 = this.viewerHeight / 2;
        this.root.y0 = 0;

        this.nodes = null;

        // define a d3 diagonal projection for use by the node paths later on.
        this.diagonal = d3.svg.diagonal()
            .projection(function (d) {
                return [d.y, d.x];
            });
        // let self = this;
        // Call visit function to establish maxLabelLength
        this.updateMaxLabelLength();

        // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
        this.zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", () => {
            this.svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });

        // define the baseSvg, attaching a class for styling and the zoomListener
        $("#tree-container").empty();
        this.baseSvg = d3.select("#tree-container").append("svg")
            .attr("width", this.viewerWidth)
            .attr("height", this.viewerHeight)
            .attr("class", "overlay")
            .call(this.zoomListener);


        this.dragListener = d3.behavior.drag()
            .on("dragstart", this.dragStart(this))
            .on("drag", this.dragged(this))
            .on("dragend", this.dragEnd(this));


        // Append a group which holds all nodes and which the zoom Listener can act upon.
        this.svgGroup = this.baseSvg.append("g");

        // Define a context (popup) menu
        this.menu =
            [
                {
                    title: "Rename",
                    action: (elm, d, i) => {
                        let result = prompt('Change the name of the node', d.name);
                        if (result) {
                            d.name = result;
                            this.update(this.root);
                            this.centerNode(d);
                        }
                    }
                },
                {
                    title: 'Add a node',
                    action: (elm, d, i) => {
                        let newNodeName = prompt('Name of the new node', 'New Node');
                        if (!newNodeName) {
                            return;
                        }
                        let newNode = new Node(newNodeName, d);
                        let currentNode = this.tree.nodes(d);

                        if (currentNode[0]._children != null) {
                            currentNode[0]._children.push(newNode);
                            d.children = d._children;
                            d._children = null;
                        } else if (currentNode[0].children != null && currentNode[0]._children == null) {
                            currentNode[0].children.push(newNode);
                        } else {
                            currentNode[0].children = [];
                            currentNode[0].children.push(newNode);
                            currentNode[0].children.x = d.x0;
                            currentNode[0].children.y = d.y0;
                        }

                        this.update(this.root);
                        this.expand(currentNode);
                        this.updateMaxLabelLength();
                    }
                },
                {
                    title: 'Delete a node',
                    action: (elm, d, i) => {
                        let delName = d.name;
                        if (d.parent && d.parent.children) {
                            let nodeToDelete = _.where(d.parent.children, {
                                name: delName
                            });
                            if (nodeToDelete) {
                                if (nodeToDelete[0].children != null || nodeToDelete[0]._children != null) {
                                    if (confirm('Deleting this node will delete all its children too! Proceed?')) {
                                        d.parent.children = _.without(d.parent.children, nodeToDelete[0]);
                                        this.update(this.root);
                                    }
                                } else {
                                    d.parent.children = _.without(d.parent.children, nodeToDelete[0]);
                                }
                            }

                            this.updateMaxLabelLength();
                            this.update(this.root);
                        } else {
                            alert('Cannot delete the root!');
                        }
                    }
                },
                {
                    title: 'Edit attributes',
                    action: (el, d, i) => {
                        document.querySelector('.bg-modal').style.display = 'flex';
                        this.tableCreate(d.attributes);
                    }
                },
                {
                    title: '✔️ Passed️',
                    action: (el, d, i) => {
                        d.isTested = !d.isTested;
                        this.update(d);
                    }
                },
                {
                    title: '❌ Bug',
                    action: (el, d, i) => {
                        d.isBug = !d.isBug;
                        this.update(d);
                    }
                },
            ];

        d3.contextMenu = (menu, openCallback) => {

            // create the div element that will hold the context menu
            d3.selectAll('.d3-context-menu').data([1])
                .enter()
                .append('div')
                .attr('class', 'd3-context-menu');

            // close menu
            d3.select('body').on('click.d3-context-menu', function () {
                d3.select('.d3-context-menu').style('display', 'none');
            });

            // this gets executed when a contextmenu event occurs
            return (data, index) => {
                let elm = this;

                d3.selectAll('.d3-context-menu').html('');
                let list = d3.selectAll('.d3-context-menu').append('ul');
                list.selectAll('li').data(menu).enter()
                    .append('li')
                    .html(function (d) {
                        return d.title;
                    })
                    .on('click', (d, i) => {
                        d.action(elm, data, index);
                        d3.select('.d3-context-menu').style('display', 'none');
                    });

                // the openCallback allows an action to fire before the menu is displayed
                // an example usage would be closing a tooltip
                if (openCallback) openCallback(data, index);

                // display context menu
                d3.select('.d3-context-menu')
                    .style('left', (d3.event.pageX - 2) + 'px')
                    .style('top', (d3.event.pageY - 2) + 'px')
                    .style('display', 'block');

                d3.event.preventDefault();
            };
        };

        // Layout the tree initially and center on the root node.
        this.update(this.root);
        this.centerNode(this.root);
    }

    focusRoot() {
        this.centerNode(this.root);
    }

    getStatus(d) {
        let result = '';

        if (d.isTested)
            result = result + IconsMap.tested;
        if (d.isBug)
            result = result + IconsMap.bug;

        return result ? result + ' ' : '';
    }

    toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    overCircle(d) {
        this.selectedNode = d;
        this.updateTempConnector(this);
    };

    outCircle(d) {
        this.selectedNode = null;
        this.updateTempConnector(this);
    };

    toggleAttributes() {
        this.showAttributes = !this.showAttributes;
        this.update(this.root);
    }

    zoom() {
        this.svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }
}

Object.assign(MindMapRender.prototype, {
    getTreeData,
    update,
    expand, collapse, expandAll, collapseAll,
    initiateDrag, dragStart, dragEnd, dragged, endDrag,
    updateTempConnector,
    tableCreate,
    visit,
    centerNode,
    removeFlags,
    updateMaxLabelLength
});

export default MindMapRender;
